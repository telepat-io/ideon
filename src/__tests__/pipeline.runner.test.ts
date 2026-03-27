import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runPipelineShell, createInitialStages } from '../pipeline/runner.js';
import { defaultAppSettings, type ResolvedConfig } from '../config/schema.js';
import type { StageViewModel } from '../pipeline/events.js';

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
});
