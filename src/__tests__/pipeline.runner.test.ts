import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runPipelineShell, createInitialStages } from '../pipeline/runner.js';
import { defaultAppSettings, type ResolvedConfig } from '../config/schema.js';
import type { StageViewModel } from '../pipeline/events.js';
import { resolveLinksPath } from '../output/filesystem.js';
import { patchWriteSession, startFreshWriteSession } from '../pipeline/sessionStore.js';
import { MIN_IMAGE_BYTES } from '../images/renderImages.js';

describe('pipeline runner', () => {
  it('creates initial stages with expected order and states', () => {
    const stages = createInitialStages();

    expect(stages.map((stage) => stage.id)).toEqual(['shared-brief', 'planning', 'sections', 'image-prompts', 'images', 'output', 'links']);
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
      expect(result.artifact.analyticsPath).toContain('.analytics.json');
      expect(result.analytics.summary.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.analytics.stages).toHaveLength(7);
      expect(result.analytics.imagePromptCalls.length).toBeGreaterThanOrEqual(3);
      expect(result.analytics.imageRenderCalls.length).toBeGreaterThanOrEqual(3);

      const markdown = await readFile(result.artifact.markdownPath, 'utf8');
      const analyticsRaw = await readFile(result.artifact.analyticsPath, 'utf8');
      const analytics = JSON.parse(analyticsRaw) as {
        runId: string;
        stages: Array<{ stageId: string; durationMs: number }>;
      };
      expect(markdown).toContain('# How Editorial Teams Can Productionize Ai Writing');
      expect(markdown).toContain('## Conclusion');
      expect(markdown).toContain('![How Editorial Teams Can Productionize Ai Writing]');
      expect(analytics.runId.length).toBeGreaterThan(0);
      expect(analytics.stages.map((stage) => stage.stageId)).toEqual(['shared-brief', 'planning', 'sections', 'image-prompts', 'images', 'output', 'links']);
      expect(analytics.stages.every((stage) => stage.durationMs >= 0)).toBe(true);

      const terminalUpdate = updates.at(-1);
      expect(terminalUpdate).toBeDefined();
      expect(terminalUpdate?.every((stage) => stage.status === 'succeeded')).toBe(true);
      expect(terminalUpdate?.every((stage) => stage.stageAnalytics !== undefined)).toBe(true);
      expect(terminalUpdate?.every((stage) => (stage.stageAnalytics?.durationMs ?? -1) >= 0)).toBe(true);

      const linksUpdates = updates
        .map((snapshot) => snapshot.find((stage) => stage.id === 'links'))
        .filter((stage): stage is StageViewModel => Boolean(stage));
      expect(linksUpdates.some((stage) => (stage.items ?? []).some((item) => item.status === 'running' && item.detail === 'Selecting expressions.'))).toBe(true);
      expect(linksUpdates.some((stage) => (stage.items ?? []).some((item) => item.status === 'running' && item.detail === 'Dry run: skipped URL resolution.'))).toBe(true);

      expect(updates.length).toBeGreaterThanOrEqual(5);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('writes multiple outputs into one generation directory with shared assets', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-multi-output-'));
    const updates: StageViewModel[][] = [];

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      const result = await runPipelineShell(
        {
          idea: 'multi target generation test',
          job: null,
          config: {
            settings: {
              ...defaultAppSettings,
              markdownOutputDir: markdownDir,
              assetOutputDir: assetDir,
              contentTargets: [
                { contentType: 'article', count: 1 },
                { contentType: 'x-thread', count: 1 },
                { contentType: 'x-post', count: 1 },
              ],
              style: 'professional',
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

      expect(result.artifact.outputCount).toBe(3);
      expect(result.artifact.markdownPaths).toHaveLength(3);
      expect(result.analytics.outputItemCalls).toHaveLength(3);
      expect(result.analytics.outputItemCalls.every((item) => item.durationMs >= 0)).toBe(true);

      const fileNames = result.artifact.markdownPaths.map((filePath) => path.basename(filePath)).sort();
      expect(fileNames).toEqual(['article-1.md', 'x-post-1.md', 'x-thread-1.md']);

      const xThreadMarkdownPaths = result.artifact.markdownPaths.filter((filePath) => path.basename(filePath).startsWith('x-thread-'));
      expect(xThreadMarkdownPaths).toHaveLength(1);

      const xPostMarkdownPaths = result.artifact.markdownPaths.filter((filePath) => path.basename(filePath).startsWith('x-post-'));
      expect(xPostMarkdownPaths).toHaveLength(1);

      const outputUpdates = updates
        .map((snapshot) => snapshot.find((stage) => stage.id === 'output'))
        .filter((stage): stage is StageViewModel => Boolean(stage));
      expect(outputUpdates.some((stage) => (stage.items ?? []).some((item) => item.status === 'running'))).toBe(true);
      expect(outputUpdates.some((stage) => (stage.items ?? []).some((item) => item.status === 'succeeded'))).toBe(true);

      const xContents = await Promise.all(result.artifact.markdownPaths
        .filter((filePath) => path.basename(filePath).startsWith('x-'))
        .map(async (filePath) => readFile(filePath, 'utf8')));
      for (const content of xContents) {
        expect(content).toContain('Anchored to generated article context from this run.');
      }

      const generationEntries = await readdir(result.artifact.generationDir);
      expect(generationEntries.some((entry) => entry.endsWith('.md'))).toBe(true);
      expect(generationEntries.some((entry) => entry.endsWith('.jpg') || entry.endsWith('.png') || entry.endsWith('.webp'))).toBe(true);
      expect(generationEntries).toContain('job.json');

      const jobRaw = await readFile(path.join(result.artifact.generationDir, 'job.json'), 'utf8');
      const job = JSON.parse(jobRaw) as {
        prompt: string;
        contentTargets: Array<{ contentType: string; count: number }>;
        style: string;
        settings: {
          markdownOutputDir: string;
          assetOutputDir: string;
        };
      };
      expect(job.prompt).toBe('multi target generation test');
      expect(job.contentTargets).toEqual([
        { contentType: 'article', count: 1 },
        { contentType: 'x-thread', count: 1 },
        { contentType: 'x-post', count: 1 },
      ]);
      expect(job.style).toBe('professional');
      expect(job.settings.markdownOutputDir).toBe(markdownDir);
      expect(job.settings.assetOutputDir).toBe(assetDir);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('skips article section flow when article target is absent', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-non-article-only-'));
    const updates: StageViewModel[][] = [];

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      const result = await runPipelineShell(
        {
          idea: 'launch update for workflow automation',
          job: null,
          config: {
            settings: {
              ...defaultAppSettings,
              markdownOutputDir: markdownDir,
              assetOutputDir: assetDir,
              contentTargets: [
                { contentType: 'x-thread', count: 2 },
                { contentType: 'linkedin-post', count: 1 },
              ],
              style: 'professional',
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

      expect(result.artifact.outputCount).toBe(3);
      expect(result.artifact.imageCount).toBe(0);
      expect(result.artifact.sectionCount).toBe(0);
      expect(result.analytics.outputItemCalls).toHaveLength(3);

      const planningStage = result.stages.find((stage) => stage.id === 'planning');
      expect(planningStage?.detail).toContain('Skipped article planning');

      const sharedBriefStage = result.stages.find((stage) => stage.id === 'shared-brief');
      expect(sharedBriefStage?.detail).toContain('Shared brief generated successfully');

      const firstOutput = await readFile(result.artifact.markdownPaths[0]!, 'utf8');
      expect(firstOutput).toContain('dry-run placeholder for single-prompt channel generation');

      const outputStageSnapshots = updates
        .map((snapshot) => snapshot.find((stage) => stage.id === 'output'))
        .filter((stage): stage is StageViewModel => Boolean(stage));
      expect(outputStageSnapshots.some((stage) => (stage.items ?? []).length === 3)).toBe(true);
      expect(outputStageSnapshots.some((stage) => (stage.items ?? []).every((item) => item.status !== 'pending'))).toBe(true);
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
      const sharedBrief = latest?.find((stage) => stage.id === 'shared-brief');
      expect(sharedBrief?.status).toBe('failed');
      expect(sharedBrief?.detail).toContain('Missing OpenRouter API key');
      expect(sharedBrief?.stageAnalytics).toBeUndefined();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('skips the links stage when enrichLinks is disabled', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-no-links-'));

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      const result = await runPipelineShell(
        {
          idea: 'skip editorial links',
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
          enrichLinks: false,
          workingDir: tempRoot,
        },
      );

      const linksStage = result.stages.find((stage) => stage.id === 'links');
      expect(linksStage?.status).toBe('succeeded');
      expect(linksStage?.detail).toContain('Skipped link enrichment (--no-enrich-links).');
      expect(linksStage?.summary).toBe('Link enrichment disabled for this run');
      expect(result.analytics.linkEnrichmentCalls).toEqual([]);

      await expect(readFile(resolveLinksPath(result.artifact.markdownPath), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('skips the links stage when all outputs are short-form', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-short-links-'));

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      const result = await runPipelineShell(
        {
          idea: 'short form only run',
          job: null,
          config: {
            settings: {
              ...defaultAppSettings,
              markdownOutputDir: markdownDir,
              assetOutputDir: assetDir,
              contentTargets: [
                { contentType: 'x-post', count: 1 },
                { contentType: 'x-thread', count: 1 },
              ],
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
        },
      );

      const linksStage = result.stages.find((stage) => stage.id === 'links');
      expect(linksStage?.status).toBe('succeeded');
      expect(linksStage?.detail).toContain('Skipped link enrichment (no eligible outputs).');
      expect(linksStage?.summary).toBe('No long-form outputs to enrich');
      expect(result.analytics.linkEnrichmentCalls).toEqual([]);
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
      expect(result.stages.every((stage) => stage.stageAnalytics !== undefined)).toBe(true);
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
      expect(result.stages.every((stage) => stage.stageAnalytics !== undefined)).toBe(true);

      // The images stage must have run (not been skipped from cache).
      const imageRenderingRan = updates.some((batch) =>
        batch.some((stage) => stage.id === 'images' && stage.detail.includes('Rendering image')),
      );
      expect(imageRenderingRan).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails fast when resume is requested without an existing session', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-no-resume-session-'));

    try {
      await expect(
        runPipelineShell(
          {
            idea: 'resume without prior session',
            job: null,
            config: {
              settings: {
                ...defaultAppSettings,
                markdownOutputDir: path.join(tempRoot, 'out'),
                assetOutputDir: path.join(tempRoot, 'out', 'assets'),
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
          },
        ),
      ).rejects.toThrow('No resumable write session found');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('resumes from a completed session and reuses shared brief, plan, text, and image artifacts', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-completed-resume-'));

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');
      const generationDir = path.join(markdownDir, 'existing-generation');
      await mkdir(generationDir, { recursive: true });

      const fakeImagePath = path.join(generationDir, 'cover-1.webp');
      await writeFile(fakeImagePath, new Uint8Array(MIN_IMAGE_BYTES).fill(7));

      await startFreshWriteSession(
        {
          idea: 'completed session reuse flow',
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
          status: 'completed',
          lastCompletedStage: 'output',
          failedStage: null,
          errorMessage: null,
          contentBrief: {
            description: 'Persisted shared brief for resume reuse testing.',
            targetAudience: 'Content operators',
            corePromise: 'Resume should reuse persisted artifacts safely.',
            keyPoints: ['Reuse shared brief.', 'Reuse plan.', 'Reuse section drafts.'],
            voiceNotes: 'Direct and practical.',
          },
          plan: {
            title: 'Completed Session Reuse Flow',
            subtitle: 'Resume should skip heavy stages',
            keywords: ['resume', 'reuse', 'pipeline'],
            slug: 'completed-session-reuse-flow',
            description: 'Persisted plan',
            introBrief: 'Intro brief',
            outroBrief: 'Outro brief',
            sections: [
              { title: 'First', description: 'First section' },
              { title: 'Second', description: 'Second section' },
              { title: 'Third', description: 'Third section' },
              { title: 'Fourth', description: 'Fourth section' },
            ],
            coverImageDescription: 'Cover description',
            inlineImages: [
              { anchorAfterSection: 1, description: 'Inline one' },
              { anchorAfterSection: 2, description: 'Inline two' },
            ],
          },
          text: {
            intro: 'Persisted intro',
            sections: [
              { title: 'First', body: 'Persisted body one' },
              { title: 'Second', body: 'Persisted body two' },
              { title: 'Third', body: 'Persisted body three' },
              { title: 'Fourth', body: 'Persisted body four' },
            ],
            outro: 'Persisted outro',
          },
          imagePrompts: [
            {
              id: 'cover',
              kind: 'cover',
              prompt: 'Persisted cover prompt',
              description: 'Cover description',
              anchorAfterSection: null,
            },
          ],
          imageArtifacts: {
            imagePrompts: [
              {
                id: 'cover',
                kind: 'cover',
                prompt: 'Persisted cover prompt',
                description: 'Cover description',
                anchorAfterSection: null,
              },
            ],
            renderedImages: [
              {
                id: 'cover',
                kind: 'cover',
                prompt: 'Persisted cover prompt',
                description: 'Cover description',
                anchorAfterSection: null,
                outputPath: fakeImagePath,
                relativePath: 'cover-1.webp',
              },
            ],
          },
          links: [
            {
              fileId: 'article-1',
              contentType: 'article',
              markdownPath: '/stale/article-1.md',
              links: [
                {
                  expression: 'OpenRouter',
                  url: 'https://openrouter.ai/',
                  title: 'OpenRouter',
                },
              ],
            },
          ],
        },
        tempRoot,
      );

      const result = await runPipelineShell(
        {
          idea: 'completed session reuse flow',
          job: null,
          config: {
            settings: {
              ...defaultAppSettings,
              markdownOutputDir: markdownDir,
              assetOutputDir: assetDir,
              contentTargets: [
                { contentType: 'article', count: 1 },
                { contentType: 'blog-post', count: 1 },
                { contentType: 'reddit-post', count: 1 },
                { contentType: 'newsletter', count: 1 },
                { contentType: 'landing-page-copy', count: 1 },
              ],
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
        },
      );

      expect(result.stages.every((stage) => stage.status === 'succeeded')).toBe(true);
      const files = result.artifact.markdownPaths.map((filePath) => path.basename(filePath)).sort();
      expect(files).toEqual(['article-1.md', 'blog-1.md', 'landing-1.md', 'newsletter-1.md', 'reddit-1.md']);

      const planningStage = result.stages.find((stage) => stage.id === 'planning');
      const sectionsStage = result.stages.find((stage) => stage.id === 'sections');
      const imagesStage = result.stages.find((stage) => stage.id === 'images');
      const linksStage = result.stages.find((stage) => stage.id === 'links');
      expect(planningStage?.detail).toContain('Reused saved plan');
      expect(sectionsStage?.detail).toContain('Reused saved section drafts');
      expect(imagesStage?.detail).toContain('Reused previously rendered images');
      expect(linksStage?.detail).toContain('Reused saved link metadata');
      expect(linksStage?.summary).toBe('1 links');

      const articleLinksPath = resolveLinksPath(result.artifact.markdownPaths.find((filePath) => path.basename(filePath) === 'article-1.md')!);
      const articleLinksRaw = await readFile(articleLinksPath, 'utf8');
      const articleLinks = JSON.parse(articleLinksRaw) as {
        version: number;
        links: Array<{ expression: string; url: string; title: string | null }>;
      };
      expect(articleLinks.version).toBe(1);
      expect(articleLinks.links).toEqual([
        {
          expression: 'OpenRouter',
          url: 'https://openrouter.ai/',
          title: 'OpenRouter',
        },
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('uses fallback title and slug when idea is blank and there is no article target', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pipeline-blank-idea-'));

    try {
      const markdownDir = path.join(tempRoot, 'out');
      const assetDir = path.join(markdownDir, 'assets');

      const result = await runPipelineShell(
        {
          idea: '   ',
          job: null,
          config: {
            settings: {
              ...defaultAppSettings,
              markdownOutputDir: markdownDir,
              assetOutputDir: assetDir,
              contentTargets: [{ contentType: 'x-post', count: 1 }],
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
        },
      );

      expect(result.artifact.slug).toBe('generated-content');
      expect(result.artifact.title).toBe('Generated Content Batch');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
