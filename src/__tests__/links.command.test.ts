import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import { defaultAppSettings, type AppSettings } from '../config/schema.js';
import type { ResolveConfigInput, ResolvedRunInput } from '../config/resolver.js';
import type { LinkEntry } from '../types/article.js';

const resolveRunInputMock = jest.fn<(input: ResolveConfigInput) => Promise<ResolvedRunInput>>();
const enrichLinksMock = jest.fn<typeof import('../generation/enrichLinks.js').enrichLinks>();

jest.unstable_mockModule('../config/resolver.js', () => ({
  resolveRunInput: resolveRunInputMock,
}));

jest.unstable_mockModule('../generation/enrichLinks.js', () => ({
  enrichLinks: enrichLinksMock,
}));

const { runLinksCommand } = await import('../cli/commands/links.js');

describe('runLinksCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces existing links in fresh mode', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-links-fresh-'));

    try {
      const article = await seedArticle(tempRoot, 'my-article');
      await writeLinksSidecar(article.markdownPath, [{ expression: 'old source', url: 'https://old.example', title: null }]);

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(article.markdownDir, article.assetDir));
      enrichLinksMock.mockResolvedValue([
        {
          fileId: 'article-1',
          contentType: 'article',
          markdownPath: article.markdownPath,
          links: [{ expression: 'new source', url: 'https://new.example', title: 'New' }],
        },
      ]);

      await runLinksCommand({ slug: 'my-article', mode: 'fresh' }, { cwd: tempRoot, log: () => undefined });

      const links = await readLinksSidecar(article.markdownPath);
      expect(links).toEqual({
        version: 1,
        links: [{ expression: 'new source', url: 'https://new.example', title: 'New' }],
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('appends and deduplicates links in append mode', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-links-append-'));

    try {
      const article = await seedArticle(tempRoot, 'appendable-article');
      await writeLinksSidecar(article.markdownPath, [
        { expression: 'existing source', url: 'https://existing.example', title: null },
      ]);

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(article.markdownDir, article.assetDir));
      enrichLinksMock.mockResolvedValue([
        {
          fileId: 'article-1',
          contentType: 'article',
          markdownPath: article.markdownPath,
          links: [
            { expression: 'existing source', url: 'https://existing.example', title: null },
            { expression: 'new source', url: 'https://new.example', title: 'New source' },
          ],
        },
      ]);

      await runLinksCommand({ slug: 'appendable-article', mode: 'append' }, { cwd: tempRoot, log: () => undefined });

      const links = await readLinksSidecar(article.markdownPath);
      expect(links.links).toEqual([
        { expression: 'existing source', url: 'https://existing.example', title: null },
        { expression: 'new source', url: 'https://new.example', title: 'New source' },
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('creates links sidecar in append mode when none exists', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-links-create-'));

    try {
      const article = await seedArticle(tempRoot, 'create-if-missing');

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(article.markdownDir, article.assetDir));
      enrichLinksMock.mockResolvedValue([
        {
          fileId: 'article-1',
          contentType: 'article',
          markdownPath: article.markdownPath,
          links: [{ expression: 'new source', url: 'https://new.example', title: null }],
        },
      ]);

      await runLinksCommand({ slug: 'create-if-missing', mode: 'append' }, { cwd: tempRoot, log: () => undefined });

      const links = await readLinksSidecar(article.markdownPath);
      expect(links.links).toEqual([{ expression: 'new source', url: 'https://new.example', title: null }]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails clearly when mode is invalid', async () => {
    await expect(runLinksCommand({ slug: 'my-article', mode: 'merge' })).rejects.toThrow(
      'Unsupported --mode value "merge". Use "fresh" or "append".',
    );
  });
});

function makeResolvedInput(markdownOutputDir: string, assetOutputDir: string): ResolvedRunInput {
  return {
    idea: 'Enrich links for test',
    targetAudienceHint: undefined,
    job: null,
    config: {
      settings: {
        ...defaultAppSettings,
        markdownOutputDir,
        assetOutputDir,
      },
      secrets: {
        openRouterApiKey: 'test-openrouter-key',
        replicateApiToken: null,
      },
    },
  };
}

async function seedArticle(
  tempRoot: string,
  slug: string,
): Promise<{ markdownDir: string; assetDir: string; markdownPath: string }> {
  const markdownDir = path.join(tempRoot, 'output');
  const assetDir = path.join(markdownDir, 'assets');
  const generationDir = path.join(markdownDir, `20260418-120000-${slug}`);
  const markdownPath = path.join(generationDir, 'article-1.md');

  await mkdir(generationDir, { recursive: true });
  await writeFile(
    markdownPath,
    [
      '---',
      `title: "${slug} title"`,
      `slug: "${slug}"`,
      'description: "test description"',
      '---',
      '',
      '# Heading',
      '',
      'Body paragraph.',
      '',
    ].join('\n'),
    'utf8',
  );

  return {
    markdownDir,
    assetDir,
    markdownPath,
  };
}

async function writeLinksSidecar(markdownPath: string, links: LinkEntry[]): Promise<void> {
  const sidecarPath = markdownPath.replace(/\.md$/, '.links.json');
  await writeFile(sidecarPath, `${JSON.stringify({ version: 1, links }, null, 2)}\n`, 'utf8');
}

async function readLinksSidecar(markdownPath: string): Promise<{ version: number; links: LinkEntry[] }> {
  const sidecarPath = markdownPath.replace(/\.md$/, '.links.json');
  const raw = await readFile(sidecarPath, 'utf8');
  return JSON.parse(raw) as { version: number; links: LinkEntry[] };
}
