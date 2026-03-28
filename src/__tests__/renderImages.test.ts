import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import { buildAndRenderImages, expandImagePrompts, renderExpandedImages, MIN_IMAGE_BYTES } from '../images/renderImages.js';

describe('renderExpandedImages', () => {
  it('writes image bytes from a FileOutput-like object with blob()', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-images-blob-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const expected = new Uint8Array(MIN_IMAGE_BYTES).fill(42); // must be >= MIN_IMAGE_BYTES
      let runModelCalls = 0;
      const replicate = {
        async runModel() {
          runModelCalls += 1;
          return {
            async blob() {
              return new Blob([expected], { type: 'image/png' });
            },
          };
        },
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
        replicate: replicate as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      expect(runModelCalls).toBe(1);
      expect(rendered).toHaveLength(1);

      const file = await readFile(rendered[0]!.outputPath);
      expect(new Uint8Array(file)).toEqual(expected);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('writes image bytes from a FileOutput-like object with url()', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-images-url-'));
    const originalFetch = global.fetch;

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const expected = new Uint8Array(MIN_IMAGE_BYTES).fill(7); // must be >= MIN_IMAGE_BYTES
      let fetchCalls = 0;
      global.fetch = (async () => {
        fetchCalls += 1;
        return new Response(expected, { status: 200 });
      }) as typeof global.fetch;

      const replicate = {
        async runModel() {
          return {
            url() {
              return 'https://replicate.delivery/example/output.png';
            },
          };
        },
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
        replicate: replicate as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      expect(fetchCalls).toBe(1);
      expect(rendered).toHaveLength(1);

      const file = await readFile(rendered[0]!.outputPath);
      expect(new Uint8Array(file)).toEqual(expected);
    } finally {
      global.fetch = originalFetch;
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('throws when Replicate returns fewer bytes than MIN_IMAGE_BYTES', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-images-corrupt-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const tinyBytes = new Uint8Array(MIN_IMAGE_BYTES - 1); // one byte under the threshold
      const replicate = {
        async runModel() {
          return {
            async blob() {
              return new Blob([tinyBytes], { type: 'image/webp' });
            },
          };
        },
      };

      await expect(
        renderExpandedImages({
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
          replicate: replicate as never,
          markdownPath,
          assetDir,
          dryRun: false,
        }),
      ).rejects.toThrow('corrupted');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('expands prompts in dry-run mode and reports prompt metrics', async () => {
    const onPromptComplete = jest.fn();

    const prompts = await expandImagePrompts({
      plan: {
        title: 'Test Title',
        subtitle: 'Test Subtitle',
        keywords: ['a', 'b', 'c'],
        slug: 'test-title',
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
        inlineImages: [
          { anchorAfterSection: 1, description: 'Inline one' },
        ],
      },
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: true,
      onPromptComplete,
    });

    expect(prompts).toHaveLength(2);
    expect(prompts[0]?.prompt).toContain('editorial illustration');
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
      plan: {
        title: 'Test Title',
        subtitle: 'Test Subtitle',
        keywords: ['a', 'b', 'c'],
        slug: 'test-title',
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
        inlineImages: [],
      },
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

  it('normalizes arraybuffer output and writes image bytes', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-images-arraybuffer-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const bytes = new Uint8Array(MIN_IMAGE_BYTES).fill(5);
      const replicate = {
        async runModel() {
          return bytes.buffer;
        },
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
        replicate: replicate as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      expect(rendered).toHaveLength(1);
      const file = await readFile(rendered[0]!.outputPath);
      expect(file.byteLength).toBe(MIN_IMAGE_BYTES);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('throws when Replicate output format is unsupported', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-images-unsupported-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const replicate = {
        async runModel() {
          return { unsupported: true };
        },
      };

      await expect(
        renderExpandedImages({
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
          replicate: replicate as never,
          markdownPath,
          assetDir,
          dryRun: false,
        }),
      ).rejects.toThrow('Unsupported Replicate output format.');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('renders bytes when Replicate returns a Uint8Array directly', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-images-u8-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const expected = new Uint8Array(MIN_IMAGE_BYTES).fill(3);
      const replicate = {
        async runModel() {
          return expected;
        },
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
        replicate: replicate as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      const bytes = await readFile(rendered[0]!.outputPath);
      expect(new Uint8Array(bytes)).toEqual(expected);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('supports url() returning a URL object', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-images-url-object-'));
    const originalFetch = global.fetch;

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const expected = new Uint8Array(MIN_IMAGE_BYTES).fill(9);
      global.fetch = (async () => new Response(expected, { status: 200 })) as typeof global.fetch;

      const replicate = {
        async runModel() {
          return {
            url() {
              return new URL('https://replicate.delivery/example/output.webp');
            },
          };
        },
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
        replicate: replicate as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      const bytes = await readFile(rendered[0]!.outputPath);
      expect(bytes.byteLength).toBe(MIN_IMAGE_BYTES);
    } finally {
      global.fetch = originalFetch;
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('throws when remote asset download fails with non-2xx status', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-images-download-fail-'));
    const originalFetch = global.fetch;

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      global.fetch = (async () => new Response('nope', { status: 404 })) as typeof global.fetch;

      const replicate = {
        async runModel() {
          return ['https://replicate.delivery/example/missing.png'];
        },
      };

      await expect(
        renderExpandedImages({
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
          replicate: replicate as never,
          markdownPath,
          assetDir,
          dryRun: false,
        }),
      ).rejects.toThrow('Failed to download generated asset');
    } finally {
      global.fetch = originalFetch;
      await rm(tempRoot, { recursive: true, force: true });
    }
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
          inlineImages: [{ anchorAfterSection: 1, description: 'Inline scene' }],
        },
        settings: defaultAppSettings,
        openRouter: null,
        replicate: null,
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
      plan: {
        title: 'Metrics Default',
        subtitle: 'Subtitle',
        keywords: ['a', 'b', 'c'],
        slug: 'metrics-default',
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
        inlineImages: [],
      },
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
      plan: {
        title: 'Merge Metrics',
        subtitle: 'Subtitle',
        keywords: ['a', 'b', 'c'],
        slug: 'merge-metrics',
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
        inlineImages: [],
      },
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

  it('uses default run metrics when replicate onMetrics is not invoked', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-default-run-metrics-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const bytes = new Uint8Array(MIN_IMAGE_BYTES).fill(4);
      const replicate = {
        async runModel() {
          return bytes;
        },
      };
      const onRenderComplete = jest.fn();

      await renderExpandedImages({
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
        replicate: replicate as never,
        markdownPath,
        assetDir,
        dryRun: false,
        onRenderComplete,
      });

      expect(onRenderComplete).toHaveBeenCalledWith(
        expect.objectContaining({ attempts: 1, retries: 0, retryBackoffMs: 0 }),
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('applies width and height for models with dimension-managed pipeline inputs', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-dimensions-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const runModel = jest.fn<() => Promise<unknown>>().mockResolvedValue(new Uint8Array(MIN_IMAGE_BYTES).fill(2));
      const settings = {
        ...defaultAppSettings,
        t2i: {
          modelId: 'prunaai/z-image-turbo',
          inputOverrides: {},
        },
      };

      await renderExpandedImages({
        prompts: [
          {
            id: 'cover',
            kind: 'cover',
            prompt: 'cover prompt',
            description: 'cover description',
            anchorAfterSection: null,
          },
        ],
        settings,
        replicate: { runModel } as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      const input = (runModel as unknown as jest.Mock).mock.calls[0]?.[1] as { width?: number; height?: number };
      expect(input.width).toBe(1536);
      expect(input.height).toBe(864);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('sets max_images default for models that define max_images', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-max-images-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const runModel = jest.fn<() => Promise<unknown>>().mockResolvedValue(new Uint8Array(MIN_IMAGE_BYTES).fill(8));
      const settings = {
        ...defaultAppSettings,
        t2i: {
          modelId: 'bytedance/seedream-4',
          inputOverrides: {},
        },
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
        settings,
        replicate: { runModel } as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      const input = (runModel as unknown as jest.Mock).mock.calls[0]?.[1] as { max_images?: number };
      expect(input.max_images).toBe(1);
      expect(rendered[0]?.outputPath.length).toBeGreaterThan(0);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('normalizes jpeg output format extension to jpg when model supports jpeg', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-jpeg-normalization-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const settings = {
        ...defaultAppSettings,
        t2i: {
          modelId: 'prunaai/z-image-turbo',
          inputOverrides: {
            output_format: 'jpeg',
          },
        },
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
        settings,
        replicate: { runModel: async () => new Uint8Array(MIN_IMAGE_BYTES).fill(8) } as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      expect(rendered[0]?.outputPath.endsWith('.jpg')).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('throws when replicate returns no image output', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-no-output-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      await expect(
        renderExpandedImages({
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
          replicate: { runModel: async () => [] } as never,
          markdownPath,
          assetDir,
          dryRun: false,
        }),
      ).rejects.toThrow('Replicate returned no image output.');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('supports object outputs with arrayBuffer() methods', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-arraybuffer-method-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const expected = new Uint8Array(MIN_IMAGE_BYTES).fill(6);
      const replicate = {
        async runModel() {
          return {
            async arrayBuffer() {
              return expected.buffer;
            },
          };
        },
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
        replicate: replicate as never,
        markdownPath,
        assetDir,
        dryRun: false,
      });

      const bytes = await readFile(rendered[0]!.outputPath);
      expect(bytes.byteLength).toBe(MIN_IMAGE_BYTES);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('returns unsupported format when blob/url/arrayBuffer methods return unusable values', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-render-unusable-methods-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      const assetDir = path.join(tempRoot, 'assets');
      await mkdir(assetDir, { recursive: true });

      const replicate = {
        async runModel() {
          return {
            async blob() {
              return { notBlob: true };
            },
            url() {
              return 42;
            },
            async arrayBuffer() {
              return { notArrayBuffer: true };
            },
          };
        },
      };

      await expect(
        renderExpandedImages({
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
          replicate: replicate as never,
          markdownPath,
          assetDir,
          dryRun: false,
        }),
      ).rejects.toThrow('Unsupported Replicate output format.');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
