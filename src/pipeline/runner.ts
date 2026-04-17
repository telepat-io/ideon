import { mkdir, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { ResolvedRunInput } from '../config/resolver.js';
import { enrichLinks } from '../generation/enrichLinks.js';
import { planContentBrief } from '../generation/planContentBrief.js';
import { planArticle } from '../generation/planArticle.js';
import { writeSingleShotContent } from '../generation/writeSingleShotContent.js';
import { writeArticleSections } from '../generation/writeSections.js';
import { ReplicateClient } from '../images/replicateClient.js';
import { expandImagePrompts, MIN_IMAGE_BYTES, renderExpandedImages } from '../images/renderImages.js';
import { OpenRouterClient } from '../llm/openRouterClient.js';
import { renderMarkdownDocument } from '../output/markdown.js';
import {
  buildGenerationDirectoryName,
  ensureOutputDirectories,
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
import type { ArticleImagePrompt } from '../types/article.js';

export interface PipelineRunOptions {
  onUpdate?: (stages: StageViewModel[]) => void;
  dryRun?: boolean;
  runMode?: 'fresh' | 'resume';
  workingDir?: string;
  enrichLinks?: boolean;
}

export function createInitialStages(options: { isArticlePrimary: boolean } = { isArticlePrimary: true }): StageViewModel[] {
  const planningTitle = options.isArticlePrimary ? 'Planning Primary Article' : 'Planning Primary Content';
  const planningDetail = options.isArticlePrimary
    ? 'Generating title, slug, section plan, and image slots.'
    : 'Defining the primary angle and output intent.';
  const sectionsTitle = options.isArticlePrimary ? 'Writing Sections' : 'Generating Primary Content';
  const sectionsDetail = options.isArticlePrimary
    ? 'Waiting for the approved article plan.'
    : 'Waiting for primary content generation to begin.';

  return [
    {
      id: 'shared-brief',
      title: 'Planning Shared Brief',
      status: 'running',
      detail: 'Generating explicit cross-channel content guidance.',
    },
    {
      id: 'planning',
      title: planningTitle,
      status: 'pending',
      detail: planningDetail,
    },
    {
      id: 'sections',
      title: sectionsTitle,
      status: 'pending',
      detail: sectionsDetail,
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
  const isArticlePrimary = primaryTarget.contentType === 'article';
  const stages: StageViewModel[] = createInitialStages({ isArticlePrimary });
  options.onUpdate?.(cloneStages(stages));
  const dryRun = options.dryRun ?? false;
  const shouldEnrichLinks = options.enrichLinks ?? true;
  const runMode = options.runMode ?? 'fresh';
  const workingDir = options.workingDir ?? process.cwd();
  const outputPaths = resolveOutputPaths(input.config.settings, workingDir);
  const hasArticlePrimary = isArticlePrimary;
  const stageTracking = new Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>();
  const stageRetryState = new Map<WriteStageId, { retries: number; lastError: string | null }>();
  const llmOperationRetryState = new Map<string, number>();
  const imageOperationRetryState = new Map<string, number>();
  stageTracking.set('shared-brief', {
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
      throw new Error('No resumable write session found in .ideon/write/state.json. Start a fresh write first.');
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
    const replicate = imageDryRun ? null : new ReplicateClient(requireSecret(input.config.secrets.replicateApiToken, 'Replicate API token'));
    let contentBrief = writeSession.contentBrief;
    let plan = writeSession.plan;
    let text = writeSession.text;
    let imagePrompts = writeSession.imagePrompts ?? writeSession.imageArtifacts?.imagePrompts ?? null;
    let imageArtifacts = writeSession.imageArtifacts;
    let linksResult = writeSession.links;
    let primaryMarkdownTemplate: string | null = null;

    if (contentBrief) {
      markStageCompleted(stageTracking, 'shared-brief');
      stages[0] = {
        ...stages[0],
        status: 'succeeded',
        detail: 'Reused saved shared brief from .ideon/write.',
        summary: contentBrief.title,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'shared-brief'),
      };
    } else {
      contentBrief = await planContentBrief({
        idea: input.idea,
        targetAudienceHint: input.targetAudienceHint,
        settings: input.config.settings,
        openRouter,
        dryRun,
        onInteraction(interaction) {
          onLlmInteraction(interaction);
        },
        onLlmMetrics(metrics) {
          recordLlmMetrics(stageTracking, 'shared-brief', metrics);
        },
      });

      markStageCompleted(stageTracking, 'shared-brief');
      stages[0] = {
        ...stages[0],
        status: 'succeeded',
        detail: 'Shared brief generated successfully.',
        summary: contentBrief.title,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'shared-brief'),
      };
      writeSession = await patchWriteSession(
        {
          status: 'running',
          lastCompletedStage: 'shared-brief',
          failedStage: null,
          errorMessage: null,
          contentBrief,
        },
        workingDir,
      );
    }

    if (hasArticlePrimary) {
      stages[1] = {
        ...stages[1],
        status: 'running',
        detail: 'Generating title, slug, section plan, and image slots.',
      };
      markStageStarted(stageTracking, 'planning');
      options.onUpdate?.(cloneStages(stages));

      if (plan) {
        markStageCompleted(stageTracking, 'planning');
        stages[1] = {
          ...stages[1],
          status: 'succeeded',
          detail: 'Reused saved plan from .ideon/write.',
          summary: `${plan.title} • ${plan.slug} • ${plan.sections.length} sections • ${plan.inlineImages.length + 1} images`,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'planning'),
        };
      } else {
        if (!contentBrief) {
          throw new Error('Shared content brief is missing for article planning stage.');
        }

        plan = await planArticle({
          idea: input.idea,
          contentBrief,
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
          summary: `${plan.title} • ${plan.slug} • ${plan.sections.length} sections • ${plan.inlineImages.length + 1} images`,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'planning'),
        };
        writeSession = await patchWriteSession(
          {
            status: 'running',
            lastCompletedStage: 'planning',
            failedStage: null,
            errorMessage: null,
            contentBrief,
            plan,
          },
          workingDir,
        );
      }

      stages[2] = {
        ...stages[2],
        status: 'running',
        detail: 'Writing introduction.',
        items: buildSectionItems(plan.sections.map((section) => section.title)),
      };
      markStageStarted(stageTracking, 'sections');
      options.onUpdate?.(cloneStages(stages));

      if (text) {
        markStageCompleted(stageTracking, 'sections');
        stages[2] = {
          ...stages[2],
          status: 'succeeded',
          detail: 'Reused saved section drafts from .ideon/write.',
          summary: `Intro + ${text.sections.length} sections + conclusion`,
          items: (stages[2].items ?? []).map((item) => ({
            ...item,
            status: 'succeeded',
            detail: 'Reused saved section draft from .ideon/write.',
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
          plan,
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
          detail: 'Reused saved image prompts from .ideon/write.',
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
          plan,
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
      if (!contentBrief) {
        throw new Error('Shared content brief is missing for primary content planning stage.');
      }

      stages[1] = {
        ...stages[1],
        status: 'running',
        detail: `Defining primary direction for ${primaryTarget.contentType}.`,
      };
      markStageStarted(stageTracking, 'planning');
      options.onUpdate?.(cloneStages(stages));

      markStageCompleted(stageTracking, 'planning');
      stages[1] = {
        ...stages[1],
        status: 'succeeded',
        detail: `Primary direction locked for ${primaryTarget.contentType}.`,
        summary: `Primary: ${primaryTarget.contentType}`,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'planning'),
      };

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
        outputIndex: 1,
        outputCountForType: 1,
        articleReferenceMarkdown: undefined,
        contentBrief,
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

      imagePrompts = [buildPrimaryCoverPrompt(contentBrief, primaryTarget.contentType, primaryMarkdownTemplate)];

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

    const baseSlug = plan?.slug ?? slugifyIdea(input.idea);
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
    const primaryFilePrefix = toFilePrefix(primaryTarget.contentType);
    const primaryMarkdownPath = path.join(generationDir, `${primaryFilePrefix}-1.md`);
    const sharedAssetDir = generationDir;

    if (hasArticlePrimary) {
      if (imageArtifacts) {
        markStageCompleted(stageTracking, 'images');
        stages[4] = {
          ...stages[4],
          status: 'succeeded',
          detail: 'Reused previously rendered images from .ideon/write.',
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
          replicate,
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
          onRetry(event) {
            const operationKey = `images:${event.imageId}`;
            const previousRetries = imageOperationRetryState.get(operationKey) ?? 0;
            if (event.retries <= previousRetries) {
              return;
            }

            imageOperationRetryState.set(operationKey, event.retries);
            applyRetryUpdate('images', event.retries - previousRetries, event.errorMessage);
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
        plan,
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
          detail: 'Reused previously rendered primary cover image from .ideon/write.',
          summary: sharedAssetDir,
          stageAnalytics: snapshotStageAnalytics(stageTracking, 'images'),
        };
      } else {
        const renderedImages = await renderExpandedImages({
          prompts: imagePrompts,
          settings: input.config.settings,
          replicate,
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
          onRetry(event) {
            const operationKey = `images:${event.imageId}`;
            const previousRetries = imageOperationRetryState.get(operationKey) ?? 0;
            if (event.retries <= previousRetries) {
              return;
            }

            imageOperationRetryState.set(operationKey, event.retries);
            applyRetryUpdate('images', event.retries - previousRetries, event.errorMessage);
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
        primaryMarkdownTemplate = withCoverImage(primaryMarkdownTemplate, coverImage.relativePath, deriveTitleFromIdea(input.idea));
      }

      primaryMarkdownTemplate = applyPrimaryTitleHeading(
        primaryMarkdownTemplate,
        contentBrief.title || deriveTitleFromIdea(input.idea),
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

    if (!contentBrief) {
      throw new Error('Shared content brief is missing for output generation stage.');
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
          outputIndex: output.index,
          outputCountForType: output.outputCountForType,
          articleReferenceMarkdown: primaryMarkdownTemplate ?? undefined,
          contentBrief,
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
      markStageCompleted(stageTracking, 'links');
      stages[6] = {
        ...stages[6],
        status: 'succeeded',
        detail: 'Skipped link enrichment (--no-enrich-links).',
        summary: 'Link enrichment disabled for this run',
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'links'),
      };
      options.onUpdate?.(cloneStages(stages));
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
      linksResult = eligibleOutputsForLinks.map((output) => ({
        fileId: output.fileId,
        contentType: output.contentType,
        markdownPath: output.markdownPath,
        links: linksByFileId.get(output.fileId) ?? [],
      }));

      for (const item of linksResult) {
        await writeLinksFile(item.markdownPath, {
          version: 1,
          links: item.links,
        });
      }

      markStageCompleted(stageTracking, 'links');
      stages[6] = {
        ...stages[6],
        status: 'succeeded',
        detail: 'Reused saved link metadata from .ideon/write.',
        summary: `${linksResult.reduce((sum, item) => sum + item.links.length, 0)} links`,
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
        articleTitle: plan?.title ?? contentBrief.title ?? deriveTitleFromIdea(input.idea),
        articleDescription: plan?.description ?? contentBrief.description,
        openRouter,
        settings: input.config.settings,
        dryRun,
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
          version: 1,
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
    const primaryMarkdownPathForArtifact = markdownPaths[0] ?? primaryMarkdownPath;

    const artifact = {
      title: plan?.title ?? contentBrief.title ?? deriveTitleFromIdea(input.idea),
      slug: plan?.slug ?? slugifyIdea(input.idea),
      sectionCount: text?.sections.length ?? 0,
      imageCount: imageArtifacts?.renderedImages.length ?? 0,
      outputCount: markdownPaths.length,
      generationDir,
      markdownPaths,
      markdownPath: primaryMarkdownPathForArtifact,
      assetDir: sharedAssetDir,
      analyticsPath,
      interactionsPath,
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
  const orderedStageIds: WriteStageId[] = ['shared-brief', 'planning', 'sections', 'image-prompts', 'images', 'output', 'links'];
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
  if (contentType === 'landing-page-copy') return 'landing';
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
  contentBrief: { description: string; targetAudience: string; corePromise: string; voiceNotes: string },
  primaryContentType: string,
  primaryMarkdown: string,
): ArticleImagePrompt {
  const markdownExcerpt = primaryMarkdown
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);

  return {
    id: 'cover',
    kind: 'cover',
    description: `Cover image for ${primaryContentType}`,
    anchorAfterSection: null,
    prompt: [
      `Editorial cover image for ${primaryContentType}.`,
      `Core angle: ${contentBrief.description}`,
      `Audience: ${contentBrief.targetAudience}`,
      `Promise: ${contentBrief.corePromise}`,
      `Voice: ${contentBrief.voiceNotes}`,
      `Primary excerpt: ${markdownExcerpt}`,
      'Cinematic composition, clear focal subject, no text overlays, high visual clarity.',
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

function slugifyIdea(idea: string): string {
  return idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'generated-content';
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

function asWriteStageId(stageId: string): WriteStageId | null {
  if (
    stageId === 'shared-brief' ||
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
  asWriteStageId,
  chooseStageCostSource,
  getPrimaryTarget,
  getSecondaryTargets,
  buildPrimaryCoverPrompt,
  withCoverImage,
};
