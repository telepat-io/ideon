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
  LinkEnrichmentItemAnalytics,
  OutputItemAnalytics,
  PipelineRunAnalytics,
  PipelineRunResult,
  PipelineStageAnalytics,
  StageItemViewModel,
  StageViewModel,
} from './events.js';
import {
  loadWriteSession,
  patchWriteSession,
  startFreshWriteSession,
  type WriteSessionState,
  type WriteStageId,
} from './sessionStore.js';

export interface PipelineRunOptions {
  onUpdate?: (stages: StageViewModel[]) => void;
  dryRun?: boolean;
  runMode?: 'fresh' | 'resume';
  workingDir?: string;
  enrichLinks?: boolean;
}

export function createInitialStages(): StageViewModel[] {
  return [
    {
      id: 'shared-brief',
      title: 'Planning Shared Brief',
      status: 'running',
      detail: 'Generating explicit cross-channel content guidance.',
    },
    {
      id: 'planning',
      title: 'Planning Article',
      status: 'pending',
      detail: 'Generating title, slug, section plan, and image slots.',
    },
    {
      id: 'sections',
      title: 'Writing Sections',
      status: 'pending',
      detail: 'Waiting for the approved article plan.',
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
      title: 'Assembling Markdown',
      status: 'pending',
      detail: 'Waiting for article content and assets.',
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
  const stages: StageViewModel[] = createInitialStages();
  options.onUpdate?.(cloneStages(stages));
  const dryRun = options.dryRun ?? false;
  const shouldEnrichLinks = options.enrichLinks ?? true;
  const runMode = options.runMode ?? 'fresh';
  const workingDir = options.workingDir ?? process.cwd();
  const outputPaths = resolveOutputPaths(input.config.settings, workingDir);
  const hasArticleTarget = input.config.settings.contentTargets.some((target) => target.contentType === 'article');
  const stageTracking = new Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>();
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
  let writeSession: WriteSessionState;

  if (runMode === 'fresh') {
    writeSession = await startFreshWriteSession(
      {
        idea: input.idea,
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
    const replicate = dryRun || !hasArticleTarget ? null : new ReplicateClient(requireSecret(input.config.secrets.replicateApiToken, 'Replicate API token'));
    let contentBrief = writeSession.contentBrief;
    let plan = writeSession.plan;
    let text = writeSession.text;
    let imagePrompts = writeSession.imagePrompts ?? writeSession.imageArtifacts?.imagePrompts ?? null;
    let imageArtifacts = writeSession.imageArtifacts;
    let linksResult = writeSession.links;
    let articleMarkdownTemplate: string | null = null;

    if (contentBrief) {
      markStageCompleted(stageTracking, 'shared-brief');
      stages[0] = {
        ...stages[0],
        status: 'succeeded',
        detail: 'Reused saved shared brief from .ideon/write.',
        summary: contentBrief.description,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'shared-brief'),
      };
    } else {
      contentBrief = await planContentBrief({
        idea: input.idea,
        settings: input.config.settings,
        openRouter,
        dryRun,
        onLlmMetrics(metrics) {
          recordLlmMetrics(stageTracking, 'shared-brief', metrics);
        },
      });

      markStageCompleted(stageTracking, 'shared-brief');
      stages[0] = {
        ...stages[0],
        status: 'succeeded',
        detail: 'Shared brief generated successfully.',
        summary: contentBrief.description,
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

    if (hasArticleTarget) {
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
      markStageCompleted(stageTracking, 'planning');
      stages[1] = {
        ...stages[1],
        status: 'succeeded',
        detail: 'Skipped article planning (no article target).',
        summary: 'No article requested',
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'planning'),
      };

      markStageCompleted(stageTracking, 'sections');
      stages[2] = {
        ...stages[2],
        status: 'succeeded',
        detail: 'Skipped section writing (no article target).',
        summary: 'No article requested',
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'sections'),
      };

      markStageCompleted(stageTracking, 'image-prompts');
      stages[3] = {
        ...stages[3],
        status: 'succeeded',
        detail: 'Skipped image prompt expansion (no article target).',
        summary: 'No article requested',
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'image-prompts'),
      };

      markStageCompleted(stageTracking, 'images');
      stages[4] = {
        ...stages[4],
        status: 'succeeded',
        detail: 'Skipped image rendering (no article target).',
        summary: 'No article requested',
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'images'),
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
        dryRun,
        runMode,
        settings: input.config.settings,
        sourceJob: input.job,
      }),
    );
    const primaryMarkdownPath = path.join(generationDir, 'article-1.md');
    const sharedAssetDir = generationDir;

    if (hasArticleTarget) {
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
          dryRun,
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
        plan,
        intro: text.intro,
        sections: text.sections,
        outro: text.outro,
        imagePrompts: imageArtifacts.imagePrompts,
        renderedImages: imageArtifacts.renderedImages,
      };
      articleMarkdownTemplate = renderMarkdownDocument(article);
    }
    const requestedOutputs = expandRequestedOutputs(input.config.settings.contentTargets);
    const markdownPaths: string[] = [];
    const generatedOutputs: Array<{ fileId: string; contentType: string; markdownPath: string }> = [];

    stages[5] = {
      ...stages[5],
      status: 'running',
      detail: hasArticleTarget
        ? 'Writing article and channel outputs.'
        : 'Generating channel outputs from single prompts.',
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
        const content = output.contentType === 'article'
          ? articleMarkdownTemplate
          : await writeSingleShotContent({
              idea: input.idea,
              contentType: output.contentType,
              style: input.config.settings.style,
              outputIndex: output.index,
              outputCountForType: output.outputCountForType,
              articleReferenceMarkdown: articleMarkdownTemplate ?? undefined,
              contentBrief,
              settings: input.config.settings,
              openRouter,
              dryRun,
              onLlmMetrics(metrics) {
                recordLlmMetrics(stageTracking, 'output', metrics);
                itemTracking.retries += metrics.retries;
                const cost = estimateLlmCostUsd(metrics.modelId, metrics.usage);
                itemTracking.costs.push(cost.usd);
                itemTracking.costSources.push(cost.source);
              },
            });

        if (output.contentType === 'article' && !content) {
          throw new Error('Article output requested but article section-generation result is missing.');
        }

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
      detail: 'Markdown file assembled successfully.',
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
        articleTitle: plan?.title ?? deriveTitleFromIdea(input.idea),
        articleDescription: plan?.description ?? contentBrief.description,
        openRouter,
        settings: input.config.settings,
        dryRun,
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
    const analyticsPath = path.join(generationDir, 'generation.analytics.json');
    await writeJsonFile(analyticsPath, analytics);
    const primaryMarkdownPathForArtifact = markdownPaths[0] ?? primaryMarkdownPath;

    const artifact = {
      title: plan?.title ?? deriveTitleFromIdea(input.idea),
      slug: plan?.slug ?? slugifyIdea(input.idea),
      sectionCount: text?.sections.length ?? 0,
      imageCount: imageArtifacts?.renderedImages.length ?? 0,
      outputCount: markdownPaths.length,
      generationDir,
      markdownPaths,
      markdownPath: primaryMarkdownPathForArtifact,
      assetDir: sharedAssetDir,
      analyticsPath,
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

  if (outputs.length === 0) {
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
  dryRun: boolean;
  runMode: 'fresh' | 'resume';
  settings: ResolvedRunInput['config']['settings'];
  sourceJob: ResolvedRunInput['job'];
}): {
  idea: string;
  prompt: string;
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
};
