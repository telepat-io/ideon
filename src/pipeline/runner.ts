import { mkdir, readFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { ResolvedRunInput } from '../config/resolver.js';
import { resolveDefaultMaxLinks, resolveTargetLengthAlias } from '../config/schema.js';
import { enrichLinks } from '../generation/enrichLinks.js';
import { planContentPlan } from '../generation/planContentPlan.js';
import { planPrimaryContent } from '../generation/planPrimaryContent.js';
import { writeSingleShotContent } from '../generation/writeSingleShotContent.js';
import { writeArticleSections } from '../generation/writeSections.js';
import { Limn } from '@telepat/limn';
import { buildImageSlots, expandImagePrompts, MIN_IMAGE_BYTES, renderExpandedImages } from '../images/renderImages.js';
import { OpenRouterClient } from '../llm/openRouterClient.js';
import { renderMarkdownDocument } from '../output/markdown.js';
import { buildMetaJson } from '../output/meta.js';
import {
  buildGenerationDirectoryName,
  ensureOutputDirectories,
  resolveLinksPath,
  resolveOutputPaths,
  writeJsonFile,
  writeLinksFile,
  writeUtf8File,
} from '../output/filesystem.js';
import { estimateLlmCostUsd, sumKnownCosts, type LlmCallMetrics } from './analytics.js';
import type {
  CostSource,
  ImagePromptAnalytics,
  ImageRenderAnalytics,
  LlmInteractionRecord,
  LinkEnrichmentItemAnalytics,
  OutputItemAnalytics,
  PipelineRunAnalytics,
  PipelineRunInteractions,
  PipelineRunResult,
  PipelineStageAnalytics,
  StageItemViewModel,
  StageViewModel,
  T2IInteractionRecord,
} from './events.js';
import {
  loadWriteSession,
  patchWriteSession,
  startFreshWriteSession,
  type WriteSessionState,
  type WriteStageId,
} from './sessionStore.js';
import type { ArticleImagePrompt, ArticlePlan, LinkEntry, PrimaryPlan } from '../types/article.js';
import { isLongFormPlan } from '../types/article.js';

export interface PipelineRunOptions {
  onUpdate?: (stages: StageViewModel[]) => void;
  dryRun?: boolean;
  runMode?: 'fresh' | 'resume';
  workingDir?: string;
  enrichLinks?: boolean;
  customLinks?: string[];
  unlinks?: string[];
  maxLinks?: number;
  maxImages?: number;
}

export function createInitialStages(): StageViewModel[] {
  return [
    {
      id: 'shared-plan',
      title: 'Planning Shared Plan',
      status: 'running',
      detail: 'Generating explicit cross-channel content guidance.',
    },
    {
      id: 'planning',
      title: 'Planning Primary Content',
      status: 'pending',
      detail: 'Generating title, slug, and content plan for the primary output.',
    },
    {
      id: 'sections',
      title: 'Writing Primary Content',
      status: 'pending',
      detail: 'Waiting for the approved primary plan.',
    },
    {
      id: 'image-prompts',
      title: 'Expanding Image Prompts',
      status: 'pending',
      detail: 'Waiting for the plan image descriptions.',
    },
    {
      id: 'images',
      title: 'Rendering Images',
      status: 'pending',
      detail: 'Waiting for prompt expansion and model payloads.',
    },
    {
      id: 'output',
      title: 'Generating Channel Content',
      status: 'pending',
      detail: 'Waiting for primary content and assets.',
    },
    {
      id: 'links',
      title: 'Enriching Links',
      status: 'pending',
      detail: 'Waiting for output assembly.',
    },
  ];
}

export async function runPipelineShell(input: ResolvedRunInput, options: PipelineRunOptions = {}): Promise<PipelineRunResult> {
  const runStartedAtMs = Date.now();
  const runStartedAt = new Date(runStartedAtMs).toISOString();
  const runId = randomUUID();
  const primaryTarget = getPrimaryTarget(input.config.settings.contentTargets);
  const secondaryTargets = getSecondaryTargets(input.config.settings.contentTargets);
  const stages: StageViewModel[] = createInitialStages();
  options.onUpdate?.(cloneStages(stages));
  const dryRun = options.dryRun ?? false;
  const shouldEnrichLinks = options.enrichLinks ?? false;
  const runMode = options.runMode ?? 'fresh';
  const workingDir = options.workingDir ?? process.cwd();
  const pipelineCustomLinkRaws = options.customLinks ?? [];
  const pipelineUnlinks = options.unlinks ?? [];
  const pipelineMaxLinks = options.maxLinks;
  const outputPaths = resolveOutputPaths();
  const stageTracking = new Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>();
  const stageRetryState = new Map<WriteStageId, { retries: number; lastError: string | null }>();
  const llmOperationRetryState = new Map<string, number>();
  stageTracking.set('shared-plan', {
    startedAtMs: runStartedAtMs,
    endedAtMs: null,
    retries: 0,
    costs: [],
    costSources: [],
  });
  const imagePromptCalls: ImagePromptAnalytics[] = [];
  const imageRenderCalls: ImageRenderAnalytics[] = [];
  const outputItemCalls: OutputItemAnalytics[] = [];
  const linkEnrichmentCalls: LinkEnrichmentItemAnalytics[] = [];
  const llmInteractions: LlmInteractionRecord[] = [];
  const t2iInteractions: T2IInteractionRecord[] = [];
  let writeSession: WriteSessionState;

  const applyRetryUpdate = (stageId: WriteStageId, retryIncrement: number, errorMessage: string | null): void => {
    if (retryIncrement <= 0) {
      return;
    }

    const stageIndex = stages.findIndex((stage) => stage.id === stageId);
    if (stageIndex < 0) {
      return;
    }

    const existing = stageRetryState.get(stageId) ?? { retries: 0, lastError: null };
    const next = {
      retries: existing.retries + retryIncrement,
      lastError: errorMessage && errorMessage.trim().length > 0 ? errorMessage : existing.lastError,
    };
    stageRetryState.set(stageId, next);

    stages[stageIndex] = {
      ...stages[stageIndex],
      retryCount: next.retries,
      lastRetryError: next.lastError ?? undefined,
    };
    options.onUpdate?.(cloneStages(stages));
  };

  const onLlmInteraction = (interaction: LlmInteractionRecord): void => {
    llmInteractions.push(interaction);

    const stageId = asWriteStageId(interaction.stageId);
    if (!stageId) {
      return;
    }

    const previousRetries = llmOperationRetryState.get(interaction.operationId) ?? 0;
    if (interaction.retries <= previousRetries) {
      return;
    }

    const retryIncrement = interaction.retries - previousRetries;
    llmOperationRetryState.set(interaction.operationId, interaction.retries);
    applyRetryUpdate(stageId, retryIncrement, interaction.errorMessage);
  };

  if (runMode === 'fresh') {
    writeSession = await startFreshWriteSession(
      {
        idea: input.idea,
        targetAudienceHint: input.targetAudienceHint,
        job: input.job,
        settings: input.config.settings,
        dryRun,
        outputPaths,
      },
      workingDir,
    );
  } else {
    const existing = await loadWriteSession(workingDir);
    if (!existing) {
      throw new Error('No resumable write session found. Start a fresh write first.');
    }

    if (existing.status === 'completed') {
      // Allow resume from completed sessions so corrupted or missing assets
      // can be regenerated. Stage caching in the pipeline is idempotent.
    }

    writeSession = existing;
  }

  try {
    await ensureOutputDirectories(writeSession.outputPaths);
    const openRouter = dryRun ? null : new OpenRouterClient(requireSecret(input.config.secrets.openRouterApiKey, 'OpenRouter API key'));
    const canRenderImagesLive = Boolean(input.config.secrets.replicateApiToken);
    const imageDryRun = dryRun || !canRenderImagesLive;
    const limn = imageDryRun ? null : new Limn({
      openrouterApiKey: input.config.secrets.openRouterApiKey ?? undefined,
      replicateApiKey: requireSecret(input.config.secrets.replicateApiToken, 'Replicate API token'),
      openrouterModel: input.config.settings.model,
    });
    let contentPlan = writeSession.contentPlan;
    let plan = writeSession.plan;
    let text = writeSession.text;
    let imagePrompts = writeSession.imagePrompts ?? writeSession.imageArtifacts?.imagePrompts ?? null;
    let imageArtifacts = writeSession.imageArtifacts;
    let linksResult = writeSession.links;
    let primaryMarkdownTemplate: string | null = null;

    if (contentPlan) {
      markStageCompleted(stageTracking, 'shared-plan');
      stages[0] = {
        ...stages[0],
        status: 'succeeded',
        detail: 'Reused saved shared plan from cached session.',
        summary: contentPlan.title,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'shared-plan'),
      };
    } else {
      contentPlan = await planContentPlan({
        idea: input.idea,
        targetAudienceHint: input.targetAudienceHint,
        settings: input.config.settings,
        openRouter,
        dryRun,
        onInteraction(interaction) {
          onLlmInteraction(interaction);
        },
        onLlmMetrics(metrics) {
          recordLlmMetrics(stageTracking, 'shared-plan', metrics);
        },
      });

      markStageCompleted(stageTracking, 'shared-plan');
      stages[0] = {
        ...stages[0],
        status: 'succeeded',
        detail: 'Shared plan generated successfully.',
        summary: contentPlan.title,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'shared-plan'),
      };
      writeSession = await patchWriteSession(
        {
          status: 'running',
          lastCompletedStage: 'shared-plan',
          failedStage: null,
          errorMessage: null,
          contentPlan,
        },
        workingDir,
      );
    }

    stages[1] = {
      ...stages[1],
      status: 'running',
      detail: `Planning primary ${primaryTarget.contentType} content.`,
    };
    markStageStarted(stageTracking, 'planning');
    options.onUpdate?.(cloneStages(stages));

    if (plan) {
      markStageCompleted(stageTracking, 'planning');
      stages[1] = {
        ...stages[1],
        status: 'succeeded',
        detail: 'Reused saved plan from cached session.',
        summary: buildPlanSummary(plan),
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'planning'),
      };
    } else {
      if (!contentPlan) {
        throw new Error('Shared content plan is missing for primary planning stage.');
      }

      plan = await planPrimaryContent({
        idea: input.idea,
        contentType: primaryTarget.contentType,
        contentPlan,
        settings: input.config.settings,
        markdownOutputDir: writeSession.outputPaths.markdownOutputDir,
        openRouter,
        dryRun,
        onInteraction(interaction) {
          onLlmInteraction(interaction);
        },
        onLlmMetrics(metrics) {
          recordLlmMetrics(stageTracking, 'planning', metrics);
        },
      });

      markStageCompleted(stageTracking, 'planning');
      stages[1] = {
        ...stages[1],
        status: 'succeeded',
        detail: 'Plan generated successfully.',
        summary: buildPlanSummary(plan),
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'planning'),
      };
      writeSession = await patchWriteSession(
        {
          status: 'running',
          lastCompletedStage: 'planning',
          failedStage: null,
          errorMessage: null,
          contentPlan,
          plan,
        },
        workingDir,
      );
    }

    const isLongForm = isLongFormPlan(plan);

    if (isLongForm) {
      const longPlan = plan as ArticlePlan;
      stages[2] = {
        ...stages[2],
        status: 'running',
        detail: 'Writing introduction.',
        items: buildSectionItems(longPlan.sections.map((section) => section.title)),
      };
      markStageStarted(stageTracking, 'sections');
      options.onUpdate?.(cloneStages(stages));

      if (text) {
        markStageCompleted(stageTracking, 'sections');
        stages[2] = {
          ...stages[2],
          status: 'succeeded',
          detail: 'Reused saved section drafts from cached session.',
          summary: `Intro + ${text.sections.length} sections + conclusion`,
          items: (stages[2].items ?? []).map((item) => ({
            ...item,
            status: 'succeeded',
            detail: 'Reused saved section draft from cached session.',
          })),
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'sections'),
        };
        stages[3] = {
          ...stages[3],
          status: 'running',
          detail: 'Expanding editorial image prompts.',
        };
        markStageStarted(stageTracking, 'image-prompts');
        options.onUpdate?.(cloneStages(stages));
      } else {
        const sectionItemTracking = new Map<string, {
          startedAtMs: number;
          endedAtMs: number | null;
          retries: number;
          costs: Array<number | null>;
          costSources: CostSource[];
        }>();

        text = await writeArticleSections({
          plan: longPlan,
          settings: input.config.settings,
          openRouter,
          dryRun,
          onInteraction(interaction) {
            onLlmInteraction(interaction);
          },
          onLlmMetrics(phase, metrics, sectionIndex) {
            recordLlmMetrics(stageTracking, 'sections', metrics);
            const sectionItemId = toSectionItemId(phase, sectionIndex);
            if (!sectionItemId) {
              return;
            }

            markStageStarted(sectionItemTracking, sectionItemId);
            addStageRetries(sectionItemTracking, sectionItemId, metrics.retries);
            const itemCost = estimateLlmCostUsd(metrics.modelId, metrics.usage);
            recordStageCost(sectionItemTracking, sectionItemId, itemCost.usd, itemCost.source);
          },
          onSectionStart(label) {
            const nextSectionItemId = toSectionItemIdFromLabel(label);
            if (nextSectionItemId) {
              stages[2] = {
                ...stages[2],
                items: applySectionItemTransition(stages[2].items ?? [], nextSectionItemId, sectionItemTracking),
              };
            }

            stages[2] = {
              ...stages[2],
              detail: label,
            };
            options.onUpdate?.(cloneStages(stages));
          },
        });

        const runningSectionItem = (stages[2].items ?? []).find((item) => item.status === 'running');
        if (runningSectionItem) {
          markStageCompleted(sectionItemTracking, runningSectionItem.id);
          stages[2] = {
            ...stages[2],
            items: (stages[2].items ?? []).map((item) => {
              if (item.id !== runningSectionItem.id) {
                return item;
              }

              return {
                ...item,
                status: 'succeeded',
                detail: 'Completed',
                analytics: snapshotStageAnalytics(sectionItemTracking, item.id),
              };
            }),
          };
        }

        markStageCompleted(stageTracking, 'sections');
        stages[2] = {
          ...stages[2],
          status: 'succeeded',
          detail: 'Completed intro, sections, and conclusion.',
          summary: `Intro + ${text.sections.length} sections + conclusion`,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'sections'),
        };
        stages[3] = {
          ...stages[3],
          status: 'running',
          detail: 'Expanding editorial image prompts.',
        };
        markStageStarted(stageTracking, 'image-prompts');
        options.onUpdate?.(cloneStages(stages));

        writeSession = await patchWriteSession(
          {
            status: 'running',
            lastCompletedStage: 'sections',
            failedStage: null,
            errorMessage: null,
            text,
          },
          workingDir,
        );
      }

      if (imageArtifacts) {
        let cacheValid = true;
        for (const img of imageArtifacts.renderedImages) {
          try {
            const info = await stat(img.outputPath);
            if (info.size < MIN_IMAGE_BYTES) {
              cacheValid = false;
              break;
            }
          } catch {
            cacheValid = false;
            break;
          }
        }
        if (!cacheValid) {
          imageArtifacts = null;
        }
      }

      if (imagePrompts) {
        markStageCompleted(stageTracking, 'image-prompts');
        stages[3] = {
          ...stages[3],
          status: 'succeeded',
          detail: 'Reused saved image prompts from cached session.',
          summary: `${imagePrompts.length} prompts ready`,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'image-prompts'),
        };
        stages[4] = {
          ...stages[4],
          status: 'running',
          detail: 'Rendering expanded image prompts.',
        };
        markStageStarted(stageTracking, 'images');
        options.onUpdate?.(cloneStages(stages));
      } else {
        imagePrompts = await expandImagePrompts({
          slots: buildImageSlots(longPlan, text.sections, { maxImages: options.maxImages }),
          planContext: longPlan,
          sections: text.sections,
          settings: input.config.settings,
          openRouter,
          dryRun,
          onInteraction(interaction) {
            onLlmInteraction(interaction);
          },
          onPromptComplete(metrics) {
            imagePromptCalls.push({
              imageId: metrics.imageId,
              kind: metrics.kind,
              durationMs: metrics.durationMs,
              attempts: metrics.attempts,
              retries: metrics.retries,
              retryBackoffMs: metrics.retryBackoffMs,
              promptTokens: metrics.promptTokens,
              completionTokens: metrics.completionTokens,
              totalTokens: metrics.totalTokens,
              costUsd: metrics.costUsd,
              costSource: metrics.costSource,
              modelId: metrics.modelId,
            });
            recordStageCost(stageTracking, 'image-prompts', metrics.costUsd, metrics.costSource);
            addStageRetries(stageTracking, 'image-prompts', metrics.retries);
          },
          onProgress(detail) {
            stages[3] = {
              ...stages[3],
              detail,
            };
            options.onUpdate?.(cloneStages(stages));
          },
        });

        markStageCompleted(stageTracking, 'image-prompts');
        stages[3] = {
          ...stages[3],
          status: 'succeeded',
          detail: 'Expanded image prompts successfully.',
          summary: `${imagePrompts.length} prompts ready`,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'image-prompts'),
        };
        stages[4] = {
          ...stages[4],
          status: 'running',
          detail: 'Rendering expanded image prompts.',
        };
        markStageStarted(stageTracking, 'images');
        options.onUpdate?.(cloneStages(stages));

        writeSession = await patchWriteSession(
          {
            status: 'running',
            lastCompletedStage: 'image-prompts',
            failedStage: null,
            errorMessage: null,
            imagePrompts,
          },
          workingDir,
        );
      }
    } else {
      stages[2] = {
        ...stages[2],
        status: 'running',
        detail: `Generating primary ${primaryTarget.contentType} content.`,
      };
      markStageStarted(stageTracking, 'sections');
      options.onUpdate?.(cloneStages(stages));

      primaryMarkdownTemplate = await writeSingleShotContent({
        idea: input.idea,
        contentType: primaryTarget.contentType,
        role: 'primary',
        primaryContentType: primaryTarget.contentType,
        style: input.config.settings.style,
        intent: input.config.settings.intent,
        outputIndex: 1,
        outputCountForType: 1,
        articleReferenceMarkdown: undefined,
        contentPlan,
        plan,
        settings: input.config.settings,
        openRouter,
        dryRun,
        onInteraction(interaction) {
          onLlmInteraction(interaction);
        },
        onLlmMetrics(metrics) {
          recordLlmMetrics(stageTracking, 'sections', metrics);
        },
      });

      markStageCompleted(stageTracking, 'sections');
      stages[2] = {
        ...stages[2],
        status: 'succeeded',
        detail: `Generated primary ${primaryTarget.contentType} content.`,
        summary: `Primary content ready`,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'sections'),
      };

      stages[3] = {
        ...stages[3],
        status: 'running',
        detail: 'Preparing primary cover image prompt.',
      };
      markStageStarted(stageTracking, 'image-prompts');
      options.onUpdate?.(cloneStages(stages));

      imagePrompts = [buildPrimaryCoverPrompt(plan, contentPlan, primaryTarget.contentType)];

      markStageCompleted(stageTracking, 'image-prompts');
      stages[3] = {
        ...stages[3],
        status: 'succeeded',
        detail: 'Prepared primary cover image prompt.',
        summary: '1 prompt ready',
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'image-prompts'),
      };

      stages[4] = {
        ...stages[4],
        status: 'running',
        detail: 'Rendering primary cover image.',
      };
      markStageStarted(stageTracking, 'images');
      stages[4] = {
        ...stages[4],
        status: 'running',
        detail: 'Waiting for cover image rendering.',
      };
      options.onUpdate?.(cloneStages(stages));
    }

    const baseSlug = plan?.slug ?? resolveGenerationSlug(input.idea, contentPlan?.title);
    const generationDir = path.join(
      writeSession.outputPaths.markdownOutputDir,
      buildGenerationDirectoryName(baseSlug),
    );
    await mkdir(generationDir, { recursive: true });
    const jobDefinitionPath = path.join(generationDir, 'job.json');
    await writeJsonFile(
      jobDefinitionPath,
      buildRunJobDefinition({
        idea: input.idea,
        targetAudienceHint: input.targetAudienceHint,
        dryRun,
        runMode,
        settings: input.config.settings,
        sourceJob: input.job,
      }),
    );

    const planPath = plan ? path.join(generationDir, 'plan.md') : null;
    if (plan && planPath) {
      await writeUtf8File(planPath, renderPlanMarkdown(plan));
    }

    const primaryFilePrefix = toFilePrefix(primaryTarget.contentType);
    const primaryMarkdownPath = path.join(generationDir, `${primaryFilePrefix}-1.md`);
    const sharedAssetDir = generationDir;

    if (isLongForm) {
      const longPlan = plan as ArticlePlan;
      if (imageArtifacts) {
        markStageCompleted(stageTracking, 'images');
        stages[4] = {
          ...stages[4],
          status: 'succeeded',
          detail: 'Reused previously rendered images from cached session.',
          summary: sharedAssetDir,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'images'),
        };
      } else {
        if (!imagePrompts) {
          throw new Error('Expanded image prompts are missing for image rendering stage.');
        }

        const renderedImages = await renderExpandedImages({
          prompts: imagePrompts,
          settings: input.config.settings,
          limn,
          markdownPath: primaryMarkdownPath,
          assetDir: sharedAssetDir,
          dryRun: imageDryRun,
          onInteraction(interaction) {
            t2iInteractions.push(interaction);
          },
          onRenderComplete(metrics) {
            imageRenderCalls.push({
              imageId: metrics.imageId,
              kind: metrics.kind,
              durationMs: metrics.durationMs,
              attempts: metrics.attempts,
              retries: metrics.retries,
              retryBackoffMs: metrics.retryBackoffMs,
              outputBytes: metrics.outputBytes,
              costUsd: metrics.costUsd,
              costSource: metrics.costSource,
              modelId: metrics.modelId,
            });
            recordStageCost(stageTracking, 'images', metrics.costUsd, metrics.costSource);
            addStageRetries(stageTracking, 'images', metrics.retries);
          },
          onProgress(detail) {
            stages[4] = {
              ...stages[4],
              status: 'running',
              detail,
            };
            options.onUpdate?.(cloneStages(stages));
          },
        });

        imageArtifacts = {
          imagePrompts,
          renderedImages,
        };

        markStageCompleted(stageTracking, 'images');
        stages[4] = {
          ...stages[4],
          status: 'succeeded',
          detail: 'Rendered and stored article images.',
          summary: sharedAssetDir,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'images'),
        };

        writeSession = await patchWriteSession(
          {
            status: 'running',
            lastCompletedStage: 'images',
            failedStage: null,
            errorMessage: null,
            imageArtifacts,
          },
          workingDir,
        );
      }

      if (!plan || !text || !imageArtifacts) {
        throw new Error('Article generation requested but required article artifacts are missing.');
      }

      const article = {
        plan: longPlan,
        intro: text.intro,
        sections: text.sections,
        outro: text.outro,
        imagePrompts: imageArtifacts.imagePrompts,
        renderedImages: imageArtifacts.renderedImages,
      };
      primaryMarkdownTemplate = renderMarkdownDocument(article);
    } else {
      if (!imagePrompts || imagePrompts.length === 0) {
        throw new Error('Primary cover image prompt is missing for image rendering stage.');
      }

      if (imageArtifacts) {
        markStageCompleted(stageTracking, 'images');
        stages[4] = {
          ...stages[4],
          status: 'succeeded',
          detail: 'Reused previously rendered primary cover image from cached session.',
          summary: sharedAssetDir,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'images'),
        };
      } else {
        const renderedImages = await renderExpandedImages({
          prompts: imagePrompts,
          settings: input.config.settings,
          limn,
          markdownPath: primaryMarkdownPath,
          assetDir: sharedAssetDir,
          dryRun: imageDryRun,
          onInteraction(interaction) {
            t2iInteractions.push(interaction);
          },
          onRenderComplete(metrics) {
            imageRenderCalls.push({
              imageId: metrics.imageId,
              kind: metrics.kind,
              durationMs: metrics.durationMs,
              attempts: metrics.attempts,
              retries: metrics.retries,
              retryBackoffMs: metrics.retryBackoffMs,
              outputBytes: metrics.outputBytes,
              costUsd: metrics.costUsd,
              costSource: metrics.costSource,
              modelId: metrics.modelId,
            });
            recordStageCost(stageTracking, 'images', metrics.costUsd, metrics.costSource);
            addStageRetries(stageTracking, 'images', metrics.retries);
          },
          onProgress(detail) {
            stages[4] = {
              ...stages[4],
              status: 'running',
              detail,
            };
            options.onUpdate?.(cloneStages(stages));
          },
        });

        imageArtifacts = {
          imagePrompts,
          renderedImages,
        };

        markStageCompleted(stageTracking, 'images');
        stages[4] = {
          ...stages[4],
          status: 'succeeded',
          detail: 'Rendered and stored primary cover image.',
          summary: sharedAssetDir,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'images'),
        };

        writeSession = await patchWriteSession(
          {
            status: 'running',
            lastCompletedStage: 'images',
            failedStage: null,
            errorMessage: null,
            imageArtifacts,
          },
          workingDir,
        );
      }

      if (!primaryMarkdownTemplate) {
        throw new Error(`Primary ${primaryTarget.contentType} content is missing before output assembly.`);
      }

      const coverImage = imageArtifacts?.renderedImages.find((image) => image.kind === 'cover') ?? null;
      if (coverImage) {
        primaryMarkdownTemplate = withCoverImage(primaryMarkdownTemplate, coverImage.relativePath, plan.title || deriveTitleFromIdea(input.idea));
      }

      primaryMarkdownTemplate = applyPrimaryTitleHeading(
        primaryMarkdownTemplate,
        plan.title || contentPlan.title || deriveTitleFromIdea(input.idea),
      );
    }
    const markdownPaths: string[] = [];
    const generatedOutputs: Array<{ fileId: string; contentType: string; markdownPath: string }> = [];
    const primaryOutputId = toOutputItemId(primaryFilePrefix, 1);

    if (!primaryMarkdownTemplate) {
      throw new Error('Primary markdown output is missing before channel content generation.');
    }

    await writeUtf8File(primaryMarkdownPath, primaryMarkdownTemplate);
    markdownPaths.push(primaryMarkdownPath);
    generatedOutputs.push({
      fileId: primaryOutputId,
      contentType: primaryTarget.contentType,
      markdownPath: primaryMarkdownPath,
    });

    const requestedOutputs = expandRequestedOutputs(secondaryTargets, { fallbackToArticle: false });

    stages[5] = {
      ...stages[5],
      status: 'running',
      detail: requestedOutputs.length > 0
        ? 'Generating secondary channel outputs from primary anchor content.'
        : 'No secondary content requested.',
      items: requestedOutputs.map((output) => ({
        id: toOutputItemId(output.filePrefix, output.index),
        label: formatOutputItemLabel(output.contentType, output.index, output.outputCountForType),
        status: 'pending',
        detail: 'Waiting to start.',
      })),
    };
    markStageStarted(stageTracking, 'output');
    options.onUpdate?.(cloneStages(stages));

    if (!contentPlan) {
      throw new Error('Shared content plan is missing for output generation stage.');
    }

    for (const output of requestedOutputs) {
      const itemId = toOutputItemId(output.filePrefix, output.index);
      const itemStartedAtMs = Date.now();
      const itemTracking = {
        retries: 0,
        costs: [] as Array<number | null>,
        costSources: [] as CostSource[],
      };

      stages[5] = {
        ...stages[5],
        detail: `Generating ${formatOutputItemLabel(output.contentType, output.index, output.outputCountForType)}.`,
        items: (stages[5].items ?? []).map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          return {
            ...item,
            status: 'running',
            detail: 'Generating content.',
          };
        }),
      };
      options.onUpdate?.(cloneStages(stages));

      const markdownPath = path.join(generationDir, `${output.filePrefix}-${output.index}.md`);
      try {
        const content = await writeSingleShotContent({
          idea: input.idea,
          contentType: output.contentType,
          style: input.config.settings.style,
          intent: input.config.settings.intent,
          outputIndex: output.index,
          outputCountForType: output.outputCountForType,
          articleReferenceMarkdown: primaryMarkdownTemplate ?? undefined,
          contentPlan,
          plan,
          settings: input.config.settings,
          openRouter,
          dryRun,
          role: 'secondary',
          primaryContentType: primaryTarget.contentType,
          onInteraction(interaction) {
            onLlmInteraction(interaction);
          },
          onLlmMetrics(metrics) {
            recordLlmMetrics(stageTracking, 'output', metrics);
            itemTracking.retries += metrics.retries;
            const cost = estimateLlmCostUsd(metrics.modelId, metrics.usage);
            itemTracking.costs.push(cost.usd);
            itemTracking.costSources.push(cost.source);
          },
        });

        if (!content) {
          throw new Error(`Generated empty content for ${output.contentType} output ${output.index}.`);
        }

        markdownPaths.push(markdownPath);
        await writeUtf8File(markdownPath, content);
        generatedOutputs.push({
          fileId: itemId,
          contentType: output.contentType,
          markdownPath,
        });

        const itemDurationMs = Date.now() - itemStartedAtMs;
        const knownItemCost = sumKnownCosts(itemTracking.costs);
        const itemCostSource = chooseStageCostSource(itemTracking.costSources, knownItemCost.source);
        outputItemCalls.push({
          itemId,
          contentType: output.contentType,
          filePrefix: output.filePrefix,
          index: output.index,
          outputCountForType: output.outputCountForType,
          durationMs: itemDurationMs,
          retries: itemTracking.retries,
          costUsd: knownItemCost.usd,
          costSource: itemCostSource,
        });

        stages[5] = {
          ...stages[5],
          detail: `Completed ${formatOutputItemLabel(output.contentType, output.index, output.outputCountForType)}.`,
          items: (stages[5].items ?? []).map((item) => {
            if (item.id !== itemId) {
              return item;
            }

            return {
              ...item,
              status: 'succeeded',
              detail: 'Saved markdown output.',
              summary: path.basename(markdownPath),
              analytics: {
                durationMs: itemDurationMs,
                costUsd: knownItemCost.usd,
                costSource: itemCostSource,
              },
            };
          }),
        };
        options.onUpdate?.(cloneStages(stages));
      } catch (error) {
        stages[5] = {
          ...stages[5],
          items: (stages[5].items ?? []).map((item) => {
            if (item.id !== itemId) {
              return item;
            }

            return {
              ...item,
              status: 'failed',
              detail: error instanceof Error ? error.message : 'Unknown item failure.',
            };
          }),
        };
        options.onUpdate?.(cloneStages(stages));
        throw error;
      }
    }

    markStageCompleted(stageTracking, 'output');
    stages[5] = {
      ...stages[5],
      status: 'succeeded',
      detail: requestedOutputs.length > 0
        ? 'Generated secondary channel content successfully.'
        : 'No secondary outputs requested.',
      summary: `${markdownPaths.length} files in ${generationDir}`,
      stageAnalytics: snapshotStageAnalytics(stageTracking, 'output'),
    };
    options.onUpdate?.(cloneStages(stages));

    const eligibleOutputsForLinks = generatedOutputs.filter((output) => output.contentType !== 'x-post' && output.contentType !== 'x-thread');
    stages[6] = {
      ...stages[6],
      status: 'running',
      detail: 'Selecting expressions and resolving source URLs.',
      items: eligibleOutputsForLinks.map((output) => ({
        id: output.fileId,
        label: output.fileId,
        status: 'pending',
        detail: 'Waiting to start.',
      })),
    };
    markStageStarted(stageTracking, 'links');
    options.onUpdate?.(cloneStages(stages));

    if (!shouldEnrichLinks) {
      const customLinkActions = pipelineCustomLinkRaws.length > 0 || pipelineUnlinks.length > 0;
      if (customLinkActions && eligibleOutputsForLinks.length > 0) {
        for (const output of eligibleOutputsForLinks) {
          const existingLinks = await readExistingLinks(resolveLinksPath(output.markdownPath));
          const mergedCustomLinks = resolvePipelineCustomLinks(
            existingLinks?.customLinks ?? [],
            pipelineCustomLinkRaws,
            pipelineUnlinks,
          );
          const generatedLinks = existingLinks?.links ?? [];

          await writeLinksFile(output.markdownPath, {
            version: 2,
            customLinks: mergedCustomLinks,
            links: generatedLinks,
          });
        }

        markStageCompleted(stageTracking, 'links');
        stages[6] = {
          ...stages[6],
          status: 'succeeded',
          detail: 'Updated custom links without generating new links.',
          summary: `${eligibleOutputsForLinks.length} files updated`,
          items: (stages[6].items ?? []).map((stageItem) => ({
            ...stageItem,
            status: 'succeeded',
            detail: 'Saved custom links sidecar.',
          })),
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'links'),
        };
        options.onUpdate?.(cloneStages(stages));
      } else {
        markStageCompleted(stageTracking, 'links');
        stages[6] = {
          ...stages[6],
          status: 'succeeded',
          detail: 'Skipped link enrichment (enable with --enrich-links).',
          summary: 'Link enrichment disabled for this run',
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'links'),
        };
        options.onUpdate?.(cloneStages(stages));
      }
    } else if (eligibleOutputsForLinks.length === 0) {
      markStageCompleted(stageTracking, 'links');
      stages[6] = {
        ...stages[6],
        status: 'succeeded',
        detail: 'Skipped link enrichment (no eligible outputs).',
        summary: 'No long-form outputs to enrich',
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'links'),
      };
      options.onUpdate?.(cloneStages(stages));
    } else if (linksResult) {
      const linksByFileId = new Map(linksResult.map((item) => [item.fileId, item.links]));
      const customLinksByFileId = new Map(linksResult.map((item) => [item.fileId, item.customLinks]));
      const resumedLinks = eligibleOutputsForLinks.map((output) => ({
        fileId: output.fileId,
        contentType: output.contentType,
        markdownPath: output.markdownPath,
        links: linksByFileId.get(output.fileId) ?? [],
        customLinks: customLinksByFileId.get(output.fileId) ?? [],
      }));
      linksResult = resumedLinks;

      for (const item of resumedLinks) {
        await writeLinksFile(item.markdownPath, {
          version: 2,
          customLinks: item.customLinks,
          links: item.links,
        });
      }

      markStageCompleted(stageTracking, 'links');
      stages[6] = {
        ...stages[6],
        status: 'succeeded',
        detail: 'Reused saved link metadata from cached session.',
        summary: `${resumedLinks.reduce((sum, item) => sum + item.links.length, 0)} links`,
        items: (stages[6].items ?? []).map((item) => ({
          ...item,
          status: 'succeeded',
          detail: 'Reused saved link metadata.',
        })),
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'links'),
      };
      options.onUpdate?.(cloneStages(stages));
    } else {
      const itemTracking = new Map<string, {
        startedAtMs: number;
        endedAtMs: number | null;
        retries: number;
        costs: Array<number | null>;
        costSources: CostSource[];
      }>();

      linksResult = await enrichLinks({
        markdownFiles: eligibleOutputsForLinks,
        articleTitle: plan?.title ?? contentPlan.title ?? deriveTitleFromIdea(input.idea),
        articleDescription: plan?.description ?? contentPlan.description,
        openRouter,
        settings: input.config.settings,
        dryRun,
        customLinks: parsePipelineCustomLinks(pipelineCustomLinkRaws, pipelineUnlinks),
        maxLinks: pipelineMaxLinks ?? resolveDefaultMaxLinks(input.config.settings.targetLength),
        onInteraction(interaction) {
          onLlmInteraction(interaction);
        },
        onLlmMetrics(fileId, metrics) {
          recordLlmMetrics(stageTracking, 'links', metrics);
          addStageRetries(itemTracking, fileId, metrics.retries);
          const cost = estimateLlmCostUsd(metrics.modelId, metrics.usage);
          recordStageCost(itemTracking, fileId, cost.usd, cost.source);
        },
        onItemProgress(event) {
          markStageStarted(itemTracking, event.fileId);

          stages[6] = {
            ...stages[6],
            detail: 'Selecting expressions and resolving source URLs.',
            items: (stages[6].items ?? []).map((item) => {
              if (item.id !== event.fileId) {
                return item;
              }

              return {
                ...item,
                status: item.status === 'succeeded' || item.status === 'failed' ? item.status : 'running',
                detail: event.detail,
              };
            }),
          };
          options.onUpdate?.(cloneStages(stages));
        },
      });

      for (const item of linksResult) {
        markStageCompleted(itemTracking, item.fileId);
        const snapshot = snapshotStageAnalytics(itemTracking, item.fileId);
        const durationMs = snapshot?.durationMs ?? 0;
        const costUsd = snapshot?.costUsd ?? null;
        const costSource = snapshot?.costSource ?? 'unavailable';

        linkEnrichmentCalls.push({
          fileId: item.fileId,
          contentType: item.contentType,
          phraseCount: item.links.length,
          durationMs,
          retries: itemTracking.get(item.fileId)?.retries ?? 0,
          costUsd,
          costSource,
        });

        await writeLinksFile(item.markdownPath, {
          version: 2,
          customLinks: item.customLinks,
          links: item.links,
        });
      }

      markStageCompleted(stageTracking, 'links');
      stages[6] = {
        ...stages[6],
        status: 'succeeded',
        detail: 'Resolved links and wrote sidecar metadata files.',
        summary: `${linksResult.reduce((sum, item) => sum + item.links.length, 0)} links`,
        items: (stages[6].items ?? []).map((stageItem) => {
          const fileLinks = linksResult?.find((item) => item.fileId === stageItem.id);
          const analytics = snapshotStageAnalytics(itemTracking, stageItem.id);
          return {
            ...stageItem,
            status: 'succeeded',
            detail: 'Saved links sidecar.',
            summary: fileLinks ? `${fileLinks.links.length} links` : '0 links',
            analytics,
          };
        }),
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'links'),
      };
      options.onUpdate?.(cloneStages(stages));

      writeSession = await patchWriteSession(
        {
          status: 'running',
          lastCompletedStage: 'links',
          failedStage: null,
          errorMessage: null,
          links: linksResult,
        },
        workingDir,
      );
    }

    const analytics = buildRunAnalytics({
      runId,
      runMode,
      dryRun,
      runStartedAt,
      runStartedAtMs,
      stageTracking,
      imagePromptCalls,
      imageRenderCalls,
      outputItemCalls,
      linkEnrichmentCalls,
    });
    const interactions: PipelineRunInteractions = {
      runId,
      runMode,
      dryRun,
      startedAt: runStartedAt,
      endedAt: new Date().toISOString(),
      llmCalls: llmInteractions,
      t2iCalls: t2iInteractions,
    };
    const analyticsPath = path.join(generationDir, 'generation.analytics.json');
    const interactionsPath = path.join(generationDir, 'model.interactions.json');
    await writeJsonFile(analyticsPath, analytics);
    await writeJsonFile(interactionsPath, interactions);

    const metaJson = buildMetaJson({
      idea: input.idea,
      generationDir,
      contentPlan,
      plan,
      renderedImages: imageArtifacts?.renderedImages ?? [],
      outputs: generatedOutputs,
      generatedAt: new Date().toISOString(),
      style: input.config.settings.style,
      intent: input.config.settings.intent,
      targetLength: input.config.settings.targetLength
        ? resolveTargetLengthAlias(input.config.settings.targetLength)
        : null,
    });
    const metaJsonPath = path.join(generationDir, 'meta.json');
    await writeJsonFile(metaJsonPath, metaJson);

    const primaryMarkdownPathForArtifact = markdownPaths[0] ?? primaryMarkdownPath;

    const artifact = {
      title: plan?.title ?? contentPlan.title ?? deriveTitleFromIdea(input.idea),
      slug: plan?.slug ?? resolveGenerationSlug(input.idea, contentPlan?.title),
      sectionCount: text?.sections.length ?? 0,
      imageCount: imageArtifacts?.renderedImages.length ?? 0,
      outputCount: markdownPaths.length,
      generationDir,
      markdownPaths,
      markdownPath: primaryMarkdownPathForArtifact,
      assetDir: sharedAssetDir,
      analyticsPath,
      interactionsPath,
      planPath,
      metaJsonPath,
    };

    writeSession = await patchWriteSession(
      {
        status: 'completed',
        lastCompletedStage: 'links',
        failedStage: null,
        errorMessage: null,
        artifact,
      },
      workingDir,
    );

    const completedArtifact = writeSession.artifact;
    if (!completedArtifact) {
      throw new Error('Write session completed without artifact metadata.');
    }

    return {
      stages,
      artifact: completedArtifact,
      analytics,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown pipeline failure';
    const failedStageId = markRunningStageFailed(stages, detail);
    if (failedStageId) {
      markStageCompleted(stageTracking, failedStageId);
    }
    options.onUpdate?.(cloneStages(stages));

    await patchWriteSession(
      {
        status: 'failed',
        failedStage: failedStageId,
        errorMessage: detail,
      },
      workingDir,
    );

    throw error;
  }
}

function markStageStarted<TKey extends string>(
  tracking: Map<TKey, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: TKey,
): void {
  const existing = tracking.get(stageId);
  if (existing) {
    return;
  }

  tracking.set(stageId, {
    startedAtMs: Date.now(),
    endedAtMs: null,
    retries: 0,
    costs: [],
    costSources: [],
  });
}

function markStageCompleted<TKey extends string>(
  tracking: Map<TKey, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: TKey,
): void {
  const existing = tracking.get(stageId);
  if (!existing) {
    markStageStarted(tracking, stageId);
    const next = tracking.get(stageId);
    if (next) {
      next.endedAtMs = Date.now();
    }
    return;
  }

  existing.endedAtMs = Date.now();
}

function addStageRetries<TKey extends string>(
  tracking: Map<TKey, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: TKey,
  retries: number,
): void {
  markStageStarted(tracking, stageId);
  const existing = tracking.get(stageId);
  if (!existing) {
    return;
  }

  existing.retries += retries;
}

function recordStageCost<TKey extends string>(
  tracking: Map<TKey, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: TKey,
  costUsd: number | null,
  source: CostSource,
): void {
  markStageStarted(tracking, stageId);
  const existing = tracking.get(stageId);
  if (!existing) {
    return;
  }

  existing.costs.push(costUsd);
  existing.costSources.push(source);
}

function recordLlmMetrics<TKey extends string>(
  tracking: Map<TKey, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: TKey,
  metrics: LlmCallMetrics,
): void {
  addStageRetries(tracking, stageId, metrics.retries);
  const cost = estimateLlmCostUsd(metrics.modelId, metrics.usage);
  recordStageCost(tracking, stageId, cost.usd, cost.source);
}

function buildRunAnalytics({
  runId,
  runMode,
  dryRun,
  runStartedAt,
  runStartedAtMs,
  stageTracking,
  imagePromptCalls,
  imageRenderCalls,
  outputItemCalls,
  linkEnrichmentCalls,
}: {
  runId: string;
  runMode: 'fresh' | 'resume';
  dryRun: boolean;
  runStartedAt: string;
  runStartedAtMs: number;
  stageTracking: Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>;
  imagePromptCalls: ImagePromptAnalytics[];
  imageRenderCalls: ImageRenderAnalytics[];
  outputItemCalls: OutputItemAnalytics[];
  linkEnrichmentCalls: LinkEnrichmentItemAnalytics[];
}): PipelineRunAnalytics {
  const runEndedAtMs = Date.now();
  const orderedStageIds: WriteStageId[] = ['shared-plan', 'planning', 'sections', 'image-prompts', 'images', 'output', 'links'];
  const stages: PipelineStageAnalytics[] = orderedStageIds.map((stageId) => {
    const tracked = stageTracking.get(stageId);
    const startedAtMs = tracked?.startedAtMs ?? runEndedAtMs;
    const endedAtMs = tracked?.endedAtMs ?? runEndedAtMs;
    const knownCost = sumKnownCosts(tracked?.costs ?? []);
    return {
      stageId,
      durationMs: Math.max(0, endedAtMs - startedAtMs),
      startedAt: new Date(startedAtMs).toISOString(),
      endedAt: new Date(endedAtMs).toISOString(),
      retries: tracked?.retries ?? 0,
      costUsd: knownCost.usd,
      costSource: chooseStageCostSource(tracked?.costSources ?? [], knownCost.source),
    };
  });

  const totalCost = sumKnownCosts(stages.map((stage) => stage.costUsd));
  const totalRetries = stages.reduce((sum, stage) => sum + stage.retries, 0);

  return {
    runId,
    runMode,
    dryRun,
    startedAt: runStartedAt,
    endedAt: new Date(runEndedAtMs).toISOString(),
    summary: {
      totalDurationMs: runEndedAtMs - runStartedAtMs,
      totalRetries,
      totalCostUsd: totalCost.usd,
      totalCostSource: totalCost.source,
    },
    stages,
    imagePromptCalls,
    imageRenderCalls,
    outputItemCalls,
    linkEnrichmentCalls,
  };
}

function chooseStageCostSource(costSources: CostSource[], aggregateSource: CostSource): CostSource {
  if (costSources.length === 0) {
    return 'estimated';
  }

  if (costSources.every((source) => source === 'provider')) {
    return 'provider';
  }

  if (costSources.every((source) => source === 'estimated')) {
    return 'estimated';
  }

  return aggregateSource;
}

function snapshotStageAnalytics<TKey extends string>(
  tracking: Map<TKey, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: TKey,
): StageViewModel['stageAnalytics'] {
  const tracked = tracking.get(stageId);
  if (!tracked) {
    return undefined;
  }

  const endedAtMs = tracked.endedAtMs ?? Date.now();
  const knownCost = sumKnownCosts(tracked.costs);
  return {
    durationMs: Math.max(0, endedAtMs - tracked.startedAtMs),
    costUsd: knownCost.usd,
    costSource: chooseStageCostSource(tracked.costSources, knownCost.source),
  };
}

function cloneStages(stages: StageViewModel[]): StageViewModel[] {
  return stages.map((stage) => ({
    ...stage,
    items: stage.items?.map((item) => ({ ...item })),
  }));
}

function buildSectionItems(sectionTitles: string[]): StageItemViewModel[] {
  return [
    {
      id: 'sections:intro',
      label: 'Introduction',
      status: 'pending',
      detail: 'Waiting to start.',
    },
    ...sectionTitles.map((title, index) => ({
      id: `sections:section-${index + 1}`,
      label: `Section ${index + 1}: ${title}`,
      status: 'pending' as const,
      detail: 'Waiting to start.',
    })),
    {
      id: 'sections:outro',
      label: 'Conclusion',
      status: 'pending',
      detail: 'Waiting to start.',
    },
  ];
}

function toSectionItemId(phase: 'intro' | 'section' | 'outro', sectionIndex?: number): string | null {
  if (phase === 'intro') {
    return 'sections:intro';
  }

  if (phase === 'outro') {
    return 'sections:outro';
  }

  if (phase === 'section' && typeof sectionIndex === 'number') {
    return `sections:section-${sectionIndex + 1}`;
  }

  return null;
}

function toSectionItemIdFromLabel(label: string): string | null {
  if (label === 'Writing introduction') {
    return 'sections:intro';
  }

  if (label === 'Writing conclusion') {
    return 'sections:outro';
  }

  const sectionMatch = /^Writing section (\d+)\/\d+:/.exec(label);
  if (!sectionMatch) {
    return null;
  }

  return `sections:section-${Number(sectionMatch[1])}`;
}

function applySectionItemTransition(
  items: StageItemViewModel[],
  nextItemId: string,
  tracking: Map<string, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
): StageItemViewModel[] {
  const now = Date.now();
  return items.map((item) => {
    if (item.id === nextItemId) {
      if (item.status !== 'running') {
        markStageStarted(tracking, item.id);
      }
      return {
        ...item,
        status: 'running',
        detail: 'Generating content.',
      };
    }

    if (item.status === 'running') {
      const tracked = tracking.get(item.id);
      if (tracked && tracked.endedAtMs === null) {
        tracked.endedAtMs = now;
      }
      return {
        ...item,
        status: 'succeeded',
        detail: 'Completed',
        analytics: snapshotStageAnalytics(tracking, item.id),
      };
    }

    return item;
  });
}

function toOutputItemId(filePrefix: string, index: number): string {
  return `${filePrefix}-${index}`;
}

function formatOutputItemLabel(contentType: string, index: number, total: number): string {
  const readableType = contentType.replace(/-/g, ' ');
  return `${readableType} ${index}/${total}`;
}

function requireSecret(value: string | null, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label}. Configure it with environment variables or a future ideon settings flow.`);
  }

  return value;
}

function markRunningStageFailed(stages: StageViewModel[], detail: string): WriteStageId | null {
  const runningStage = stages.find((stage) => stage.status === 'running');
  if (!runningStage) {
    return null;
  }

  runningStage.status = 'failed';
  runningStage.detail = detail;
  return asWriteStageId(runningStage.id);
}

function expandRequestedOutputs(
  contentTargets: Array<{ contentType: string; count: number }>,
  options: { fallbackToArticle: boolean } = { fallbackToArticle: true },
): Array<{ contentType: string; filePrefix: string; index: number; outputCountForType: number }> {
  const outputs: Array<{ contentType: string; filePrefix: string; index: number; outputCountForType: number }> = [];
  const seenPerPrefix = new Map<string, number>();

  for (const target of contentTargets) {
    const prefix = toFilePrefix(target.contentType);
    for (let i = 0; i < target.count; i += 1) {
      const nextIndex = (seenPerPrefix.get(prefix) ?? 0) + 1;
      seenPerPrefix.set(prefix, nextIndex);
      outputs.push({
        contentType: target.contentType,
        filePrefix: prefix,
        index: nextIndex,
        outputCountForType: target.count,
      });
    }
  }

  if (outputs.length === 0 && options.fallbackToArticle) {
    return [{ contentType: 'article', filePrefix: 'article', index: 1, outputCountForType: 1 }];
  }

  return outputs;
}

function toFilePrefix(contentType: string): string {
  if (contentType === 'article') return 'article';
  if (contentType === 'blog-post') return 'blog';
  if (contentType === 'x-thread') return 'x-thread';
  if (contentType === 'x-post') return 'x-post';
  if (contentType === 'reddit-post') return 'reddit';
  if (contentType === 'linkedin-post') return 'linkedin';
  if (contentType === 'newsletter') return 'newsletter';
  return contentType.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'content';
}

function getPrimaryTarget(
  contentTargets: Array<{ contentType: string; role: string; count: number }>,
): { contentType: string; role: 'primary'; count: number } {
  const primary = contentTargets.find((target) => target.role === 'primary');
  if (!primary) {
    throw new Error('Write configuration must include exactly one primary content target.');
  }

  if (primary.count !== 1) {
    throw new Error('Primary content target count must be exactly 1.');
  }

  return {
    contentType: primary.contentType,
    role: 'primary',
    count: primary.count,
  };
}

function getSecondaryTargets(
  contentTargets: Array<{ contentType: string; role: string; count: number }>,
): Array<{ contentType: string; role: 'secondary'; count: number }> {
  return contentTargets
    .filter((target) => target.role === 'secondary')
    .map((target) => ({
      contentType: target.contentType,
      role: 'secondary',
      count: target.count,
    }));
}

function buildPrimaryCoverPrompt(
  plan: PrimaryPlan,
  contentPlan: { description: string; targetAudience: string; corePromise: string; voiceNotes: string },
  primaryContentType: string,
): ArticleImagePrompt {
  return {
    id: 'cover',
    kind: 'cover',
    description: plan.coverImageDescription,
    anchorAfterSection: null,
    prompt: [
      plan.coverImageDescription,
      `Content type: ${primaryContentType}`,
      `Core angle: ${contentPlan.description}`,
      `Audience: ${contentPlan.targetAudience}`,
      `Promise: ${contentPlan.corePromise}`,
      `Voice: ${contentPlan.voiceNotes}`,
      'Do not include any words, letters, numbers, logos, watermarks, or signage in the image.',
    ].join(' '),
  };
}

function withCoverImage(markdown: string, relativePath: string, altText: string): string {
  const coverLine = `![${altText}](${relativePath})`;
  if (markdown.includes(coverLine)) {
    return markdown;
  }

  return `${coverLine}\n\n${markdown}`;
}

function applyPrimaryTitleHeading(markdown: string, title: string): string {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return markdown;
  }

  const headingPattern = /^#\s+.+$/m;
  if (headingPattern.test(markdown)) {
    return markdown.replace(headingPattern, `# ${normalizedTitle}`);
  }

  return `# ${normalizedTitle}\n\n${markdown}`;
}

function deriveTitleFromIdea(idea: string): string {
  const normalized = idea.trim();
  if (!normalized) {
    return 'Generated Content Batch';
  }

  return normalized
    .split(/\s+/)
    .slice(0, 8)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function slugifyIdea(idea: string, maxLength?: number): string {
  const slug = idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'generated-content';
  if (maxLength !== undefined && slug.length > maxLength) {
    return slug.slice(0, maxLength).replace(/-+$/, '');
  }
  return slug;
}

function resolveGenerationSlug(idea: string, planTitle?: string | null): string {
  if (planTitle) {
    return slugifyIdea(planTitle);
  }
  return slugifyIdea(idea, 80);
}

function buildRunJobDefinition(input: {
  idea: string;
  targetAudienceHint?: string;
  dryRun: boolean;
  runMode: 'fresh' | 'resume';
  settings: ResolvedRunInput['config']['settings'];
  sourceJob: ResolvedRunInput['job'];
}): {
  idea: string;
  prompt: string;
  targetAudience?: string;
  contentTargets: ResolvedRunInput['config']['settings']['contentTargets'];
  style: string;
  settings: ResolvedRunInput['config']['settings'];
  sourceJob: ResolvedRunInput['job'];
  runMetadata: {
    generatedAt: string;
    dryRun: boolean;
    runMode: 'fresh' | 'resume';
  };
} {
  return {
    idea: input.idea,
    prompt: input.idea,
    ...(input.targetAudienceHint ? { targetAudience: input.targetAudienceHint } : {}),
    contentTargets: input.settings.contentTargets,
    style: input.settings.style,
    settings: input.settings,
    sourceJob: input.sourceJob,
    runMetadata: {
      generatedAt: new Date().toISOString(),
      dryRun: input.dryRun,
      runMode: input.runMode,
    },
  };
}

function renderPlanMarkdown(plan: PrimaryPlan): string {
  const lines: string[] = [
    `# ${plan.title}`,
    '',
    `**Content type:** ${plan.contentType}`,
    `**Slug:** ${plan.slug}`,
    '',
    '## Description',
    '',
    plan.description,
    '',
  ];

  if (plan.subtitle) {
    lines.push('## Subtitle', '', plan.subtitle, '');
  }

  if (plan.keywords && plan.keywords.length > 0) {
    lines.push('## Keywords', '', ...plan.keywords.map((kw) => `- ${kw}`), '');
  }

  if (plan.introBrief) {
    lines.push('## Introduction Brief', '', plan.introBrief, '');
  }

  if (plan.sections && plan.sections.length > 0) {
    lines.push('## Sections', '', '| # | Title | Description |', '|---|-------|-------------|');
    plan.sections.forEach((section, index) => {
      lines.push(`| ${index + 1} | ${section.title} | ${section.description} |`);
    });
    lines.push('');
  }

  if (plan.outroBrief) {
    lines.push('## Outro Brief', '', plan.outroBrief, '');
  }

  if (plan.angle) {
    lines.push('## Angle', '', plan.angle, '');
  }

  lines.push('## Image Plan', '');
  lines.push(`- **Cover:** ${plan.coverImageDescription}`);
  if (plan.inlineImages && plan.inlineImages.length > 0) {
    plan.inlineImages.forEach((img, index) => {
      lines.push(`- **Inline ${index + 1}:** ${img.description} (after section ${img.anchorAfterSection})`);
    });
  }
  lines.push('');

  return lines.join('\n');
}

function buildPlanSummary(plan: PrimaryPlan): string {
  const parts = [plan.title, plan.slug];
  if (plan.sections && plan.sections.length > 0) {
    parts.push(`${plan.sections.length} sections`);
  }
  if (plan.inlineImages && plan.inlineImages.length > 0) {
    parts.push(`${plan.inlineImages.length + 1} images`);
  } else {
    parts.push('1 image');
  }
  return parts.join(' • ');
}

function asWriteStageId(stageId: string): WriteStageId | null {
  if (
    stageId === 'shared-plan' ||
    stageId === 'planning' ||
    stageId === 'sections' ||
    stageId === 'image-prompts' ||
    stageId === 'images' ||
    stageId === 'output' ||
    stageId === 'links'
  ) {
    return stageId;
  }

  return null;
}

function parsePipelineCustomLinks(rawLinks: string[], unlinks: string[]): LinkEntry[] {
  const result = new Map<string, LinkEntry>();

  for (const raw of rawLinks) {
    const separatorIndex = raw.indexOf('->');
    if (separatorIndex < 0) {
      continue;
    }

    const expression = raw.slice(0, separatorIndex).trim();
    const url = raw.slice(separatorIndex + 2).trim();
    if (expression && url) {
      result.set(expression.toLowerCase(), { expression, url, title: null });
    }
  }

  for (const expr of unlinks) {
    result.delete(expr.trim().toLowerCase());
  }

  return Array.from(result.values());
}

function resolvePipelineCustomLinks(existing: LinkEntry[], rawLinks: string[], unlinks: string[]): LinkEntry[] {
  const result = new Map<string, LinkEntry>(
    existing.map((entry) => [entry.expression.trim().toLowerCase(), entry]),
  );

  for (const raw of rawLinks) {
    const separatorIndex = raw.indexOf('->');
    if (separatorIndex < 0) {
      continue;
    }

    const expression = raw.slice(0, separatorIndex).trim();
    const url = raw.slice(separatorIndex + 2).trim();
    if (expression && url) {
      result.set(expression.toLowerCase(), { expression, url, title: null });
    }
  }

  for (const expr of unlinks) {
    result.delete(expr.trim().toLowerCase());
  }

  return Array.from(result.values());
}

async function readExistingLinks(linksPath: string): Promise<{ version: number; customLinks: LinkEntry[]; links: LinkEntry[] } | null> {
  try {
    const raw = await readFile(linksPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: unknown; links?: unknown; customLinks?: unknown };
    const links = Array.isArray(parsed.links)
      ? parsed.links
          .filter((entry): entry is LinkEntry => isValidLinkEntry(entry))
          .map((entry) => ({
            expression: entry.expression.trim(),
            url: entry.url.trim(),
            title: typeof entry.title === 'string' ? entry.title : null,
          }))
      : null;

    if (!links) {
      throw new Error(`Invalid links sidecar format at ${linksPath}. Expected { version, links[] }.`);
    }

    const customLinks = Array.isArray(parsed.customLinks)
      ? parsed.customLinks
          .filter((entry): entry is LinkEntry => isValidLinkEntry(entry))
          .map((entry) => ({
            expression: entry.expression.trim(),
            url: entry.url.trim(),
            title: typeof entry.title === 'string' ? entry.title : null,
          }))
      : [];

    return {
      version: typeof parsed.version === 'number' ? parsed.version : 2,
      customLinks,
      links,
    };
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

function isValidLinkEntry(entry: unknown): entry is LinkEntry {
  return (
    typeof entry === 'object'
    && entry !== null
    && typeof (entry as { expression?: unknown }).expression === 'string'
    && typeof (entry as { url?: unknown }).url === 'string'
  );
}

export const __testInternals = {
  markStageStarted,
  markStageCompleted,
  addStageRetries,
  recordStageCost,
  recordLlmMetrics,
  snapshotStageAnalytics,
  toSectionItemId,
  toSectionItemIdFromLabel,
  applySectionItemTransition,
  toOutputItemId,
  formatOutputItemLabel,
  requireSecret,
  markRunningStageFailed,
  expandRequestedOutputs,
  toFilePrefix,
  deriveTitleFromIdea,
  slugifyIdea,
  resolveGenerationSlug,
  asWriteStageId,
  chooseStageCostSource,
  getPrimaryTarget,
  getSecondaryTargets,
  buildPrimaryCoverPrompt,
  buildPlanSummary,
  withCoverImage,
};
