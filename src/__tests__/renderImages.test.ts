import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { defaultAppSettings } from '../config/schema.js';
import { renderExpandedImages, MIN_IMAGE_BYTES } from '../images/renderImages.js';

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
});
