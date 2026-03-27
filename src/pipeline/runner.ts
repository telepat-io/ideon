import type { ResolvedRunInput } from '../config/resolver.js';
import { planArticle } from '../generation/planArticle.js';
import { writeArticleSections } from '../generation/writeSections.js';
import { ReplicateClient } from '../images/replicateClient.js';
import { buildAndRenderImages } from '../images/renderImages.js';
import { OpenRouterClient } from '../llm/openRouterClient.js';
import { renderMarkdownDocument } from '../output/markdown.js';
import { ensureOutputDirectories, resolveOutputPaths, writeUtf8File } from '../output/filesystem.js';
import type { PipelineRunResult, StageViewModel } from './events.js';
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
  const stages: StageViewModel[] = createInitialStages();
  options.onUpdate?.(cloneStages(stages));
  const dryRun = options.dryRun ?? false;
  const runMode = options.runMode ?? 'fresh';
  const workingDir = options.workingDir ?? process.cwd();
  const outputPaths = resolveOutputPaths(input.config.settings, workingDir);
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
      throw new Error('The last write session already completed. Start a new write with ideon write <idea>.');
    }

    writeSession = existing;
  }

  try {
    await ensureOutputDirectories(writeSession.outputPaths);
    const openRouter = dryRun ? null : new OpenRouterClient(requireSecret(input.config.secrets.openRouterApiKey, 'OpenRouter API key'));
    const replicate = dryRun ? null : new ReplicateClient(requireSecret(input.config.secrets.replicateApiToken, 'Replicate API token'));
    let plan = writeSession.plan;
    if (plan) {
      stages[0] = {
        ...stages[0],
        status: 'succeeded',
        detail: 'Reused saved plan from .ideon/write.',
        summary: `${plan.title} • ${plan.slug} • ${plan.sections.length} sections • ${plan.inlineImages.length + 1} images`,
      };
    } else {
      plan = await planArticle({
        idea: input.idea,
        settings: input.config.settings,
        markdownOutputDir: writeSession.outputPaths.markdownOutputDir,
        openRouter,
        dryRun,
      });

      stages[0] = {
        ...stages[0],
        status: 'succeeded',
        detail: 'Plan generated successfully.',
        summary: `${plan.title} • ${plan.slug} • ${plan.sections.length} sections • ${plan.inlineImages.length + 1} images`,
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
    options.onUpdate?.(cloneStages(stages));

    let text = writeSession.text;
    if (text) {
      stages[1] = {
        ...stages[1],
        status: 'succeeded',
        detail: 'Reused saved section drafts from .ideon/write.',
        summary: `Intro + ${text.sections.length} sections + conclusion`,
      };
      stages[2] = {
        ...stages[2],
        status: 'running',
        detail: 'Expanding editorial image prompts.',
      };
      options.onUpdate?.(cloneStages(stages));
    } else {
      text = await writeArticleSections({
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
    let imageArtifacts = writeSession.imageArtifacts;
    if (imageArtifacts) {
      stages[2] = {
        ...stages[2],
        status: 'succeeded',
        detail: 'Reused saved image prompts from .ideon/write.',
        summary: `${imageArtifacts.imagePrompts.length} prompts ready`,
      };
      stages[3] = {
        ...stages[3],
        status: 'succeeded',
        detail: 'Reused previously rendered images from .ideon/write.',
        summary: writeSession.outputPaths.assetOutputDir,
      };
      stages[4] = {
        ...stages[4],
        status: 'running',
        detail: 'Writing Markdown frontmatter, article body, and image embeds.',
      };
      options.onUpdate?.(cloneStages(stages));
    } else {
      imageArtifacts = await buildAndRenderImages({
        plan,
        settings: input.config.settings,
        openRouter,
        replicate,
        markdownPath,
        assetDir: writeSession.outputPaths.assetOutputDir,
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
        summary: writeSession.outputPaths.assetOutputDir,
      };
      stages[4] = {
        ...stages[4],
        status: 'running',
        detail: 'Writing Markdown frontmatter, article body, and image embeds.',
      };
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

    stages[4] = {
      ...stages[4],
      status: 'succeeded',
      detail: 'Markdown file assembled successfully.',
      summary: markdownPath,
    };
    options.onUpdate?.(cloneStages(stages));

    const artifact = {
      title: plan.title,
      slug: plan.slug,
      sectionCount: text.sections.length,
      imageCount: imageArtifacts.renderedImages.length,
      markdownPath,
      assetDir: writeSession.outputPaths.assetOutputDir,
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
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown pipeline failure';
    const failedStageId = markRunningStageFailed(stages, detail);
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
