import type { ResolvedRunInput } from '../../config/resolver.js';
import { runPipelineShell, type PipelineRunOptions } from '../../pipeline/runner.js';
import { ReportedError } from '../reportedError.js';
import type { StageViewModel } from '../../pipeline/events.js';

function formatStage(stage: StageViewModel): string {
  const summary = stage.summary ? `\n    ${stage.summary}` : '';
  return `[${stage.status}] ${stage.title}\n    ${stage.detail}${summary}`;
}

export async function renderPlainPipeline(
  input: ResolvedRunInput,
  dryRun: boolean,
  runMode: NonNullable<PipelineRunOptions['runMode']>,
): Promise<void> {
  let previousStatuses = new Map<string, string>();

  try {
    const result = await runPipelineShell(input, {
      dryRun,
      runMode,
      onUpdate(stages) {
        for (const stage of stages) {
          const previous = previousStatuses.get(stage.id);
          if (previous !== stage.status) {
            console.log(formatStage(stage));
            previousStatuses.set(stage.id, stage.status);
          }
        }
      },
    });

    console.log('Article Ready');
    console.log(`  title: ${result.artifact.title}`);
    console.log(`  slug: ${result.artifact.slug}`);
    console.log(`  sections: ${result.artifact.sectionCount}`);
    console.log(`  images: ${result.artifact.imageCount}`);
    console.log(`  markdown: ${result.artifact.markdownPath}`);
    console.log(`  assets: ${result.artifact.assetDir}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pipeline failed.';
    console.error(`Pipeline failed: ${message}`);
    throw new ReportedError(message);
  }
}