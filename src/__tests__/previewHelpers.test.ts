import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  parsePort,
  resolveLatestMarkdown,
  resolveMarkdownPath,
  stripFrontmatter,
  extractHeadingTitle,
  extractArticleMetadata,
  listAllArticles,
  listAllGenerations,
  deriveGenerationId,
} from '../server/previewHelpers.js';

describe('preview helpers', () => {
  it('uses default port when none is provided', () => {
    expect(parsePort(undefined)).toBe(4173);
  });

  it('validates invalid ports', () => {
    expect(() => parsePort('0')).toThrow('Invalid port');
    expect(() => parsePort('70000')).toThrow('Invalid port');
    expect(() => parsePort('abc')).toThrow('Invalid port');
  });

  it('accepts valid custom ports', () => {
    expect(parsePort('8080')).toBe(8080);
  });

  it('strips yaml frontmatter before markdown rendering', () => {
    const markdown = ['---', 'title: Sample', 'slug: sample', '---', '# Heading', '', 'Body'].join('\n');
    const stripped = stripFrontmatter(markdown);

    expect(stripped.startsWith('# Heading')).toBe(true);
    expect(stripped.includes('title: Sample')).toBe(false);
  });

  it('extracts first h1 heading title', () => {
    const markdown = ['# Main Heading', '', 'Paragraph'].join('\n');
    expect(extractHeadingTitle(markdown)).toBe('Main Heading');
  });

  it('returns null when no heading is present', () => {
    expect(extractHeadingTitle('No heading here')).toBeNull();
  });

  it('resolves explicit markdown path', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-explicit-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      await writeFile(markdownPath, '# Test Article\n', 'utf8');

      const resolved = await resolveMarkdownPath(markdownPath, tempRoot, tempRoot);
      expect(resolved).toBe(markdownPath);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('resolves relative markdown path using cwd', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-relative-'));

    try {
      const markdownPath = path.join(tempRoot, 'article.md');
      await writeFile(markdownPath, '# Relative\n', 'utf8');

      const resolved = await resolveMarkdownPath('article.md', '/unused', tempRoot);
      expect(resolved).toBe(markdownPath);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects explicit paths that are not markdown files', async () => {
    await expect(resolveMarkdownPath('article.txt', '/unused', '/tmp')).rejects.toThrow('Expected a markdown file');
  });

  it('selects the latest markdown when no explicit path is provided', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-latest-'));

    try {
      const olderPath = path.join(tempRoot, 'older.md');
      await writeFile(olderPath, '# Older\n', 'utf8');
      await new Promise((resolve) => setTimeout(resolve, 20));

      const newerPath = path.join(tempRoot, 'newer.md');
      await writeFile(newerPath, '# Newer\n', 'utf8');

      const latest = await resolveLatestMarkdown(tempRoot);
      expect(latest).toBe(newerPath);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('throws when output directory has no markdown files', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-empty-'));

    try {
      await expect(resolveLatestMarkdown(tempRoot)).rejects.toThrow('No generated articles found');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('extracts article metadata with title, mtime, and preview snippet', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-metadata-'));

    try {
      const markdown = ['---', 'title: My Article', '---', '# Article Title', '', 'This is the preview text that should be truncated if it gets too long and includes multiple words.', '', 'More content here that should not appear in preview.'].join('\n');
      const markdownPath = path.join(tempRoot, 'test-article.md');
      await writeFile(markdownPath, markdown, 'utf8');

      const metadata = await extractArticleMetadata(markdownPath);

      expect(metadata.slug).toBe('test-article');
      expect(metadata.title).toBe('Article Title');
      expect(metadata.mtime).toBeGreaterThan(0);
      expect(metadata.previewSnippet).toContain('This is the preview');
      expect(metadata.previewSnippet.length).toBeLessThanOrEqual(150);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('prefers frontmatter slug over markdown filename', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-metadata-frontmatter-slug-'));

    try {
      const markdown = ['---', 'slug: custom-content-slug', '---', '# Article Title', '', 'Body'].join('\n');
      const markdownPath = path.join(tempRoot, 'article-1.md');
      await writeFile(markdownPath, markdown, 'utf8');

      const metadata = await extractArticleMetadata(markdownPath);
      expect(metadata.slug).toBe('custom-content-slug');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('falls back to slug as title when markdown has no heading', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-metadata-title-fallback-'));

    try {
      const markdown = ['---', 'slug: fallback-slug', '---', '', 'Body only'].join('\n');
      const markdownPath = path.join(tempRoot, 'article-1.md');
      await writeFile(markdownPath, markdown, 'utf8');

      const metadata = await extractArticleMetadata(markdownPath);
      expect(metadata.title).toBe('fallback-slug');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('lists all articles sorted by mtime descending', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-list-articles-'));

    try {
      const article1 = path.join(tempRoot, 'article1.md');
      await writeFile(article1, '# First Article\n\nOldest', 'utf8');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const article2 = path.join(tempRoot, 'article2.md');
      await writeFile(article2, '# Second Article\n\nNewest', 'utf8');

      const articles = await listAllArticles(tempRoot);

      expect(articles).toHaveLength(2);
      expect(articles[0]?.slug).toBe('article2');
      expect(articles[1]?.slug).toBe('article1');
      expect(articles[0]?.mtime).toBeGreaterThan(articles[1]?.mtime);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('skips non-markdown files when listing articles', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-skip-files-'));

    try {
      await writeFile(path.join(tempRoot, 'article.md'), '# Article\n', 'utf8');
      await writeFile(path.join(tempRoot, 'readme.txt'), 'Not markdown', 'utf8');
      await writeFile(path.join(tempRoot, 'data.json'), '{}', 'utf8');

      const articles = await listAllArticles(tempRoot);

      expect(articles).toHaveLength(1);
      expect(articles[0]?.slug).toBe('article');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('derives generation id from nested paths and falls back when outside output root', () => {
    const root = '/tmp/output';
    expect(deriveGenerationId('/tmp/output/20260328-120000-topic/article-1.md', root)).toBe('20260328-120000-topic');
    expect(deriveGenerationId('/tmp/other/article-1.md', root)).toBe('article-1');
  });

  it('lists grouped generation outputs and labels unknown content types', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-generations-'));

    try {
      const generationDir = path.join(tempRoot, '20260328-120000-topic');
      await mkdir(generationDir, { recursive: true });
      await writeFile(path.join(generationDir, 'article-1.md'), '# Article\n\nBody\n', 'utf8');
      await writeFile(path.join(generationDir, 'custom-2.md'), '# Custom\n\nBody\n', 'utf8');

      const generations = await listAllGenerations(tempRoot);
      expect(generations).toHaveLength(1);
      expect(generations[0]?.outputs).toHaveLength(2);
      expect(generations[0]?.outputs.some((output) => output.contentTypeLabel === 'Custom')).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('selects generation primary from job metadata when article is secondary', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-generations-primary-from-job-'));

    try {
      const generationDir = path.join(tempRoot, '20260329-120000-topic');
      await mkdir(generationDir, { recursive: true });
      await writeFile(path.join(generationDir, 'article-1.md'), '# Article Secondary\n\nBody\n', 'utf8');
      await writeFile(path.join(generationDir, 'blog-1.md'), '# Blog Primary\n\nBody\n', 'utf8');
      await writeFile(
        path.join(generationDir, 'job.json'),
        `${JSON.stringify({ contentTargets: [
          { contentType: 'blog-post', role: 'primary', count: 1 },
          { contentType: 'article', role: 'secondary', count: 1 },
        ] })}\n`,
        'utf8',
      );

      const generations = await listAllGenerations(tempRoot);
      expect(generations).toHaveLength(1);
      expect(generations[0]?.primaryContentType).toBe('blog-post');
      expect(generations[0]?.title).toBe('Blog Primary');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
