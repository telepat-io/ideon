import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import type { ResolveConfigInput, ResolvedRunInput } from '../config/resolver.js';
import type { LinkEntry } from '../types/article.js';

const resolveRunInputMock = jest.fn<(input: ResolveConfigInput) => Promise<ResolvedRunInput>>();
let mockedOutputPaths = { markdownOutputDir: '', assetOutputDir: '' };

jest.unstable_mockModule('../config/resolver.js', () => ({
  resolveRunInput: resolveRunInputMock,
}));

jest.unstable_mockModule('../output/filesystem.js', () => ({
  resolveOutputPaths: () => mockedOutputPaths,
  resolveLinksPath: (markdownPath: string) => markdownPath.replace(/\.md$/, '.links.json'),
}));

const { runOutputCommand, extractLocalImagePaths } = await import('../cli/commands/export.js');

describe('runOutputCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports article markdown with slug as filename into destination directory', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-basic-'));
    try {
      const { markdownPath, outputDir, exportDir } = await seedGeneration(tempRoot, 'my-article');
      resolveRunInputMock.mockResolvedValue(makeResolvedInput(outputDir));

      const logs: string[] = [];
      await runOutputCommand(
        { generationId: '20260418-120000-my-article', destinationPath: exportDir },
        { cwd: tempRoot, log: (msg) => logs.push(msg) },
      );

      const exported = await readFile(path.join(exportDir, 'my-article.md'), 'utf8');
      expect(exported).toContain('# My Article Title');
      expect(logs.some((msg) => msg.includes('my-article.md'))).toBe(true);

      void markdownPath;
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('injects inline links from v2 sidecar (customLinks + links) into the body', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-links-'));
    try {
      const { markdownPath, outputDir, exportDir } = await seedGeneration(tempRoot, 'links-article');
      await writeLinksSidecar(markdownPath, {
        version: 2,
        customLinks: [{ expression: 'React', url: 'https://react.dev', title: null }],
        links: [{ expression: 'TypeScript', url: 'https://www.typescriptlang.org/', title: null }],
      });

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(outputDir));

      await runOutputCommand(
        { generationId: '20260418-120000-links-article', destinationPath: exportDir },
        { cwd: tempRoot, log: () => undefined },
      );

      const exported = await readFile(path.join(exportDir, 'links-article.md'), 'utf8');
      expect(exported).toContain('[React](https://react.dev)');
      expect(exported).toContain('[TypeScript](https://www.typescriptlang.org/)');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('preserves frontmatter when injecting links', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-frontmatter-'));
    try {
      const { markdownPath, outputDir, exportDir } = await seedGeneration(tempRoot, 'fm-article');
      await writeLinksSidecar(markdownPath, {
        version: 2,
        customLinks: [],
        links: [{ expression: 'TypeScript', url: 'https://www.typescriptlang.org/', title: null }],
      });

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(outputDir));

      await runOutputCommand(
        { generationId: '20260418-120000-fm-article', destinationPath: exportDir },
        { cwd: tempRoot, log: () => undefined },
      );

      const exported = await readFile(path.join(exportDir, 'fm-article.md'), 'utf8');
      expect(exported.startsWith('---\n')).toBe(true);
      expect(exported).toContain('slug: "fm-article"');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('copies referenced local images into the export directory', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-images-'));
    try {
      const { markdownPath, outputDir, exportDir, generationDir } = await seedGeneration(
        tempRoot,
        'img-article',
        '# Img Article Title\n\nBody.\n\n![Cover](images/cover.webp)\n',
      );

      // Create the image file
      await mkdir(path.join(generationDir, 'images'), { recursive: true });
      await writeFile(path.join(generationDir, 'images', 'cover.webp'), 'fake-img', 'utf8');

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(outputDir));

      const logs: string[] = [];
      await runOutputCommand(
        { generationId: '20260418-120000-img-article', destinationPath: exportDir },
        { cwd: tempRoot, log: (msg) => logs.push(msg) },
      );

      const copiedImage = await readFile(path.join(exportDir, 'images', 'cover.webp'), 'utf8');
      expect(copiedImage).toBe('fake-img');
      expect(logs.some((msg) => msg.includes('1 image'))).toBe(true);

      void markdownPath;
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('hard fails if the destination file already exists and --overwrite is not set', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-overwrite-'));
    try {
      const { outputDir, exportDir } = await seedGeneration(tempRoot, 'exist-article');
      await mkdir(exportDir, { recursive: true });
      await writeFile(path.join(exportDir, 'exist-article.md'), 'old content', 'utf8');

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(outputDir));

      await expect(
        runOutputCommand(
          { generationId: '20260418-120000-exist-article', destinationPath: exportDir },
          { cwd: tempRoot, log: () => undefined },
        ),
      ).rejects.toThrow('already exists');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('overwrites when --overwrite is set and destination file exists', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-force-'));
    try {
      const { outputDir, exportDir } = await seedGeneration(tempRoot, 'force-article');
      await mkdir(exportDir, { recursive: true });
      await writeFile(path.join(exportDir, 'force-article.md'), 'old content', 'utf8');

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(outputDir));

      await expect(
        runOutputCommand(
          { generationId: '20260418-120000-force-article', destinationPath: exportDir, overwrite: true },
          { cwd: tempRoot, log: () => undefined },
        ),
      ).resolves.not.toThrow();

      const content = await readFile(path.join(exportDir, 'force-article.md'), 'utf8');
      expect(content).toContain('# Force Article Title');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails with a clear message when the generation id is not found', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-notfound-'));
    try {
      const { outputDir } = await seedGeneration(tempRoot, 'some-article');
      resolveRunInputMock.mockResolvedValue(makeResolvedInput(outputDir));

      await expect(
        runOutputCommand(
          { generationId: 'does-not-exist', destinationPath: path.join(tempRoot, 'export') },
          { cwd: tempRoot, log: () => undefined },
        ),
      ).rejects.toThrow('does-not-exist');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('resolves generation by slug as fallback when no exact id matches', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-slug-fallback-'));
    try {
      const { outputDir, exportDir } = await seedGeneration(tempRoot, 'slug-fallback');
      resolveRunInputMock.mockResolvedValue(makeResolvedInput(outputDir));

      // Pass just the frontmatter slug instead of the full generation id
      await runOutputCommand(
        { generationId: 'slug-fallback', destinationPath: exportDir },
        { cwd: tempRoot, log: () => undefined },
      );

      const exported = await readFile(path.join(exportDir, 'slug-fallback.md'), 'utf8');
      expect(exported).toContain('# Slug Fallback Title');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('selects the correct article variant using --index', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-index-'));
    try {
      const outputDir = path.join(tempRoot, 'output');
      const generationDir = path.join(outputDir, '20260418-120000-multi');
      const exportDir = path.join(tempRoot, 'export');
      mockedOutputPaths = { markdownOutputDir: outputDir, assetOutputDir: path.join(outputDir, 'assets') };

      await mkdir(generationDir, { recursive: true });

      // Two primary article outputs
      await writeFile(
        path.join(generationDir, 'article-1.md'),
        makeMarkdown('multi-1', 'Multi Article One'),
        'utf8',
      );
      await writeFile(
        path.join(generationDir, 'article-2.md'),
        makeMarkdown('multi-2', 'Multi Article Two'),
        'utf8',
      );

      resolveRunInputMock.mockResolvedValue(makeResolvedInput(outputDir));

      await runOutputCommand(
        { generationId: '20260418-120000-multi', destinationPath: exportDir, index: 2 },
        { cwd: tempRoot, log: () => undefined },
      );

      // Should have used article-2.md (index 2 = slug multi-2)
      const exported = await readFile(path.join(exportDir, 'multi-2.md'), 'utf8');
      expect(exported).toContain('# Multi Article Two');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('extractLocalImagePaths', () => {
  it('returns relative image paths', () => {
    const md = '# Title\n\n![Cover](images/cover.webp)\n\n![Inline](assets/photo.jpg)\n';
    expect(extractLocalImagePaths(md)).toEqual(['images/cover.webp', 'assets/photo.jpg']);
  });

  it('skips absolute URLs', () => {
    const md = '![Remote](https://example.com/img.png)';
    expect(extractLocalImagePaths(md)).toEqual([]);
  });

  it('skips absolute paths and data URIs', () => {
    const md = '![Local](/images/cover.png) ![Data](data:image/png;base64,abc)';
    expect(extractLocalImagePaths(md)).toEqual([]);
  });

  it('returns empty array when no images are present', () => {
    expect(extractLocalImagePaths('# Title\n\nBody without images.')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMarkdown(slug: string, title: string, body?: string): string {
  const titleCase = title;
  return [
    '---',
    `title: "${titleCase}"`,
    `slug: "${slug}"`,
    'description: "test description"',
    '---',
    '',
    `# ${titleCase}`,
    '',
    body ?? `Body about ${titleCase}. TypeScript and React are great.`,
    '',
  ].join('\n');
}

function makeResolvedInput(_markdownOutputDir: string): ResolvedRunInput {
  return {
    idea: 'Export test',
    targetAudienceHint: undefined,
    job: null,
    config: {
      settings: {
        ...defaultAppSettings,
      },
      secrets: {
        openRouterApiKey: null,
        replicateApiToken: null,
      },
    },
  };
}

async function seedGeneration(
  tempRoot: string,
  slug: string,
  customBody?: string,
): Promise<{ outputDir: string; generationDir: string; markdownPath: string; exportDir: string }> {
  const outputDir = path.join(tempRoot, 'output');
  const generationDir = path.join(outputDir, `20260418-120000-${slug}`);
  const markdownPath = path.join(generationDir, 'article-1.md');
  const exportDir = path.join(tempRoot, 'export');
  mockedOutputPaths = { markdownOutputDir: outputDir, assetOutputDir: path.join(outputDir, 'assets') };

  await mkdir(generationDir, { recursive: true });

  const titleWords = slug.split('-').map((w) => `${w[0]?.toUpperCase() ?? ''}${w.slice(1)}`).join(' ');
  await writeFile(markdownPath, makeMarkdown(slug, `${titleWords} Title`, customBody), 'utf8');

  return { outputDir, generationDir, markdownPath, exportDir };
}

async function writeLinksSidecar(
  markdownPath: string,
  sidecar: { version: number; customLinks: LinkEntry[]; links: LinkEntry[] },
): Promise<void> {
  const sidecarPath = markdownPath.replace(/\.md$/, '.links.json');
  await writeFile(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`, 'utf8');
}
