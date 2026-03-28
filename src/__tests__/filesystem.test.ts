import { access, mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildGenerationDirectoryName,
  ensureOutputDirectories,
  listMarkdownFilesRecursively,
  relativeAssetPath,
  resolveAnalyticsPath,
  resolveOutputPaths,
  resolveUniqueSlug,
  writeJsonFile,
  writeUtf8File,
} from '../output/filesystem.js';
import { defaultAppSettings } from '../config/schema.js';

describe('output filesystem helpers', () => {
  it('resolves output paths for special /output mapping and relative paths', () => {
    const fromOutputShortcut = resolveOutputPaths(defaultAppSettings, '/project');
    expect(fromOutputShortcut).toEqual({
      markdownOutputDir: '/project/output',
      assetOutputDir: '/project/output/assets',
    });

    const relativeSettings = {
      ...defaultAppSettings,
      markdownOutputDir: './docs/out',
      assetOutputDir: './docs/out/assets',
    };
    const fromRelative = resolveOutputPaths(relativeSettings, '/project');

    expect(fromRelative).toEqual({
      markdownOutputDir: '/project/docs/out',
      assetOutputDir: '/project/docs/out/assets',
    });
  });

  it('creates both output directories', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-output-dirs-'));

    try {
      const paths = {
        markdownOutputDir: path.join(tempRoot, 'markdown'),
        assetOutputDir: path.join(tempRoot, 'assets'),
      };

      await ensureOutputDirectories(paths);

      await expect(access(paths.markdownOutputDir)).resolves.toBeUndefined();
      await expect(access(paths.assetOutputDir)).resolves.toBeUndefined();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('finds unique slugs when markdown collisions exist', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-slug-'));

    try {
      await writeFile(path.join(tempRoot, 'guide.md'), '# guide', 'utf8');
      await writeFile(path.join(tempRoot, 'guide-1.md'), '# guide 1', 'utf8');

      const result = await resolveUniqueSlug(tempRoot, 'guide');
      expect(result).toBe('guide-2');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('formats generation directory names using UTC timestamp padding', () => {
    const now = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));

    const result = buildGenerationDirectoryName('slug-name', now);
    expect(result).toBe('20260102-030405-slug-name');
  });

  it('lists markdown files recursively and ignores non-markdown files', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-markdown-list-'));

    try {
      const nested = path.join(tempRoot, 'nested', 'inner');
      await mkdir(nested, { recursive: true });
      await writeFile(path.join(tempRoot, 'a.md'), '# a', 'utf8');
      await writeFile(path.join(nested, 'b.MD'), '# b', 'utf8');
      await writeFile(path.join(nested, 'ignore.txt'), 'x', 'utf8');

      const files = await listMarkdownFilesRecursively(tempRoot);
      const relative = files.map((file) => path.relative(tempRoot, file).replaceAll(path.sep, '/')).sort();

      expect(relative).toEqual(['a.md', 'nested/inner/b.MD']);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('returns empty list when root cannot be read as a directory', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-markdown-missing-'));
    const notADirectoryPath = path.join(tempRoot, 'file.txt');

    try {
      await writeFile(notADirectoryPath, 'plain file', 'utf8');

      const files = await listMarkdownFilesRecursively(notADirectoryPath);
      expect(files).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('writes utf8 and json files with parent directory creation', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-write-files-'));

    try {
      const textPath = path.join(tempRoot, 'deep', 'notes.md');
      const jsonPath = path.join(tempRoot, 'deep', 'data.json');

      await writeUtf8File(textPath, 'hello');
      await writeJsonFile(jsonPath, { ok: true });

      await expect(readFile(textPath, 'utf8')).resolves.toBe('hello');
      await expect(readFile(jsonPath, 'utf8')).resolves.toBe('{\n  "ok": true\n}\n');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('builds analytics and relative asset paths', () => {
    const markdownPath = '/project/output/article.md';
    const assetPath = '/project/output/assets/cover.webp';

    expect(resolveAnalyticsPath(markdownPath)).toBe('/project/output/article.analytics.json');
    expect(relativeAssetPath(markdownPath, assetPath)).toBe('assets/cover.webp');
  });
});
