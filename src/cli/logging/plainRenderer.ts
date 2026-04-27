import type { ResolvedRunInput } from '../../config/resolver.js';
import { runPipelineShell, type PipelineRunOptions } from '../../pipeline/runner.js';
import { ReportedError } from '../reportedError.js';
import type { PipelineStageAnalytics, StageViewModel } from '../../pipeline/events.js';
import { withWriteResumeHint } from '../commands/writeErrorHint.js';
import { notifyWriteFailed, notifyWriteStarted, notifyWriteSucceeded } from '../notifications/osNotifier.js';

function formatDuration(durationMs: number): string {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  return `${durationMs}ms`;
}

function formatStageCost(stage: StageViewModel): string {
  const analytics = stage.stageAnalytics;
  if (!analytics) {
    return 'unavailable';
  }

  const cost = formatCost(analytics.costUsd);
  return analytics.costSource === 'estimated' && analytics.costUsd !== null ? `~${cost}` : cost;
}

function formatStage(stage: StageViewModel): string {
  const summary = stage.summary ? `\n    ${stage.summary}` : '';
  const analytics = stage.status === 'succeeded' && stage.stageAnalytics
    ? `\n    analytics: ${formatDuration(stage.stageAnalytics.durationMs)} • cost: ${formatStageCost(stage)}`
    : '';
  const retryContext = formatRetryContext(stage);
  return `[${stage.status}] ${stage.title}\n    ${stage.detail}${retryContext}${summary}${analytics}`;
}

function formatRetryContext(stage: StageViewModel): string {
  if (!stage.retryCount || stage.retryCount <= 0) {
    return '';
  }

  if (stage.lastRetryError) {
    return ` • retried ${stage.retryCount}x • last error: ${stage.lastRetryError}`;
  }

  return ` • retried ${stage.retryCount}x`;
}

function formatItem(stage: StageViewModel, item: NonNullable<StageViewModel['items']>[number]): string {
  const summary = item.summary ? `\n      ${item.summary}` : '';
  const analytics = item.status === 'succeeded' && item.analytics
    ? `\n      analytics: ${formatDuration(item.analytics.durationMs)} • cost: ${formatItemCost(item)}`
    : '';
  return `  [${item.status}] ${stage.title} :: ${item.label}\n      ${item.detail}${summary}${analytics}`;
}

function formatItemCost(item: NonNullable<StageViewModel['items']>[number]): string {
  if (!item.analytics) {
    return 'unavailable';
  }

  const cost = formatCost(item.analytics.costUsd);
  return item.analytics.costSource === 'estimated' && item.analytics.costUsd !== null ? `~${cost}` : cost;
}

function formatCost(costUsd: number | null): string {
  if (costUsd === null) {
    return 'unavailable';
  }

  return `$${costUsd.toFixed(4)}`;
}

function formatPipelineStageCost(stage: PipelineStageAnalytics): string {
  const formatted = formatCost(stage.costUsd);
  if (stage.costUsd === null) {
    return formatted;
  }

  return stage.costSource === 'estimated' ? `~${formatted}` : formatted;
}

export async function renderPlainPipeline(
  input: ResolvedRunInput,
  dryRun: boolean,
  enrichLinks: boolean,
  runMode: NonNullable<PipelineRunOptions['runMode']>,
  links?: string[],
  unlinks?: string[],
  maxLinks?: number,
): Promise<void> {
  let previousStages = new Map<string, Pick<StageViewModel, 'status' | 'detail' | 'retryCount' | 'lastRetryError'>>();
  let previousItemStatuses = new Map<string, string>();
  const notificationsEnabled = input.config.settings.notifications.enabled;

  try {
    await notifyWriteStarted({
      enabled: notificationsEnabled,
      idea: input.idea,
      runMode,
    });

    const result = await runPipelineShell(input, {
      dryRun,
      enrichLinks,
      runMode,
      customLinks: links,
      unlinks,
      maxLinks,
      onUpdate(stages) {
        for (const stage of stages) {
          const previous = previousStages.get(stage.id);
          const shouldLogStage = !previous
            || previous.status !== stage.status
            || (
              stage.status === 'running'
              && (
                previous.detail !== stage.detail
                || previous.retryCount !== stage.retryCount
                || previous.lastRetryError !== stage.lastRetryError
              )
            );

          if (shouldLogStage) {
            console.log(formatStage(stage));
            previousStages.set(stage.id, {
              status: stage.status,
              detail: stage.detail,
              retryCount: stage.retryCount,
              lastRetryError: stage.lastRetryError,
            });
          }

          for (const item of stage.items ?? []) {
            const itemKey = `${stage.id}:${item.id}`;
            const previousItemStatus = previousItemStatuses.get(itemKey);
            if (previousItemStatus !== item.status) {
              console.log(formatItem(stage, item));
              previousItemStatuses.set(itemKey, item.status);
            }
          }
        }
      },
    });

    console.log('Article Ready');
    console.log(`  title: ${result.artifact.title}`);
    console.log(`  slug: ${result.artifact.slug}`);
    console.log(`  sections: ${result.artifact.sectionCount}`);
    console.log(`  images: ${result.artifact.imageCount}`);
    console.log(`  outputs: ${result.artifact.outputCount}`);
    console.log(`  generation_dir: ${result.artifact.generationDir}`);
    console.log(`  markdown: ${result.artifact.markdownPath}`);
    console.log(`  assets: ${result.artifact.assetDir}`);
    console.log(`  analytics: ${result.artifact.analyticsPath}`);
    console.log(`  duration_ms: ${result.analytics.summary.totalDurationMs}`);
    console.log(`  retries: ${result.analytics.summary.totalRetries}`);
    console.log(`  cost: ${formatCost(result.analytics.summary.totalCostUsd)}`);
    console.log('  cost_by_stage:');
    for (const stage of result.analytics.stages) {
      console.log(`    ${stage.stageId}: ${formatPipelineStageCost(stage)}`);
    }
    await notifyWriteSucceeded({
      enabled: notificationsEnabled,
      title: result.artifact.title,
      slug: result.artifact.slug,
    });
  } catch (error) {
    const message = error instanceof Error ? withWriteResumeHint(error.message) : withWriteResumeHint('Pipeline failed.');
    await notifyWriteFailed({
      enabled: notificationsEnabled,
      message,
    });
    console.error(`Pipeline failed: ${message}`);
    throw new ReportedError(message);
  }
}