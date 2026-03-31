import { jest } from '@jest/globals';

const listAllGenerationsMock = jest.fn<() => Promise<Array<{
  id: string;
  title: string;
  mtime: number;
  previewSnippet: string;
  coverImageUrl: string | null;
  outputs: Array<{
    id: string;
    contentType: string;
    contentTypeLabel: string;
    index: number;
    slug: string;
    title: string;
    sourcePath: string;
  }>;
}>>>();

const deriveGenerationIdMock = jest.fn<(markdownPath: string, markdownOutputDir: string) => string>();
const stripFrontmatterMock = jest.fn<(markdown: string) => string>();
const accessMock = jest.fn<(filePath: string) => Promise<void>>();
const mkdirMock = jest.fn<(filePath: string, options?: unknown) => Promise<void>>();
const readFileMock = jest.fn<(filePath: string, encoding: string) => Promise<string>>();
const statMock = jest.fn<(filePath: string) => Promise<{ isFile: () => boolean }>>();
const writeFileMock = jest.fn<(filePath: string, data: string, encoding: string) => Promise<void>>();
const parseMock = jest.fn<(markdown: string) => Promise<string>>();
const execFileAsyncMock = jest.fn<(command: string, args: string[]) => Promise<unknown>>();

jest.unstable_mockModule('node:util', () => ({
  promisify() {
    return execFileAsyncMock;
  },
}));

jest.unstable_mockModule('node:fs/promises', () => ({
  access: accessMock,
  mkdir: mkdirMock,
  readFile: readFileMock,
  stat: statMock,
  writeFile: writeFileMock,
}));

jest.unstable_mockModule('marked', () => ({
  marked: {
    parse: parseMock,
  },
}));

jest.unstable_mockModule('../server/previewHelpers.js', () => ({
  listAllGenerations: listAllGenerationsMock,
  deriveGenerationId: deriveGenerationIdMock,
  stripFrontmatter: stripFrontmatterMock,
}));

const { startPreviewServer } = await import('../server/previewServer.js');

describe('preview server branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    deriveGenerationIdMock.mockReturnValue('gen-1');
    stripFrontmatterMock.mockImplementation((markdown) => markdown);
    accessMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
    parseMock.mockImplementation(async (markdown) => `<p>${markdown}</p>`);
    statMock.mockResolvedValue({ isFile: () => true });
    execFileAsyncMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  function createGeneration(id = 'gen-1') {
    return {
      id,
      title: 'Generation 1',
      mtime: 1,
      previewSnippet: 'snippet',
      coverImageUrl: null,
      primaryContentType: 'article',
      outputs: [
        {
          id: `${id}:article:1`,
          contentType: 'article',
          contentTypeLabel: 'Article',
          index: 1,
          slug: id,
          title: 'Generation 1',
          sourcePath: `/tmp/out/${id}/article-1.md`,
        },
      ],
    };
  }

  it('returns 500 from /api/articles when generation listing throws Error', async () => {
    listAllGenerationsMock.mockRejectedValueOnce(new Error('listing failed'));

    const server = await startPreviewServer({
      markdownPath: '/tmp/out/article-1.md',
      assetDir: '/tmp/out/assets',
      markdownOutputDir: '/tmp/out',
      port: 0,
      openBrowser: false,
    });

    try {
      const response = await fetch(`${server.url}/api/articles`);
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(500);
      expect(payload.error).toContain('listing failed');
    } finally {
      await server.close();
    }
  });

  it('returns 500 with unknown error message when listing throws non-Error', async () => {
    listAllGenerationsMock.mockRejectedValueOnce('boom');

    const server = await startPreviewServer({
      markdownPath: '/tmp/out/article-1.md',
      assetDir: '/tmp/out/assets',
      markdownOutputDir: '/tmp/out',
      port: 0,
      openBrowser: false,
    });

    try {
      const response = await fetch(`${server.url}/api/articles`);
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(500);
      expect(payload.error).toBe('Unknown error listing articles');
    } finally {
      await server.close();
    }
  });

  it('returns 500 from /api/articles/:slug when output read fails with non-missing error', async () => {
    listAllGenerationsMock.mockResolvedValueOnce([createGeneration()]);
    readFileMock.mockRejectedValueOnce(new Error('permission denied'));

    const server = await startPreviewServer({
      markdownPath: '/tmp/out/gen-1/article-1.md',
      assetDir: '/tmp/out/assets',
      markdownOutputDir: '/tmp/out',
      port: 0,
      openBrowser: false,
    });

    try {
      const response = await fetch(`${server.url}/api/articles/gen-1`);
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(500);
      expect(payload.error).toContain('permission denied');
    } finally {
      await server.close();
    }
  });

  it('returns 400 from generation asset endpoint for invalid relative asset paths', async () => {
    listAllGenerationsMock.mockResolvedValueOnce([createGeneration()]);

    const server = await startPreviewServer({
      markdownPath: '/tmp/out/gen-1/article-1.md',
      assetDir: '/tmp/out/assets',
      markdownOutputDir: '/tmp/out',
      port: 0,
      openBrowser: false,
    });

    try {
      const response = await fetch(`${server.url}/api/generations/gen-1/assets/%2Fetc%2Fpasswd`);
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(payload.error).toContain('Invalid generation asset path');
    } finally {
      await server.close();
    }
  });

  it('returns 404 from /api/articles/:slug when the generation no longer exists', async () => {
    listAllGenerationsMock.mockResolvedValueOnce([]);

    const server = await startPreviewServer({
      markdownPath: '/tmp/out/gen-1/article-1.md',
      assetDir: '/tmp/out/assets',
      markdownOutputDir: '/tmp/out',
      port: 0,
      openBrowser: false,
    });

    try {
      const response = await fetch(`${server.url}/api/articles/gen-1`);
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(payload.error).toContain('no longer exists');
    } finally {
      await server.close();
    }
  });

  it('returns 404 from the asset endpoint when the generation is missing', async () => {
    listAllGenerationsMock.mockResolvedValueOnce([]);

    const server = await startPreviewServer({
      markdownPath: '/tmp/out/gen-1/article-1.md',
      assetDir: '/tmp/out/assets',
      markdownOutputDir: '/tmp/out',
      port: 0,
      openBrowser: false,
    });

    try {
      const response = await fetch(`${server.url}/api/generations/gen-1/assets/cover.webp`);
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(payload.error).toContain('no longer exists');
    } finally {
      await server.close();
    }
  });

  it('returns unknown bootstrap errors from /api/bootstrap when the preview index cannot be resolved', async () => {
    listAllGenerationsMock.mockRejectedValueOnce('boom');

    const server = await startPreviewServer({
      markdownPath: '/tmp/out/article-1.md',
      assetDir: '/tmp/out/assets',
      markdownOutputDir: '/tmp/out',
      port: 0,
      openBrowser: false,
    });

    try {
      const response = await fetch(`${server.url}/api/bootstrap`);
      const payload = (await response.json()) as { error: string };

      expect(response.status).toBe(500);
      expect(payload.error).toBe('Unknown preview bootstrap error.');
    } finally {
      await server.close();
    }
  });

  it('renders a root failure message when bootstrap rendering fails without a preview client bundle', async () => {
    statMock.mockRejectedValue(new Error('missing build'));
    listAllGenerationsMock.mockRejectedValueOnce(new Error('bootstrap broken'));

    const server = await startPreviewServer({
      markdownPath: '/tmp/out/article-1.md',
      assetDir: '/tmp/out/assets',
      markdownOutputDir: '/tmp/out',
      port: 0,
      openBrowser: false,
    });

    try {
      const response = await fetch(`${server.url}/`);
      const payload = await response.text();

      expect(response.status).toBe(500);
      expect(payload).toContain('Failed to render preview: bootstrap broken');
    } finally {
      await server.close();
    }
  });

  it('starts successfully when browser auto-open fails', async () => {
    listAllGenerationsMock.mockResolvedValue([]);
    execFileAsyncMock.mockRejectedValueOnce(new Error('open command missing'));
    const originalJestWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;

    const server = await startPreviewServer({
      markdownPath: '/tmp/out/article-1.md',
      assetDir: '/tmp/out/assets',
      markdownOutputDir: '/tmp/out',
      port: 0,
      openBrowser: true,
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
      process.env.JEST_WORKER_ID = originalJestWorkerId;
    }
  });
});
