import type { ResolvedRunInput } from '../config/resolver.js';
import { planArticle } from '../generation/planArticle.js';
import { writeArticleSections } from '../generation/writeSections.js';
import { ReplicateClient } from '../images/replicateClient.js';
import { buildAndRenderImages } from '../images/renderImages.js';
import { OpenRouterClient } from '../llm/openRouterClient.js';
import { renderMarkdownDocument } from '../output/markdown.js';
import { ensureOutputDirectories, resolveOutputPaths, writeUtf8File } from '../output/filesystem.js';
import type { PipelineRunResult, StageViewModel } from './events.js';

export interface PipelineRunOptions {
  onUpdate?: (stages: StageViewModel[]) => void;
  dryRun?: boolean;
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
  const stages: StageViewModel[] = createInitialStages();
  options.onUpdate?.(cloneStages(stages));
  const dryRun = options.dryRun ?? false;
  const outputPaths = resolveOutputPaths(input.config.settings);

  try {
    await ensureOutputDirectories(outputPaths);
    const openRouter = dryRun ? null : new OpenRouterClient(requireSecret(input.config.secrets.openRouterApiKey, 'OpenRouter API key'));
    const replicate = dryRun ? null : new ReplicateClient(requireSecret(input.config.secrets.replicateApiToken, 'Replicate API token'));

    const plan = await planArticle({
      idea: input.idea,
      settings: input.config.settings,
      markdownOutputDir: outputPaths.markdownOutputDir,
      openRouter,
      dryRun,
    });

    stages[0] = {
      ...stages[0],
      status: 'succeeded',
      detail: 'Plan generated successfully.',
      summary: `${plan.title} • ${plan.slug} • ${plan.sections.length} sections • ${plan.inlineImages.length + 1} images`,
    };
    stages[1] = {
      ...stages[1],
      status: 'running',
      detail: 'Writing introduction.',
    };
    options.onUpdate?.(cloneStages(stages));

    const text = await writeArticleSections({
      plan,
      settings: input.config.settings,
      openRouter,
      dryRun,
      onSectionStart(label) {
        stages[1] = {
          ...stages[1],
          detail: label,
        };
        options.onUpdate?.(cloneStages(stages));
      },
    });

    stages[1] = {
      ...stages[1],
      status: 'succeeded',
      detail: 'Completed intro, sections, and conclusion.',
      summary: `Intro + ${text.sections.length} sections + conclusion`,
    };
    stages[2] = {
      ...stages[2],
      status: 'running',
      detail: 'Expanding editorial image prompts.',
    };
    options.onUpdate?.(cloneStages(stages));

    const markdownPath = `${outputPaths.markdownOutputDir}/${plan.slug}.md`;
    const imageArtifacts = await buildAndRenderImages({
      plan,
      settings: input.config.settings,
      openRouter,
      replicate,
      markdownPath,
      assetDir: outputPaths.assetOutputDir,
      dryRun,
      onProgress(detail) {
        if (detail.startsWith('Expanding prompt')) {
          stages[2] = {
            ...stages[2],
            detail,
          };
        } else {
          stages[3] = {
            ...stages[3],
            status: 'running',
            detail,
          };
        }
        options.onUpdate?.(cloneStages(stages));
      },
    });

    stages[2] = {
      ...stages[2],
      status: 'succeeded',
      detail: 'Expanded image prompts successfully.',
      summary: `${imageArtifacts.imagePrompts.length} prompts ready`,
    };
    stages[3] = {
      ...stages[3],
      status: 'succeeded',
      detail: 'Rendered and stored article images.',
      summary: outputPaths.assetOutputDir,
    };
    stages[4] = {
      ...stages[4],
      status: 'running',
      detail: 'Writing Markdown frontmatter, article body, and image embeds.',
    };
    options.onUpdate?.(cloneStages(stages));

    const article = {
      plan,
      intro: text.intro,
      sections: text.sections,
      outro: text.outro,
      imagePrompts: imageArtifacts.imagePrompts,
      renderedImages: imageArtifacts.renderedImages,
    };
    await writeUtf8File(markdownPath, renderMarkdownDocument(article));

    stages[4] = {
      ...stages[4],
      status: 'succeeded',
      detail: 'Markdown file assembled successfully.',
      summary: markdownPath,
    };
    options.onUpdate?.(cloneStages(stages));

    return {
      stages,
      artifact: {
        title: plan.title,
        slug: plan.slug,
        sectionCount: text.sections.length,
        imageCount: imageArtifacts.renderedImages.length,
        markdownPath,
        assetDir: outputPaths.assetOutputDir,
      },
    };
  } catch (error) {
    markRunningStageFailed(stages, error instanceof Error ? error.message : 'Unknown pipeline failure');
    options.onUpdate?.(cloneStages(stages));
    throw error;
  }
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

function markRunningStageFailed(stages: StageViewModel[], detail: string): void {
  const runningStage = stages.find((stage) => stage.status === 'running');
  if (!runningStage) {
    return;
  }

  runningStage.status = 'failed';
  runningStage.detail = detail;
}