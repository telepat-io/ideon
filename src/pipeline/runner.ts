import { mkdir, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { ResolvedRunInput } from '../config/resolver.js';
import { planArticle } from '../generation/planArticle.js';
import { writeArticleSections } from '../generation/writeSections.js';
import { ReplicateClient } from '../images/replicateClient.js';
import { expandImagePrompts, MIN_IMAGE_BYTES, renderExpandedImages } from '../images/renderImages.js';
import { OpenRouterClient } from '../llm/openRouterClient.js';
import { renderMarkdownDocument } from '../output/markdown.js';
import { ensureOutputDirectories, resolveAnalyticsPath, resolveOutputPaths, writeJsonFile, writeUtf8File } from '../output/filesystem.js';
import { estimateLlmCostUsd, sumKnownCosts, type LlmCallMetrics } from './analytics.js';
import type {
  CostSource,
  ImagePromptAnalytics,
  ImageRenderAnalytics,
  PipelineRunAnalytics,
  PipelineRunResult,
  PipelineStageAnalytics,
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
}

export function createInitialStages(): StageViewModel[] {
  return [
    {
      id: 'planning',
      title: 'Planning Article',
      status: 'running',
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
  ];
}

export async function runPipelineShell(input: ResolvedRunInput, options: PipelineRunOptions = {}): Promise<PipelineRunResult> {
  const runStartedAtMs = Date.now();
  const runStartedAt = new Date(runStartedAtMs).toISOString();
  const runId = randomUUID();
  const stages: StageViewModel[] = createInitialStages();
  options.onUpdate?.(cloneStages(stages));
  const dryRun = options.dryRun ?? false;
  const runMode = options.runMode ?? 'fresh';
  const workingDir = options.workingDir ?? process.cwd();
  const outputPaths = resolveOutputPaths(input.config.settings, workingDir);
  const stageTracking = new Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>();
  stageTracking.set('planning', {
    startedAtMs: runStartedAtMs,
    endedAtMs: null,
    retries: 0,
    costs: [],
    costSources: [],
  });
  const imagePromptCalls: ImagePromptAnalytics[] = [];
  const imageRenderCalls: ImageRenderAnalytics[] = [];
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
    const replicate = dryRun ? null : new ReplicateClient(requireSecret(input.config.secrets.replicateApiToken, 'Replicate API token'));
    let plan = writeSession.plan;
    if (plan) {
      markStageCompleted(stageTracking, 'planning');
      stages[0] = {
        ...stages[0],
        status: 'succeeded',
        detail: 'Reused saved plan from .ideon/write.',
        summary: `${plan.title} • ${plan.slug} • ${plan.sections.length} sections • ${plan.inlineImages.length + 1} images`,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'planning'),
      };
    } else {
      plan = await planArticle({
        idea: input.idea,
        settings: input.config.settings,
        markdownOutputDir: writeSession.outputPaths.markdownOutputDir,
        openRouter,
        dryRun,
        onLlmMetrics(metrics) {
          recordLlmMetrics(stageTracking, 'planning', metrics);
        },
      });

      markStageCompleted(stageTracking, 'planning');

      stages[0] = {
        ...stages[0],
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
          plan,
        },
        workingDir,
      );
    }

    stages[1] = {
      ...stages[1],
      status: 'running',
      detail: 'Writing introduction.',
    };
    markStageStarted(stageTracking, 'sections');
    options.onUpdate?.(cloneStages(stages));

    let text = writeSession.text;
    if (text) {
      markStageCompleted(stageTracking, 'sections');
      stages[1] = {
        ...stages[1],
        status: 'succeeded',
        detail: 'Reused saved section drafts from .ideon/write.',
        summary: `Intro + ${text.sections.length} sections + conclusion`,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'sections'),
      };
      stages[2] = {
        ...stages[2],
        status: 'running',
        detail: 'Expanding editorial image prompts.',
      };
      markStageStarted(stageTracking, 'image-prompts');
      options.onUpdate?.(cloneStages(stages));
    } else {
      text = await writeArticleSections({
        plan,
        settings: input.config.settings,
        openRouter,
        dryRun,
        onLlmMetrics(_phase, metrics) {
          recordLlmMetrics(stageTracking, 'sections', metrics);
        },
        onSectionStart(label) {
          stages[1] = {
            ...stages[1],
            detail: label,
          };
          options.onUpdate?.(cloneStages(stages));
        },
      });

      markStageCompleted(stageTracking, 'sections');
      stages[1] = {
        ...stages[1],
        status: 'succeeded',
        detail: 'Completed intro, sections, and conclusion.',
        summary: `Intro + ${text.sections.length} sections + conclusion`,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'sections'),
      };
      stages[2] = {
        ...stages[2],
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

    const markdownPath = `${writeSession.outputPaths.markdownOutputDir}/${plan.slug}.md`;
    const articleAssetDir = path.join(writeSession.outputPaths.assetOutputDir, plan.slug);
    await mkdir(articleAssetDir, { recursive: true });
    let imagePrompts = writeSession.imagePrompts ?? writeSession.imageArtifacts?.imagePrompts ?? null;
    let imageArtifacts = writeSession.imageArtifacts;
    if (imageArtifacts) {
      // Validate that every cached image file still exists and is intact.
      // If any file is missing or suspiciously small, discard the cache and
      // let the pipeline re-render all images.
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
      stages[2] = {
        ...stages[2],
        status: 'succeeded',
        detail: 'Reused saved image prompts from .ideon/write.',
        summary: `${imagePrompts.length} prompts ready`,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'image-prompts'),
      };
      stages[3] = {
        ...stages[3],
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
          stages[2] = {
            ...stages[2],
            detail,
          };
          options.onUpdate?.(cloneStages(stages));
        },
      });

      markStageCompleted(stageTracking, 'image-prompts');
      stages[2] = {
        ...stages[2],
        status: 'succeeded',
        detail: 'Expanded image prompts successfully.',
        summary: `${imagePrompts.length} prompts ready`,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'image-prompts'),
      };
      stages[3] = {
        ...stages[3],
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

    if (imageArtifacts) {
      markStageCompleted(stageTracking, 'images');
      stages[3] = {
        ...stages[3],
        status: 'succeeded',
        detail: 'Reused previously rendered images from .ideon/write.',
        summary: articleAssetDir,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'images'),
      };
      stages[4] = {
        ...stages[4],
        status: 'running',
        detail: 'Writing Markdown frontmatter, article body, and image embeds.',
      };
      markStageStarted(stageTracking, 'output');
      options.onUpdate?.(cloneStages(stages));
    } else {
      if (!imagePrompts) {
        throw new Error('Expanded image prompts are missing for image rendering stage.');
      }

      const renderedImages = await renderExpandedImages({
        prompts: imagePrompts,
        settings: input.config.settings,
        replicate,
        markdownPath,
        assetDir: articleAssetDir,
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
          stages[3] = {
            ...stages[3],
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
      stages[3] = {
        ...stages[3],
        status: 'succeeded',
        detail: 'Rendered and stored article images.',
        summary: articleAssetDir,
        stageAnalytics: snapshotStageAnalytics(stageTracking, 'images'),
      };
      stages[4] = {
        ...stages[4],
        status: 'running',
        detail: 'Writing Markdown frontmatter, article body, and image embeds.',
      };
      markStageStarted(stageTracking, 'output');
      options.onUpdate?.(cloneStages(stages));

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

    const article = {
      plan,
      intro: text.intro,
      sections: text.sections,
      outro: text.outro,
      imagePrompts: imageArtifacts.imagePrompts,
      renderedImages: imageArtifacts.renderedImages,
    };
    await writeUtf8File(markdownPath, renderMarkdownDocument(article));

    markStageCompleted(stageTracking, 'output');
    stages[4] = {
      ...stages[4],
      status: 'succeeded',
      detail: 'Markdown file assembled successfully.',
      summary: markdownPath,
      stageAnalytics: snapshotStageAnalytics(stageTracking, 'output'),
    };
    options.onUpdate?.(cloneStages(stages));

    const analytics = buildRunAnalytics({
      runId,
      runMode,
      dryRun,
      runStartedAt,
      runStartedAtMs,
      stageTracking,
      imagePromptCalls,
      imageRenderCalls,
    });
    const analyticsPath = resolveAnalyticsPath(markdownPath);
    await writeJsonFile(analyticsPath, analytics);

    const artifact = {
      title: plan.title,
      slug: plan.slug,
      sectionCount: text.sections.length,
      imageCount: imageArtifacts.renderedImages.length,
      markdownPath,
      assetDir: writeSession.outputPaths.assetOutputDir,
      analyticsPath,
    };

    writeSession = await patchWriteSession(
      {
        status: 'completed',
        lastCompletedStage: 'output',
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

function markStageStarted(
  tracking: Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: WriteStageId,
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

function markStageCompleted(
  tracking: Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: WriteStageId,
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

function addStageRetries(
  tracking: Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: WriteStageId,
  retries: number,
): void {
  markStageStarted(tracking, stageId);
  const existing = tracking.get(stageId);
  if (!existing) {
    return;
  }

  existing.retries += retries;
}

function recordStageCost(
  tracking: Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: WriteStageId,
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

function recordLlmMetrics(
  tracking: Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: WriteStageId,
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
}: {
  runId: string;
  runMode: 'fresh' | 'resume';
  dryRun: boolean;
  runStartedAt: string;
  runStartedAtMs: number;
  stageTracking: Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>;
  imagePromptCalls: ImagePromptAnalytics[];
  imageRenderCalls: ImageRenderAnalytics[];
}): PipelineRunAnalytics {
  const runEndedAtMs = Date.now();
  const orderedStageIds: WriteStageId[] = ['planning', 'sections', 'image-prompts', 'images', 'output'];
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

function snapshotStageAnalytics(
  tracking: Map<WriteStageId, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: CostSource[] }>,
  stageId: WriteStageId,
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
  return stages.map((stage) => ({ ...stage }));
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

function asWriteStageId(stageId: string): WriteStageId | null {
  if (stageId === 'planning' || stageId === 'sections' || stageId === 'image-prompts' || stageId === 'images' || stageId === 'output') {
    return stageId;
  }

  return null;
}
