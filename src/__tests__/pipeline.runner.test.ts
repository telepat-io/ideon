import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runPipelineShell, createInitialStages } from '../pipeline/runner.js';
import { defaultAppSettings, type ResolvedConfig } from '../config/schema.js';
import type { StageViewModel } from '../pipeline/events.js';
import { patchWriteSession, startFreshWriteSession } from '../pipeline/sessionStore.js';

describe('pipeline runner', () => {
  it('creates initial stages with expected order and states', () => {
    const stages = createInitialStages();

    expect(stages.map((stage) => stage.id)).toEqual(['planning', 'sections', 'image-prompts', 'images', 'output']);
    expect(stages[0]?.status).toBe('running');
    expect(stages.slice(1).every((stage) => stage.status === 'pending')).toBe(true);
  });

  it('runs full pipeline in dry-run mode and writes markdown + assets', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-test-'));
    const updates: StageViewModel[][] = [];

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      const result = await runPipelineShell(
        {
          idea: 'how editorial teams can productionize ai writing',
          job: null,
          config: {
            settings: {
              ...defaultAppSettings,
              markdownOutputDir: markdownDir,
              assetOutputDir: assetDir,
            },
            secrets: {
              openRouterApiKey: null,
              replicateApiToken: null,
            },
          },
        },
        {
          dryRun: true,
          workingDir: tempRoot,
          onUpdate(stages) {
            updates.push(stages);
          },
        },
      );

      expect(result.stages.every((stage) => stage.status === 'succeeded')).toBe(true);
      expect(result.artifact.sectionCount).toBeGreaterThanOrEqual(4);
      expect(result.artifact.imageCount).toBe(3);

      const markdown = await readFile(result.artifact.markdownPath, 'utf8');
      expect(markdown).toContain('# How Editorial Teams Can Productionize Ai Writing');
      expect(markdown).toContain('## Conclusion');
      expect(markdown).toContain('![How Editorial Teams Can Productionize Ai Writing]');

      const terminalUpdate = updates.at(-1);
      expect(terminalUpdate).toBeDefined();
      expect(terminalUpdate?.every((stage) => stage.status === 'succeeded')).toBe(true);
      expect(updates.length).toBeGreaterThanOrEqual(5);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('marks running stage failed when required secrets are missing in live mode', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-fail-test-'));
    const updates: StageViewModel[][] = [];

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      await expect(
        runPipelineShell(
          {
            idea: 'missing credentials flow',
            job: null,
            config: {
              settings: {
                ...defaultAppSettings,
                markdownOutputDir: markdownDir,
                assetOutputDir: assetDir,
              },
              secrets: {
                openRouterApiKey: null,
                replicateApiToken: null,
              },
            } satisfies ResolvedConfig,
          },
          {
            dryRun: false,
            workingDir: tempRoot,
            onUpdate(stages) {
              updates.push(stages);
            },
          },
        ),
      ).rejects.toThrow('Missing OpenRouter API key');

      const latest = updates.at(-1);
      expect(latest).toBeDefined();
      const planning = latest?.find((stage) => stage.id === 'planning');
      expect(planning?.status).toBe('failed');
      expect(planning?.detail).toContain('Missing OpenRouter API key');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('resumes from saved artifacts and skips completed stages', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-resume-test-'));
    const updates: StageViewModel[][] = [];

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      await startFreshWriteSession(
        {
          idea: 'resume checkpoint flow',
          job: null,
          settings: {
            ...defaultAppSettings,
            markdownOutputDir: markdownDir,
            assetOutputDir: assetDir,
          },
          dryRun: true,
          outputPaths: {
            markdownOutputDir: markdownDir,
            assetOutputDir: assetDir,
          },
        },
        tempRoot,
      );

      await patchWriteSession(
        {
          status: 'failed',
          lastCompletedStage: 'planning',
          failedStage: 'sections',
          errorMessage: 'simulated interruption',
          plan: {
            title: 'Resume Checkpoint Flow',
            subtitle: 'Persisted plan',
            keywords: ['resume', 'checkpoint', 'pipeline'],
            slug: 'resume-checkpoint-flow',
            description: 'Persisted plan for resume testing.',
            introBrief: 'Persist intro brief',
            outroBrief: 'Persist outro brief',
            sections: [
              { title: 'First', description: 'First section' },
              { title: 'Second', description: 'Second section' },
              { title: 'Third', description: 'Third section' },
              { title: 'Fourth', description: 'Fourth section' },
            ],
            coverImageDescription: 'Cover description',
            inlineImages: [
              { anchorAfterSection: 1, description: 'Inline one' },
              { anchorAfterSection: 3, description: 'Inline two' },
            ],
          },
        },
        tempRoot,
      );

      const result = await runPipelineShell(
        {
          idea: 'resume checkpoint flow',
          job: null,
          config: {
            settings: {
              ...defaultAppSettings,
              markdownOutputDir: markdownDir,
              assetOutputDir: assetDir,
            },
            secrets: {
              openRouterApiKey: null,
              replicateApiToken: null,
            },
          },
        },
        {
          dryRun: true,
          runMode: 'resume',
          workingDir: tempRoot,
          onUpdate(stages) {
            updates.push(stages);
          },
        },
      );

      expect(result.stages.every((stage) => stage.status === 'succeeded')).toBe(true);
      expect(result.artifact.slug).toBe('resume-checkpoint-flow');

      const planningSummarySeen = updates.some((batch) =>
        batch.some((stage) => stage.id === 'planning' && stage.detail.includes('Reused saved plan')),
      );
      expect(planningSummarySeen).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('resumes from saved image prompts without regenerating them', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-resume-prompts-test-'));
    const updates: StageViewModel[][] = [];

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      await startFreshWriteSession(
        {
          idea: 'resume with saved prompts',
          job: null,
          settings: {
            ...defaultAppSettings,
            markdownOutputDir: markdownDir,
            assetOutputDir: assetDir,
          },
          dryRun: true,
          outputPaths: {
            markdownOutputDir: markdownDir,
            assetOutputDir: assetDir,
          },
        },
        tempRoot,
      );

      await patchWriteSession(
        {
          status: 'failed',
          lastCompletedStage: 'image-prompts',
          failedStage: 'images',
          errorMessage: 'simulated interruption after prompt expansion',
          plan: {
            title: 'Resume With Saved Prompts',
            subtitle: 'Persisted prompt checkpoint',
            keywords: ['resume', 'prompts', 'checkpoint'],
            slug: 'resume-with-saved-prompts',
            description: 'Persisted image prompt checkpoint for resume testing.',
            introBrief: 'Persist intro brief',
            outroBrief: 'Persist outro brief',
            sections: [
              { title: 'First', description: 'First section' },
              { title: 'Second', description: 'Second section' },
              { title: 'Third', description: 'Third section' },
              { title: 'Fourth', description: 'Fourth section' },
            ],
            coverImageDescription: 'Cover description',
            inlineImages: [
              { anchorAfterSection: 1, description: 'Inline one' },
              { anchorAfterSection: 3, description: 'Inline two' },
            ],
          },
          text: {
            intro: 'Persisted intro',
            sections: [
              { title: 'First', body: 'First body' },
              { title: 'Second', body: 'Second body' },
              { title: 'Third', body: 'Third body' },
              { title: 'Fourth', body: 'Fourth body' },
            ],
            outro: 'Persisted outro',
          },
          imagePrompts: [
            {
              id: 'cover',
              kind: 'cover',
              prompt: 'DO-NOT-REGENERATE-COVER-PROMPT',
              description: 'Cover description',
              anchorAfterSection: null,
            },
            {
              id: 'inline-1',
              kind: 'inline',
              prompt: 'DO-NOT-REGENERATE-INLINE-1',
              description: 'Inline one',
              anchorAfterSection: 1,
            },
            {
              id: 'inline-2',
              kind: 'inline',
              prompt: 'DO-NOT-REGENERATE-INLINE-2',
              description: 'Inline two',
              anchorAfterSection: 3,
            },
          ],
          imageArtifacts: null,
        },
        tempRoot,
      );

      await runPipelineShell(
        {
          idea: 'resume with saved prompts',
          job: null,
          config: {
            settings: {
              ...defaultAppSettings,
              markdownOutputDir: markdownDir,
              assetOutputDir: assetDir,
            },
            secrets: {
              openRouterApiKey: null,
              replicateApiToken: null,
            },
          },
        },
        {
          dryRun: true,
          runMode: 'resume',
          workingDir: tempRoot,
          onUpdate(stages) {
            updates.push(stages);
          },
        },
      );

      const reusedPromptsSeen = updates.some((batch) =>
        batch.some((stage) => stage.id === 'image-prompts' && stage.detail.includes('Reused saved image prompts')),
      );
      expect(reusedPromptsSeen).toBe(true);

      const imageRenderingRan = updates.some((batch) =>
        batch.some((stage) => stage.id === 'images' && stage.detail.includes('Rendering image')),
      );
      expect(imageRenderingRan).toBe(true);

      const savedStateRaw = await readFile(path.join(tempRoot, '.ideon', 'write', 'state.json'), 'utf8');
      const savedState = JSON.parse(savedStateRaw) as {
        imageArtifacts: { imagePrompts: Array<{ id: string; prompt: string }> } | null;
      };

      const coverPrompt = savedState.imageArtifacts?.imagePrompts.find((prompt) => prompt.id === 'cover')?.prompt;
      expect(coverPrompt).toBe('DO-NOT-REGENERATE-COVER-PROMPT');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('re-renders images when resumed session has corrupted or missing image files', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-bad-assets-'));
    const updates: StageViewModel[][] = [];

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      // Bootstrap a completed session with imageArtifacts pointing to files that
      // are either missing or under MIN_IMAGE_BYTES.
      await startFreshWriteSession(
        {
          idea: 'bad assets resume flow',
          job: null,
          settings: {
            ...defaultAppSettings,
            markdownOutputDir: markdownDir,
            assetOutputDir: assetDir,
          },
          dryRun: true,
          outputPaths: { markdownOutputDir: markdownDir, assetOutputDir: assetDir },
        },
        tempRoot,
      );

      const fakePlan = {
        title: 'Bad Assets Resume Flow',
        subtitle: 'subtitle',
        keywords: ['test', 'resume', 'assets'],
        slug: 'bad-assets-resume-flow',
        description: 'desc',
        introBrief: 'intro',
        outroBrief: 'outro',
        sections: [
          { title: 'One', description: 'section one' },
          { title: 'Two', description: 'section two' },
          { title: 'Three', description: 'section three' },
          { title: 'Four', description: 'section four' },
        ],
        coverImageDescription: 'cover',
        inlineImages: [
          { anchorAfterSection: 1, description: 'inline one' },
          { anchorAfterSection: 2, description: 'inline two' },
        ],
      };

      const corruptedPath = path.join(assetDir, 'cover-1.webp');
      const missingPath = path.join(assetDir, 'inline-1-2.webp');

      // Write a tiny (corrupted) file for cover; leave inline missing entirely.
      const { mkdir: mkdirFn, writeFile: writeFileFn } = await import('node:fs/promises');
      await mkdirFn(assetDir, { recursive: true });
      await writeFileFn(corruptedPath, new Uint8Array(10));

      await patchWriteSession(
        {
          status: 'completed',
          lastCompletedStage: 'output',
          failedStage: null,
          errorMessage: null,
          plan: fakePlan,
          imageArtifacts: {
            imagePrompts: [
              { id: 'cover', kind: 'cover', prompt: 'cover prompt', description: 'cover', anchorAfterSection: null },
              { id: 'inline-1', kind: 'inline', prompt: 'inline prompt', description: 'inline one', anchorAfterSection: 1 },
              { id: 'inline-2', kind: 'inline', prompt: 'inline prompt 2', description: 'inline two', anchorAfterSection: 2 },
            ],
            renderedImages: [
              { id: 'cover', kind: 'cover', prompt: 'cover prompt', description: 'cover', anchorAfterSection: null, outputPath: corruptedPath, relativePath: 'assets/cover-1.webp' },
              { id: 'inline-1', kind: 'inline', prompt: 'inline prompt', description: 'inline one', anchorAfterSection: 1, outputPath: missingPath, relativePath: 'assets/inline-1-2.webp' },
              { id: 'inline-2', kind: 'inline', prompt: 'inline prompt 2', description: 'inline two', anchorAfterSection: 2, outputPath: missingPath + '-2', relativePath: 'assets/inline-2-3.webp' },
            ],
          },
        },
        tempRoot,
      );

      const result = await runPipelineShell(
        {
          idea: 'bad assets resume flow',
          job: null,
          config: {
            settings: {
              ...defaultAppSettings,
              markdownOutputDir: markdownDir,
              assetOutputDir: assetDir,
            },
            secrets: { openRouterApiKey: null, replicateApiToken: null },
          },
        },
        {
          dryRun: true,
          runMode: 'resume',
          workingDir: tempRoot,
          onUpdate(stages) {
            updates.push(stages);
          },
        },
      );

      // Pipeline must complete successfully and re-render the images.
      expect(result.stages.every((stage) => stage.status === 'succeeded')).toBe(true);

      // The images stage must have run (not been skipped from cache).
      const imageRenderingRan = updates.some((batch) =>
        batch.some((stage) => stage.id === 'images' && stage.detail.includes('Rendering image')),
      );
      expect(imageRenderingRan).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
