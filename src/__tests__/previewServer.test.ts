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
        expect(html).toContain('No generated articles found in');
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
});
