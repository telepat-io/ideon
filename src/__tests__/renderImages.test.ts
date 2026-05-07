import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import { buildAndRenderImages, expandImagePrompts, renderExpandedImages, buildImageSlots, MIN_IMAGE_BYTES } from '../images/renderImages.js';

const basePlan = {
  title: 'Test',
  subtitle: 'Sub',
  keywords: ['a'],
  slug: 'test',
  description: 'Desc',
  introBrief: 'Intro',
  outroBrief: 'Outro',
  sections: [],
  coverImageDescription: 'Cover scene',
  inlineImages: [
    { description: 'Inline A', anchorAfterSection: 2 },
    { description: 'Inline B', anchorAfterSection: 4 },
  ],
};

const makeSection = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ title: `S${i + 1}`, body: `Body ${i + 1}.` }));

describe('buildImageSlots', () => {
  it('includes cover + all inline images regardless of section count', () => {
    const slots = buildImageSlots(basePlan, makeSection(3));
    expect(slots).toHaveLength(3);
    expect(slots[0]?.kind).toBe('cover');
    expect(slots[1]?.kind).toBe('inline');
    expect(slots[2]?.kind).toBe('inline');
  });

  it('preserves plan anchorAfterSection values', () => {
    const slots = buildImageSlots(basePlan, makeSection(8));
    expect(slots[1]?.anchorAfterSection).toBe(2);
    expect(slots[2]?.anchorAfterSection).toBe(4);
  });

  it('clamps anchorAfterSection to section count', () => {
    const slots = buildImageSlots(basePlan, makeSection(3));
    expect(slots[1]?.anchorAfterSection).toBe(2);
    expect(slots[2]?.anchorAfterSection).toBe(3);
  });

  it('clamps anchorAfterSection to minimum 1', () => {
    const plan = { ...basePlan, inlineImages: [{ description: 'Early', anchorAfterSection: 0 }] };
    const slots = buildImageSlots(plan, makeSection(5));
    expect(slots[1]?.anchorAfterSection).toBe(1);
  });

  it('respects maxImages=1 (cover only)', () => {
    const slots = buildImageSlots(basePlan, makeSection(8), { maxImages: 1 });
    expect(slots).toHaveLength(1);
    expect(slots[0]?.kind).toBe('cover');
  });

  it('respects maxImages=2 (cover + 1 inline)', () => {
    const slots = buildImageSlots(basePlan, makeSection(8), { maxImages: 2 });
    expect(slots).toHaveLength(2);
    expect(slots[0]?.kind).toBe('cover');
    expect(slots[1]?.kind).toBe('inline');
    expect(slots[1]?.id).toBe('inline-1');
  });

  it('does not cap inline count below plan count via maxImages when not limiting', () => {
    const slots = buildImageSlots(basePlan, makeSection(8), { maxImages: 10 });
    expect(slots).toHaveLength(3);
  });
});

describe('renderExpandedImages', () => {
  it('writes image buffer returned by Limn and records interaction', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-limn-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const imageData = Buffer.alloc(MIN_IMAGE_BYTES, 42);
      const onInteraction = jest.fn();
      const limn = {
        generate: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          image: imageData,
          filename: 'cover.png',
          savedPath: '',
          mimeType: 'image/png',
          modelSlug: 'black-forest-labs/flux-schnell',
          promptUsed: 'cover prompt',
          analytics: {
            totalDurationMs: 1000,
            openrouterDurationMs: 200,
            replicateDurationMs: 800,
            openrouterUsage: null,
            openrouterCostUsd: null,
            openrouterGenerationId: null,
            replicatePredictionId: 'pred-1',
            replicateEstimatedCostUsd: 0.003,
            totalEstimatedCostUsd: 0.003,
            costSource: 'estimate-only' as const,
          },
        }),
      };

      const rendered = await renderExpandedImages({
        prompts: [
          {
            id: 'cover',
            kind: 'cover',
            prompt: 'cover prompt',
            description: 'cover description',
            anchorAfterSection: null,
          },
        ],
        settings: defaultAppSettings,
        limn: limn as never,
        markdownPath,
        assetDir,
        dryRun: false,
        onInteraction,
      });

      expect(limn.generate).toHaveBeenCalledTimes(1);
      expect(limn.generate).toHaveBeenCalledWith(
        'cover prompt',
        'flux',
        expect.objectContaining({
          aspectRatio: '16:9',
        }),
      );
      const firstCall = limn.generate.mock.calls[0] as unknown[] | undefined;
      const firstCallOptions = (firstCall?.[2] ?? {}) as Record<string, unknown>;
      expect(firstCallOptions).not.toHaveProperty('replicateModel');
      expect(rendered).toHaveLength(1);
      expect(rendered[0]?.outputPath.endsWith('.png')).toBe(true);
      expect(onInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          stageId: 'images',
          operationId: 'images:cover',
          provider: 'limn',
          status: 'succeeded',
          prompt: 'cover prompt',
        }),
      );

      const file = await readFile(rendered[0]!.outputPath);
      expect(file.byteLength).toBe(MIN_IMAGE_BYTES);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('throws when Limn returns fewer bytes than MIN_IMAGE_BYTES', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-limn-corrupt-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const tinyData = Buffer.alloc(MIN_IMAGE_BYTES - 1, 1);
      const onInteraction = jest.fn();
      const limn = {
        generate: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          image: tinyData,
          filename: 'cover.png',
          savedPath: '',
          mimeType: 'image/png',
          modelSlug: 'flux-schnell',
          promptUsed: 'cover prompt',
          analytics: { totalDurationMs: 500, openrouterDurationMs: 0, replicateDurationMs: 500, openrouterUsage: null, openrouterCostUsd: null, openrouterGenerationId: null, replicatePredictionId: 'p', replicateEstimatedCostUsd: null, totalEstimatedCostUsd: null, costSource: 'unknown' as const },
        }),
      };

      await expect(
        renderExpandedImages({
          prompts: [{ id: 'cover', kind: 'cover', prompt: 'cover prompt', description: '', anchorAfterSection: null }],
          settings: defaultAppSettings,
          limn: limn as never,
          markdownPath,
          assetDir,
          dryRun: false,
          onInteraction,
        }),
      ).rejects.toThrow('corrupted');
      expect(onInteraction).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'limn', status: 'failed' }),
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('captures dry-run interactions with limn-dry-run provider', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-limn-dryrun-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const onInteraction = jest.fn();
      await renderExpandedImages({
        prompts: [{ id: 'cover', kind: 'cover', prompt: 'dry run cover prompt', description: 'cover description', anchorAfterSection: null }],
        settings: defaultAppSettings,
        limn: null,
        markdownPath,
        assetDir,
        dryRun: true,
        onInteraction,
      });

      expect(onInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          stageId: 'images',
          operationId: 'images:cover',
          provider: 'limn-dry-run',
          status: 'succeeded',
          prompt: 'dry run cover prompt',
        }),
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('records onRenderComplete metrics from Limn analytics', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-limn-metrics-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const imageData = Buffer.alloc(MIN_IMAGE_BYTES, 7);
      const onRenderComplete = jest.fn();
      const limn = {
        generate: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          image: imageData,
          filename: 'cover.webp',
          savedPath: '',
          mimeType: 'image/webp',
          modelSlug: 'my-model',
          promptUsed: 'cover prompt',
          analytics: {
            totalDurationMs: 2500,
            openrouterDurationMs: 300,
            replicateDurationMs: 2200,
            openrouterUsage: null,
            openrouterCostUsd: null,
            openrouterGenerationId: null,
            replicatePredictionId: 'pred-2',
            replicateEstimatedCostUsd: 0.005,
            totalEstimatedCostUsd: 0.005,
            costSource: 'estimate-only' as const,
          },
        }),
      };

      await renderExpandedImages({
        prompts: [{ id: 'cover', kind: 'cover', prompt: 'cover prompt', description: '', anchorAfterSection: null }],
        settings: defaultAppSettings,
        limn: limn as never,
        markdownPath,
        assetDir,
        dryRun: false,
        onRenderComplete,
      });

      expect(onRenderComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'my-model',
          durationMs: 2500,
          outputBytes: MIN_IMAGE_BYTES,
          costUsd: 0.005,
          costSource: 'estimated',
        }),
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('uses webp extension when Limn returns image/webp', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-limn-webp-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const limn = {
        generate: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          image: Buffer.alloc(MIN_IMAGE_BYTES, 1),
          filename: 'cover.webp',
          savedPath: '',
          mimeType: 'image/webp',
          modelSlug: 'model',
          promptUsed: 'p',
          analytics: { totalDurationMs: 1, openrouterDurationMs: 0, replicateDurationMs: 1, openrouterUsage: null, openrouterCostUsd: null, openrouterGenerationId: null, replicatePredictionId: 'p', replicateEstimatedCostUsd: null, totalEstimatedCostUsd: null, costSource: 'unknown' as const },
        }),
      };

      const rendered = await renderExpandedImages({
        prompts: [{ id: 'cover', kind: 'cover', prompt: 'p', description: '', anchorAfterSection: null }],
        settings: defaultAppSettings,
        limn: limn as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      expect(rendered[0]?.outputPath.endsWith('.webp')).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('uses jpg extension when Limn returns image/jpeg', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-limn-jpeg-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const limn = {
        generate: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          image: Buffer.alloc(MIN_IMAGE_BYTES, 1),
          filename: 'cover.jpg',
          savedPath: '',
          mimeType: 'image/jpeg',
          modelSlug: 'model',
          promptUsed: 'p',
          analytics: { totalDurationMs: 1, openrouterDurationMs: 0, replicateDurationMs: 1, openrouterUsage: null, openrouterCostUsd: null, openrouterGenerationId: null, replicatePredictionId: 'p', replicateEstimatedCostUsd: null, totalEstimatedCostUsd: null, costSource: 'unknown' as const },
        }),
      };

      const rendered = await renderExpandedImages({
        prompts: [{ id: 'cover', kind: 'cover', prompt: 'p', description: '', anchorAfterSection: null }],
        settings: defaultAppSettings,
        limn: limn as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      expect(rendered[0]?.outputPath.endsWith('.jpg')).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('forwards valid replicate model override when configured', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-limn-override-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const limn = {
        generate: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          image: Buffer.alloc(MIN_IMAGE_BYTES, 1),
          filename: 'cover.png',
          savedPath: '',
          mimeType: 'image/png',
          modelSlug: 'black-forest-labs/flux-2-pro',
          promptUsed: 'p',
          analytics: {
            totalDurationMs: 1,
            openrouterDurationMs: 0,
            replicateDurationMs: 1,
            openrouterUsage: null,
            openrouterCostUsd: null,
            openrouterGenerationId: null,
            replicatePredictionId: 'p',
            replicateEstimatedCostUsd: null,
            totalEstimatedCostUsd: null,
            costSource: 'unknown' as const,
          },
        }),
      };

      await renderExpandedImages({
        prompts: [{ id: 'cover', kind: 'cover', prompt: 'p', description: '', anchorAfterSection: null }],
        settings: {
          ...defaultAppSettings,
          t2i: {
            ...defaultAppSettings.t2i,
            modelId: 'flux',
            replicateModelId: 'black-forest-labs/flux-2-pro',
          },
        },
        limn: limn as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      expect(limn.generate).toHaveBeenCalledWith(
        'p',
        'flux',
        expect.objectContaining({
          aspectRatio: '16:9',
          replicateModel: 'black-forest-labs/flux-2-pro',
        }),
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('moves Limn temporary savedPath from cwd into local .ideon session artifacts', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-limn-artifact-move-'));
    const originalCwd = process.cwd();

    try {
      process.chdir(tempRoot);
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const limnTempPath = path.join(tempRoot, 'limn_flux_temp.webp');
      await writeFile(limnTempPath, Buffer.alloc(64, 2));

      const limn = {
        generate: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          image: Buffer.alloc(MIN_IMAGE_BYTES, 8),
          filename: 'cover.webp',
          savedPath: limnTempPath,
          mimeType: 'image/webp',
          modelSlug: 'black-forest-labs/flux-schnell',
          promptUsed: 'p',
          analytics: {
            totalDurationMs: 1,
            openrouterDurationMs: 0,
            replicateDurationMs: 1,
            openrouterUsage: null,
            openrouterCostUsd: null,
            openrouterGenerationId: null,
            replicatePredictionId: 'p',
            replicateEstimatedCostUsd: null,
            totalEstimatedCostUsd: null,
            costSource: 'unknown' as const,
          },
        }),
      };

      await renderExpandedImages({
        prompts: [{ id: 'cover', kind: 'cover', prompt: 'p', description: '', anchorAfterSection: null }],
        settings: defaultAppSettings,
        limn: limn as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      await expect(readFile(limnTempPath)).rejects.toThrow();
      const sessionHash = createHash('sha256').update(path.resolve(tempRoot)).digest('hex').slice(0, 16);
      const movedPath = path.join(tempRoot, '.ideon', 'sessions', sessionHash, 'limn-artifacts', path.basename(limnTempPath));
      const movedContent = await readFile(movedPath);
      expect(movedContent.byteLength).toBe(64);
    } finally {
      process.chdir(originalCwd);
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('ignores missing savedPath artifact (ENOENT) after render succeeds', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-limn-artifact-enoent-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const missingSavedPath = path.join(tempRoot, 'does-not-exist.webp');
      const limn = {
        generate: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          image: Buffer.alloc(MIN_IMAGE_BYTES, 8),
          filename: 'cover.webp',
          savedPath: missingSavedPath,
          mimeType: 'image/webp',
          modelSlug: 'black-forest-labs/flux-schnell',
          promptUsed: 'p',
          analytics: {
            totalDurationMs: 1,
            openrouterDurationMs: 0,
            replicateDurationMs: 1,
            openrouterUsage: null,
            openrouterCostUsd: null,
            openrouterGenerationId: null,
            replicatePredictionId: 'p',
            replicateEstimatedCostUsd: null,
            totalEstimatedCostUsd: null,
            costSource: 'unknown' as const,
          },
        }),
      };

      const rendered = await renderExpandedImages({
        prompts: [{ id: 'cover', kind: 'cover', prompt: 'p', description: '', anchorAfterSection: null }],
        settings: defaultAppSettings,
        limn: limn as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      expect(rendered).toHaveLength(1);
      expect(rendered[0]?.outputPath.endsWith('.webp')).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('expands prompts in dry-run mode and reports prompt metrics', async () => {
    const onPromptComplete = jest.fn();

    const prompts = await expandImagePrompts({
      slots: [
        { id: 'cover', kind: 'cover', prompt: '', description: 'Cover scene', anchorAfterSection: null },
        { id: 'inline-1', kind: 'inline', prompt: '', description: 'Inline one', anchorAfterSection: 1 },
      ],
      planContext: { title: 'Test Title', subtitle: 'Test Subtitle', description: 'Description' },
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: true,
      onPromptComplete,
    });

    expect(prompts).toHaveLength(2);
    expect(prompts[0]?.prompt).toContain('Cover scene');
    expect(onPromptComplete).toHaveBeenCalledTimes(2);
    expect(onPromptComplete.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        attempts: 1,
        retries: 0,
        costUsd: 0,
      }),
    );
  });

  it('expands prompts using OpenRouter and aggregates prompt metrics', async () => {
    const llmMetrics = {
      durationMs: 12,
      attempts: 1,
      retries: 0,
      retryBackoffMs: 0,
      modelId: defaultAppSettings.model,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        providerTotalCostUsd: 0.01,
      },
    };

    const openRouter = {
      requestStructured: jest
        .fn<(args: { onMetrics?: (metrics: typeof llmMetrics) => void }) => Promise<{ prompt: string }>>()
        .mockImplementation(
        async ({ onMetrics }: { onMetrics?: (metrics: typeof llmMetrics) => void }) => {
          onMetrics?.(llmMetrics);
          return { prompt: 'Refined image prompt' };
        },
      ),
    };

    const onPromptComplete = jest.fn();

    const prompts = await expandImagePrompts({
      slots: [
        { id: 'cover', kind: 'cover', prompt: '', description: 'Cover scene', anchorAfterSection: null },
      ],
      planContext: { title: 'Test Title', subtitle: 'Test Subtitle', description: 'Description' },
      settings: defaultAppSettings,
      openRouter: openRouter as never,
      dryRun: false,
      onPromptComplete,
    });

    expect(openRouter.requestStructured).toHaveBeenCalledTimes(1);
    expect(prompts[0]?.prompt).toBe('Refined image prompt');
    expect(onPromptComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        costUsd: 0.01,
        costSource: 'provider',
      }),
    );
  });

  it('builds and renders image prompts end-to-end in dry-run wrapper', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-build-render-wrapper-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const result = await buildAndRenderImages({
        plan: {
          title: 'Wrapper Test',
          subtitle: 'Subtitle',
          keywords: ['a', 'b', 'c'],
          slug: 'wrapper-test',
          description: 'Description',
          introBrief: 'Intro brief',
          outroBrief: 'Outro brief',
          sections: [
            { title: 'S1', description: 'D1' },
            { title: 'S2', description: 'D2' },
            { title: 'S3', description: 'D3' },
            { title: 'S4', description: 'D4' },
          ],
          coverImageDescription: 'Cover scene',
          inlineImages: [{ description: 'Inline scene', anchorAfterSection: 2 }],
        },
        writtenSections: [
          { title: 'S1', body: 'Body one.' },
          { title: 'S2', body: 'Body two.' },
          { title: 'S3', body: 'Body three.' },
          { title: 'S4', body: 'Body four.' },
        ],
        settings: defaultAppSettings,
        openRouter: null,
        limn: null,
        markdownPath,
        assetDir,
        dryRun: true,
      });

      expect(result.imagePrompts).toHaveLength(2);
      expect(result.renderedImages).toHaveLength(2);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('uses default prompt metrics when OpenRouter does not report metrics', async () => {
    const openRouter = {
      requestStructured: jest.fn<() => Promise<{ prompt: string }>>().mockResolvedValue({ prompt: 'No metrics prompt' }),
    };
    const onPromptComplete = jest.fn();

    await expandImagePrompts({
      slots: [
        { id: 'cover', kind: 'cover', prompt: '', description: 'Cover scene', anchorAfterSection: null },
      ],
      planContext: { title: 'Metrics Default', subtitle: 'Subtitle', description: 'Description' },
      settings: defaultAppSettings,
      openRouter: openRouter as never,
      dryRun: false,
      onPromptComplete,
    });

    expect(onPromptComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMs: 0,
        attempts: 1,
        retries: 0,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
      }),
    );
  });

  it('merges multiple llm metric callbacks with null token handling', async () => {
    const openRouter = {
      requestStructured: jest
        .fn<(args: { onMetrics?: (metrics: unknown) => void }) => Promise<{ prompt: string }>>()
        .mockImplementation(
        async ({ onMetrics }: { onMetrics?: (metrics: unknown) => void }) => {
          onMetrics?.({
            durationMs: 5,
            attempts: 1,
            retries: 1,
            retryBackoffMs: 500,
            modelId: defaultAppSettings.model,
            usage: {
              promptTokens: null,
              completionTokens: 4,
              totalTokens: null,
              providerTotalCostUsd: null,
            },
          });
          onMetrics?.({
            durationMs: 7,
            attempts: 1,
            retries: 0,
            retryBackoffMs: 0,
            modelId: defaultAppSettings.model,
            usage: {
              promptTokens: 3,
              completionTokens: null,
              totalTokens: null,
              providerTotalCostUsd: null,
            },
          });
          return { prompt: 'Merged metrics prompt' };
        },
      ),
    };

    const onPromptComplete = jest.fn();
    await expandImagePrompts({
      slots: [
        { id: 'cover', kind: 'cover', prompt: '', description: 'Cover scene', anchorAfterSection: null },
      ],
      planContext: { title: 'Merge Metrics', subtitle: 'Subtitle', description: 'Description' },
      settings: defaultAppSettings,
      openRouter: openRouter as never,
      dryRun: false,
      onPromptComplete,
    });

    expect(onPromptComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMs: 12,
        attempts: 2,
        retries: 1,
        retryBackoffMs: 500,
        promptTokens: 3,
        completionTokens: 4,
        totalTokens: null,
      }),
    );
  });
});
