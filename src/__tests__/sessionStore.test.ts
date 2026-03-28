import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { defaultAppSettings } from '../config/schema.js';
import {
  loadWriteSession,
  patchWriteSession,
  saveWriteSession,
  startFreshWriteSession,
} from '../pipeline/sessionStore.js';

describe('sessionStore', () => {
  async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ideon-session-'));
    try {
      return await run(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  const seed = {
    idea: 'my idea',
    job: null,
    settings: defaultAppSettings,
    dryRun: true,
    outputPaths: {
      markdownOutputDir: '/tmp/output',
      assetOutputDir: '/tmp/output/assets',
    },
  };

  it('creates a fresh running session with nullable stage artifacts', async () => {
    await withTempDir(async (dir) => {
      const state = await startFreshWriteSession(seed, dir);

      expect(state.status).toBe('running');
      expect(state.idea).toBe('my idea');
      expect(state.lastCompletedStage).toBeNull();
      expect(state.contentBrief).toBeNull();

      const loaded = await loadWriteSession(dir);
      expect(loaded).not.toBeNull();
      expect(loaded?.status).toBe('running');
    });
  });

  it('returns null when no saved state exists', async () => {
    await withTempDir(async (dir) => {
      const loaded = await loadWriteSession(dir);
      expect(loaded).toBeNull();
    });
  });

  it('saves state and refreshes updatedAt timestamp', async () => {
    await withTempDir(async (dir) => {
      const initial = await startFreshWriteSession(seed, dir);
      const before = initial.updatedAt;

      const saved = await saveWriteSession(
        {
          ...initial,
          status: 'completed',
          lastCompletedStage: 'output',
        },
        dir,
      );

      expect(saved.status).toBe('completed');
      expect(saved.lastCompletedStage).toBe('output');
      expect(new Date(saved.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });
  });

  it('patches selected fields and allows explicit null resets', async () => {
    await withTempDir(async (dir) => {
      await startFreshWriteSession(seed, dir);

      const firstPatch = await patchWriteSession(
        {
          status: 'failed',
          failedStage: 'sections',
          errorMessage: 'boom',
          contentBrief: {
            description: 'A practical and specific brief for building reliable editorial workflows at scale.',
            targetAudience: 'Operators and content teams',
            corePromise: 'Readers leave with concrete tactics they can apply in production this week.',
            keyPoints: [
              'Start with a structured brief before drafting.',
              'Keep outputs concrete with examples and constraints.',
              'Iterate on clarity before publishing.',
            ],
            voiceNotes: 'Use clear and practical language with specific operational guidance.',
          },
        },
        dir,
      );

      expect(firstPatch.status).toBe('failed');
      expect(firstPatch.failedStage).toBe('sections');
      expect(firstPatch.errorMessage).toBe('boom');
      expect(firstPatch.contentBrief?.description).toContain('practical and specific brief');

      const secondPatch = await patchWriteSession(
        {
          status: 'running',
          failedStage: null,
          errorMessage: null,
          contentBrief: null,
        },
        dir,
      );

      expect(secondPatch.status).toBe('running');
      expect(secondPatch.failedStage).toBeNull();
      expect(secondPatch.errorMessage).toBeNull();
      expect(secondPatch.contentBrief).toBeNull();
    });
  });

  it('patches plan/text/image artifacts and preserves merged state', async () => {
    await withTempDir(async (dir) => {
      await startFreshWriteSession(seed, dir);

      const patched = await patchWriteSession(
        {
          lastCompletedStage: 'images',
          plan: {
            title: 'Generated Title',
            subtitle: 'Generated Subtitle',
            keywords: ['alpha', 'beta', 'gamma'],
            slug: 'generated-title',
            description: 'Generated description with enough detail for schema validation.',
            introBrief: 'Intro brief with enough detail for schema validation in tests.',
            outroBrief: 'Outro brief with enough detail for schema validation in tests.',
            sections: [
              { title: 'S1', description: 'Section one description with enough detail.' },
              { title: 'S2', description: 'Section two description with enough detail.' },
              { title: 'S3', description: 'Section three description with enough detail.' },
              { title: 'S4', description: 'Section four description with enough detail.' },
            ],
            coverImageDescription: 'Cover image description with enough detail.',
            inlineImages: [
              { anchorAfterSection: 1, description: 'Inline one description with enough detail.' },
              { anchorAfterSection: 2, description: 'Inline two description with enough detail.' },
            ],
          },
          text: {
            intro: 'Intro text',
            sections: [
              { title: 'S1', body: 'Body one' },
              { title: 'S2', body: 'Body two' },
            ],
            outro: 'Outro text',
          },
          imagePrompts: [
            {
              id: 'cover',
              kind: 'cover',
              prompt: 'Cover prompt',
              description: 'Cover description',
              anchorAfterSection: null,
            },
          ],
          imageArtifacts: {
            imagePrompts: [
              {
                id: 'cover',
                kind: 'cover',
                prompt: 'Cover prompt',
                description: 'Cover description',
                anchorAfterSection: null,
              },
            ],
            renderedImages: [
              {
                id: 'cover',
                kind: 'cover',
                prompt: 'Cover prompt',
                description: 'Cover description',
                anchorAfterSection: null,
                outputPath: '/tmp/output/assets/cover.webp',
                relativePath: 'assets/cover.webp',
              },
            ],
          },
          artifact: {
            title: 'Generated Title',
            slug: 'generated-title',
            sectionCount: 4,
            imageCount: 1,
            outputCount: 1,
            generationDir: '/tmp/output/generated-title',
            markdownPaths: ['/tmp/output/generated-title/article-1.md'],
            markdownPath: '/tmp/output/generated-title/article-1.md',
            assetDir: '/tmp/output/generated-title/assets',
            analyticsPath: '/tmp/output/generated-title/article-1.analytics.json',
            interactionsPath: '/tmp/output/generated-title/model.interactions.json',
          },
        },
        dir,
      );

      expect(patched.lastCompletedStage).toBe('images');
      expect(patched.plan?.slug).toBe('generated-title');
      expect(patched.text?.sections).toHaveLength(2);
      expect(patched.imagePrompts?.[0]?.id).toBe('cover');
      expect(patched.imageArtifacts?.renderedImages[0]?.relativePath).toBe('assets/cover.webp');
      expect(patched.artifact?.markdownPath).toContain('article-1.md');
    });
  });

  it('throws when patching without an active session', async () => {
    await withTempDir(async (dir) => {
      await expect(patchWriteSession({ status: 'failed' }, dir)).rejects.toThrow('No active write session found');
    });
  });

  it('throws on malformed session JSON', async () => {
    await withTempDir(async (dir) => {
      const statePath = path.join(dir, '.ideon', 'write', 'state.json');
      await mkdir(path.dirname(statePath), { recursive: true });
      await writeFile(statePath, '{invalid json', 'utf8');

      await expect(loadWriteSession(dir)).rejects.toThrow();
    });
  });
});
