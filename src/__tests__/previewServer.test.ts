import { mkdtemp, mkdir, rm, writeFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startPreviewServer } from '../server/previewServer.js';

describe('preview server resilience', () => {
  it('falls back to newest remaining article when original preview file is deleted', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-fallback-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      await mkdir(assetDir, { recursive: true });

      const olderPath = path.join(markdownOutputDir, 'older.md');
      await writeFile(olderPath, '# Older Article\n\nBody\n', 'utf8');
      await new Promise((resolve) => setTimeout(resolve, 30));

      const newerPath = path.join(markdownOutputDir, 'newer.md');
      await writeFile(newerPath, '# Newer Article\n\nBody\n', 'utf8');

      const server = await startPreviewServer({
        markdownPath: olderPath,
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        await unlink(olderPath);

        const response = await fetch(`${server.url}/`);
        const html = await response.text();

        expect(response.status).toBe(200);
        expect(html).toContain("const currentSlug = 'newer';");
        expect(html).toContain('Newer Article | Ideon Preview');
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('returns 404 json when requested slug file was deleted', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-missing-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      await mkdir(assetDir, { recursive: true });

      const markdownPath = path.join(markdownOutputDir, 'gone.md');
      await writeFile(markdownPath, '# Gone Article\n\nBody\n', 'utf8');

      const server = await startPreviewServer({
        markdownPath,
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        await unlink(markdownPath);

        const response = await fetch(`${server.url}/api/articles/gone`);
        const payload = (await response.json()) as { error?: string };

        expect(response.status).toBe(404);
        expect(payload.error).toContain('no longer exists');
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('renders a friendly empty state when no markdown articles remain', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-empty-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      await mkdir(assetDir, { recursive: true });

      const markdownPath = path.join(markdownOutputDir, 'single.md');
      await writeFile(markdownPath, '# Single Article\n\nBody\n', 'utf8');

      const server = await startPreviewServer({
        markdownPath,
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        await unlink(markdownPath);

        const rootResponse = await fetch(`${server.url}/`);
        const html = await rootResponse.text();

        expect(rootResponse.status).toBe(200);
        expect(html).toContain('No generated content found in');
        expect(html).toContain("const currentSlug = '';");

        const listResponse = await fetch(`${server.url}/api/articles`);
        const listPayload = (await listResponse.json()) as Array<{ slug: string }>;
        expect(listResponse.status).toBe(200);
        expect(listPayload).toHaveLength(0);
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('groups generation outputs by content type for a single generation id', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-grouped-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      const generationDir = path.join(markdownOutputDir, '20260327-120000-sample-topic');
      await mkdir(assetDir, { recursive: true });
      await mkdir(generationDir, { recursive: true });

      await writeFile(path.join(generationDir, 'article-1.md'), '# Sample Article\n\nLongform body\n', 'utf8');
      await writeFile(path.join(generationDir, 'x-post-1.md'), '# X Variant 1\n\nShort post one\n', 'utf8');
      await writeFile(path.join(generationDir, 'x-post-2.md'), '# X Variant 2\n\nShort post two\n', 'utf8');

      const server = await startPreviewServer({
        markdownPath: path.join(generationDir, 'article-1.md'),
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        const listResponse = await fetch(`${server.url}/api/articles`);
        const listPayload = (await listResponse.json()) as Array<{ slug: string; title: string }>;
        expect(listResponse.status).toBe(200);
        expect(listPayload).toHaveLength(1);
        expect(listPayload[0]?.slug).toBe('20260327-120000-sample-topic');

        const detailResponse = await fetch(`${server.url}/api/articles/20260327-120000-sample-topic`);
        const detailPayload = (await detailResponse.json()) as {
          generationId: string;
          outputs: Array<{ contentType: string; index: number }>;
        };
        expect(detailResponse.status).toBe(200);
        expect(detailPayload.generationId).toBe('20260327-120000-sample-topic');
        expect(detailPayload.outputs).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ contentType: 'article', index: 1 }),
            expect.objectContaining({ contentType: 'x-post', index: 1 }),
            expect.objectContaining({ contentType: 'x-post', index: 2 }),
          ]),
        );
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('serves generation-local assets referenced by relative markdown paths', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-assets-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      const generationDir = path.join(markdownOutputDir, '20260327-130000-asset-test');
      await mkdir(assetDir, { recursive: true });
      await mkdir(generationDir, { recursive: true });

      await writeFile(
        path.join(generationDir, 'article-1.md'),
        '# Asset Test\n\n![Cover](article-cover.webp)\n',
        'utf8',
      );
      await writeFile(path.join(generationDir, 'article-cover.webp'), 'fake-image-content', 'utf8');

      const server = await startPreviewServer({
        markdownPath: path.join(generationDir, 'article-1.md'),
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        const listResponse = await fetch(`${server.url}/api/articles`);
        const listPayload = (await listResponse.json()) as Array<{ coverImageUrl: string | null }>;

        expect(listResponse.status).toBe(200);
        expect(listPayload[0]?.coverImageUrl).toBe(
          '/api/generations/20260327-130000-asset-test/assets/article-cover.webp',
        );

        const detailResponse = await fetch(`${server.url}/api/articles/20260327-130000-asset-test`);
        const detailPayload = (await detailResponse.json()) as {
          outputs: Array<{ htmlBody: string }>;
        };

        expect(detailResponse.status).toBe(200);
        const htmlBody = detailPayload.outputs[0]?.htmlBody ?? '';
        expect(htmlBody).toContain('/api/generations/20260327-130000-asset-test/assets/article-cover.webp');

        const assetResponse = await fetch(
          `${server.url}/api/generations/20260327-130000-asset-test/assets/article-cover.webp`,
        );
        const assetContent = await assetResponse.text();
        expect(assetResponse.status).toBe(200);
        expect(assetContent).toContain('fake-image-content');
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('exposes frontmatter slug for each generation output item', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-output-slug-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      const generationDir = path.join(markdownOutputDir, '20260327-140000-slug-test');
      await mkdir(assetDir, { recursive: true });
      await mkdir(generationDir, { recursive: true });

      await writeFile(
        path.join(generationDir, 'article-1.md'),
        ['---', 'slug: real-content-slug', '---', '# Slug Test', '', 'Body'].join('\n'),
        'utf8',
      );

      const server = await startPreviewServer({
        markdownPath: path.join(generationDir, 'article-1.md'),
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        const detailResponse = await fetch(`${server.url}/api/articles/20260327-140000-slug-test`);
        const detailPayload = (await detailResponse.json()) as {
          outputs: Array<{ slug: string }>;
        };

        expect(detailResponse.status).toBe(200);
        expect(detailPayload.outputs[0]?.slug).toBe('real-content-slug');
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('uses canonical article slug for all output content types in a generation', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-canonical-slug-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      const generationDir = path.join(markdownOutputDir, '20260327-150000-canonical-slug');
      await mkdir(assetDir, { recursive: true });
      await mkdir(generationDir, { recursive: true });

      await writeFile(
        path.join(generationDir, 'article-1.md'),
        ['---', 'slug: canonical-content-slug', '---', '# Canonical Slug Test', '', 'Body'].join('\n'),
        'utf8',
      );
      await writeFile(path.join(generationDir, 'x-post-1.md'), '# X Variant\n\nPost body', 'utf8');
      await writeFile(path.join(generationDir, 'linkedin-1.md'), '# LinkedIn Variant\n\nPost body', 'utf8');

      const server = await startPreviewServer({
        markdownPath: path.join(generationDir, 'article-1.md'),
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        const detailResponse = await fetch(`${server.url}/api/articles/20260327-150000-canonical-slug`);
        const detailPayload = (await detailResponse.json()) as {
          outputs: Array<{ contentType: string; slug: string }>;
        };

        expect(detailResponse.status).toBe(200);
        expect(detailPayload.outputs).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ contentType: 'article', slug: 'canonical-content-slug' }),
            expect.objectContaining({ contentType: 'x-post', slug: 'canonical-content-slug' }),
            expect.objectContaining({ contentType: 'linkedin-post', slug: 'canonical-content-slug' }),
          ]),
        );
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('loads interactions sidecar and exposes it in article payload', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-interactions-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      const generationDir = path.join(markdownOutputDir, '20260327-180000-interactions');
      await mkdir(assetDir, { recursive: true });
      await mkdir(generationDir, { recursive: true });

      await writeFile(path.join(generationDir, 'article-1.md'), '# Interactions Test\n\nBody\n', 'utf8');
      await writeFile(
        path.join(generationDir, 'model.interactions.json'),
        `${JSON.stringify({
          runId: 'run-1',
          runMode: 'fresh',
          dryRun: false,
          startedAt: '2026-03-27T18:00:00.000Z',
          endedAt: '2026-03-27T18:00:10.000Z',
          llmCalls: [
            {
              stageId: 'planning',
              operationId: 'planning:article-plan',
              requestType: 'structured',
              provider: 'openrouter',
              modelId: 'moonshotai/kimi-k2.5',
              startedAt: '2026-03-27T18:00:01.000Z',
              endedAt: '2026-03-27T18:00:02.000Z',
              durationMs: 1000,
              attempts: 1,
              retries: 0,
              retryBackoffMs: 0,
              status: 'succeeded',
              requestBody: '{"messages":[]}',
              responseBody: '{"choices":[{"message":{"content":"ok"}}]}',
              errorMessage: null,
            },
          ],
          t2iCalls: [
            {
              stageId: 'images',
              operationId: 'images:cover',
              provider: 'replicate',
              modelId: 'black-forest-labs/flux-schnell',
              kind: 'cover',
              startedAt: '2026-03-27T18:00:03.000Z',
              endedAt: '2026-03-27T18:00:04.000Z',
              durationMs: 1000,
              attempts: 1,
              retries: 0,
              retryBackoffMs: 0,
              status: 'succeeded',
              prompt: 'cinematic editorial cover',
              input: { prompt: 'cinematic editorial cover' },
              errorMessage: null,
            },
          ],
        })}\n`,
        'utf8',
      );

      const server = await startPreviewServer({
        markdownPath: path.join(generationDir, 'article-1.md'),
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        const response = await fetch(`${server.url}/api/articles/20260327-180000-interactions`);
        const payload = (await response.json()) as {
          interactions: {
            llmCalls: Array<{ stageId: string; requestType: string }>;
            t2iCalls: Array<{ stageId: string; prompt: string }>;
          };
        };

        expect(response.status).toBe(200);
        expect(payload.interactions.llmCalls).toHaveLength(1);
        expect(payload.interactions.llmCalls[0]).toEqual(expect.objectContaining({ stageId: 'planning', requestType: 'structured' }));
        expect(payload.interactions.t2iCalls).toHaveLength(1);
        expect(payload.interactions.t2iCalls[0]).toEqual(expect.objectContaining({ stageId: 'images', prompt: 'cinematic editorial cover' }));
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('returns empty interactions when model.interactions.json is missing', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-missing-interactions-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      const generationDir = path.join(markdownOutputDir, '20260327-190000-missing-interactions');
      await mkdir(assetDir, { recursive: true });
      await mkdir(generationDir, { recursive: true });

      await writeFile(path.join(generationDir, 'article-1.md'), '# Missing Interactions\n\nBody\n', 'utf8');

      const server = await startPreviewServer({
        markdownPath: path.join(generationDir, 'article-1.md'),
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        const response = await fetch(`${server.url}/api/articles/20260327-190000-missing-interactions`);
        const payload = (await response.json()) as {
          title: string;
          interactions: {
            llmCalls: Array<unknown>;
            t2iCalls: Array<unknown>;
          };
        };

        expect(response.status).toBe(200);
        expect(payload.title).toContain('Missing Interactions');
        expect(payload.interactions.llmCalls).toEqual([]);
        expect(payload.interactions.t2iCalls).toEqual([]);
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('renders OS-default dark mode support and persisted theme toggle controls', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-theme-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      await mkdir(assetDir, { recursive: true });

      const markdownPath = path.join(markdownOutputDir, 'theme-check.md');
      await writeFile(markdownPath, '# Theme Check\n\nBody\n', 'utf8');

      const server = await startPreviewServer({
        markdownPath,
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        const response = await fetch(`${server.url}/`);
        const html = await response.text();

        expect(response.status).toBe(200);
        expect(html).toContain("@media (prefers-color-scheme: dark)");
        expect(html).toContain("html[data-theme='light']");
        expect(html).toContain("html[data-theme='dark']");
        expect(html).toContain("const THEME_STORAGE_KEY = 'ideon-preview-theme';");
        expect(html).toContain("localStorage.getItem(storageKey)");
        expect(html).toContain('id="themeToggle"');
        expect(html).toContain("themeToggleButton.addEventListener('click'");
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('returns 400 for invalid generation asset traversal paths', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-invalid-asset-path-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      const generationDir = path.join(markdownOutputDir, '20260327-160000-invalid-asset');
      await mkdir(assetDir, { recursive: true });
      await mkdir(generationDir, { recursive: true });

      await writeFile(path.join(generationDir, 'article-1.md'), '# Invalid Asset Path\n\nBody\n', 'utf8');

      const server = await startPreviewServer({
        markdownPath: path.join(generationDir, 'article-1.md'),
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        const response = await fetch(
          `${server.url}/api/generations/20260327-160000-invalid-asset/assets/%2Fetc%2Fpasswd`,
        );
        const payload = (await response.json()) as { error: string };

        expect(response.status).toBe(400);
        expect(payload.error).toContain('Invalid generation asset path');
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('returns 404 for generation asset requests with unknown generation ids', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-missing-generation-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      const generationDir = path.join(markdownOutputDir, '20260327-170000-known-generation');
      await mkdir(assetDir, { recursive: true });
      await mkdir(generationDir, { recursive: true });

      await writeFile(path.join(generationDir, 'article-1.md'), '# Known Generation\n\nBody\n', 'utf8');

      const server = await startPreviewServer({
        markdownPath: path.join(generationDir, 'article-1.md'),
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: false,
      });

      try {
        const response = await fetch(
          `${server.url}/api/generations/missing-generation/assets/article-cover.webp`,
        );
        const payload = (await response.json()) as { error: string };

        expect(response.status).toBe(404);
        expect(payload.error).toContain('no longer exists');
      } finally {
        await server.close();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('starts with openBrowser=true and keeps preview startup best-effort', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-server-open-browser-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const assetDir = path.join(markdownOutputDir, 'assets');
      await mkdir(assetDir, { recursive: true });

      const markdownPath = path.join(markdownOutputDir, 'article.md');
      await writeFile(markdownPath, '# Browser Open Linux\n\nBody\n', 'utf8');

      const server = await startPreviewServer({
        markdownPath,
        assetDir,
        markdownOutputDir,
        port: 0,
        openBrowser: true,
      });

      await server.close();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
