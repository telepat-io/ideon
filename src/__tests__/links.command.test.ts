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
          customLinks: [],
        },
      ]);

      await runLinksCommand({ slug: 'my-article', mode: 'fresh' }, { cwd: tempRoot, log: () => undefined });

      const links = await readLinksSidecar(article.markdownPath);
      expect(links).toEqual({
        version: 2,
        customLinks: [],
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
          customLinks: [],
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
          customLinks: [],
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

  it('adds custom links via --link and persists them to sidecar v2', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-links-custom-add-'));

    try {
      const article = await seedArticle(tempRoot, 'custom-add');

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(article.markdownDir, article.assetDir));
      enrichLinksMock.mockResolvedValue([
        {
          fileId: 'article-1',
          contentType: 'article',
          markdownPath: article.markdownPath,
          links: [{ expression: 'body paragraph', url: 'https://generated.example', title: null }],
          customLinks: [{ expression: 'React', url: 'https://react.dev', title: null }],
        },
      ]);

      await runLinksCommand(
        { slug: 'custom-add', mode: 'fresh', links: ['React->https://react.dev'] },
        { cwd: tempRoot, log: () => undefined },
      );

      const sidecar = await readLinksSidecar(article.markdownPath);
      expect(sidecar.version).toBe(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((sidecar as any).customLinks).toEqual([
        { expression: 'React', url: 'https://react.dev', title: null },
      ]);
      expect(enrichLinksMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customLinks: [{ expression: 'React', url: 'https://react.dev', title: null }],
        }),
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('removes custom links via --unlink', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-links-custom-rm-'));

    try {
      const article = await seedArticle(tempRoot, 'custom-rm');
      await writeLinksV2Sidecar(article.markdownPath, [], [
        { expression: 'React', url: 'https://react.dev', title: null },
        { expression: 'Node.js', url: 'https://nodejs.org', title: null },
      ]);

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(article.markdownDir, article.assetDir));
      enrichLinksMock.mockResolvedValue([
        {
          fileId: 'article-1',
          contentType: 'article',
          markdownPath: article.markdownPath,
          links: [],
          customLinks: [{ expression: 'Node.js', url: 'https://nodejs.org', title: null }],
        },
      ]);

      await runLinksCommand(
        { slug: 'custom-rm', mode: 'fresh', unlinks: ['React'] },
        { cwd: tempRoot, log: () => undefined },
      );

      const sidecar = await readLinksSidecar(article.markdownPath);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customLinks = (sidecar as any).customLinks as LinkEntry[];
      expect(customLinks.some((e) => e.expression === 'React')).toBe(false);
      expect(customLinks.some((e) => e.expression === 'Node.js')).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fresh mode does not remove customLinks', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-links-fresh-custom-'));

    try {
      const article = await seedArticle(tempRoot, 'fresh-custom');
      await writeLinksV2Sidecar(
        article.markdownPath,
        [{ expression: 'old generated', url: 'https://old.example', title: null }],
        [{ expression: 'React', url: 'https://react.dev', title: null }],
      );

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(article.markdownDir, article.assetDir));
      enrichLinksMock.mockResolvedValue([
        {
          fileId: 'article-1',
          contentType: 'article',
          markdownPath: article.markdownPath,
          links: [{ expression: 'new generated', url: 'https://new.example', title: null }],
          customLinks: [{ expression: 'React', url: 'https://react.dev', title: null }],
        },
      ]);

      await runLinksCommand(
        { slug: 'fresh-custom', mode: 'fresh' },
        { cwd: tempRoot, log: () => undefined },
      );

      const sidecar = await readLinksSidecar(article.markdownPath);
      expect(sidecar.links).toEqual([{ expression: 'new generated', url: 'https://new.example', title: null }]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((sidecar as any).customLinks).toEqual([
        { expression: 'React', url: 'https://react.dev', title: null },
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('passes maxLinks to enrichLinks', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-links-maxlinks-'));

    try {
      const article = await seedArticle(tempRoot, 'maxlinks-article');

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(article.markdownDir, article.assetDir));
      enrichLinksMock.mockResolvedValue([
        {
          fileId: 'article-1',
          contentType: 'article',
          markdownPath: article.markdownPath,
          links: [],
          customLinks: [],
        },
      ]);

      await runLinksCommand(
        { slug: 'maxlinks-article', mode: 'fresh', maxLinks: 3 },
        { cwd: tempRoot, log: () => undefined },
      );

      expect(enrichLinksMock).toHaveBeenCalledWith(
        expect.objectContaining({ maxLinks: 3 }),
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('reads customLinks from existing v1 sidecar as empty array', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-links-v1-compat-'));

    try {
      const article = await seedArticle(tempRoot, 'v1-compat');
      // Write a v1 sidecar with no customLinks field
      await writeLinksSidecar(article.markdownPath, [
        { expression: 'old', url: 'https://old.example', title: null },
      ]);

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(article.markdownDir, article.assetDir));
      enrichLinksMock.mockResolvedValue([
        {
          fileId: 'article-1',
          contentType: 'article',
          markdownPath: article.markdownPath,
          links: [{ expression: 'new', url: 'https://new.example', title: null }],
          customLinks: [],
        },
      ]);

      await runLinksCommand(
        { slug: 'v1-compat', mode: 'fresh' },
        { cwd: tempRoot, log: () => undefined },
      );

      // Should have passed empty customLinks (from v1 file) to enrichLinks
      expect(enrichLinksMock).toHaveBeenCalledWith(
        expect.objectContaining({ customLinks: [] }),
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('parseCustomLinkFlag', () => {
  let parseCustomLinkFlag: typeof import('../cli/commands/links.js').parseCustomLinkFlag;

  beforeAll(async () => {
    ({ parseCustomLinkFlag } = await import('../cli/commands/links.js'));
  });

  it('parses a valid expression->url pair', () => {
    const result = parseCustomLinkFlag('React->https://react.dev');
    expect(result).toEqual({ expression: 'React', url: 'https://react.dev' });
  });

  it('trims whitespace around expression and url', () => {
    const result = parseCustomLinkFlag('  Node.js  ->  https://nodejs.org  ');
    expect(result).toEqual({ expression: 'Node.js', url: 'https://nodejs.org' });
  });

  it('uses the first -> separator when url contains ->', () => {
    const result = parseCustomLinkFlag('some text->https://example.com/path->extra');
    expect(result).toEqual({ expression: 'some text', url: 'https://example.com/path->extra' });
  });

  it('throws when no -> separator present', () => {
    expect(() => parseCustomLinkFlag('no separator here')).toThrow('"expression->url"');
  });

  it('throws when expression is empty', () => {
    expect(() => parseCustomLinkFlag('->https://example.com')).toThrow('cannot be empty');
  });

  it('throws when url is empty', () => {
    expect(() => parseCustomLinkFlag('expression->')).toThrow('cannot be empty');
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

async function writeLinksV2Sidecar(markdownPath: string, links: LinkEntry[], customLinks: LinkEntry[]): Promise<void> {
  const sidecarPath = markdownPath.replace(/\.md$/, '.links.json');
  await writeFile(sidecarPath, `${JSON.stringify({ version: 2, customLinks, links }, null, 2)}\n`, 'utf8');
}

async function readLinksSidecar(markdownPath: string): Promise<{ version: number; links: LinkEntry[] }> {
  const sidecarPath = markdownPath.replace(/\.md$/, '.links.json');
  const raw = await readFile(sidecarPath, 'utf8');
  return JSON.parse(raw) as { version: number; links: LinkEntry[] };
}
