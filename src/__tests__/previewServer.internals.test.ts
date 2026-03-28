import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { __testInternals } from '../server/previewServer.js';

describe('preview server internals', () => {
  it('keeps absolute/protocol/hash URLs unchanged and rewrites relative asset URLs', () => {
    expect(__testInternals.toGenerationAssetUrl('', 'gen-1')).toBe('');
    expect(__testInternals.toGenerationAssetUrl('https://example.com/img.png', 'gen-1')).toBe('https://example.com/img.png');
    expect(__testInternals.toGenerationAssetUrl('/assets/img.png', 'gen-1')).toBe('/assets/img.png');
    expect(__testInternals.toGenerationAssetUrl('#section', 'gen-1')).toBe('#section');
    expect(__testInternals.toGenerationAssetUrl('data:image/png;base64,abc', 'gen-1')).toBe('data:image/png;base64,abc');
    expect(__testInternals.toGenerationAssetUrl('mailto:test@example.com', 'gen-1')).toBe('mailto:test@example.com');
    expect(__testInternals.toGenerationAssetUrl('tel:+1123456', 'gen-1')).toBe('tel:+1123456');

    const rewritten = __testInternals.toGenerationAssetUrl('images/cover one.png?x=1#hero', 'gen id');
    expect(rewritten).toBe('/api/generations/gen%20id/assets/images/cover%20one.png?x=1#hero');
  });

  it('rewrites src and href attributes for relative values in html fragments', () => {
    const html = [
      '<img src="cover.png" />',
      "<a href='docs/guide.md'>Guide</a>",
      '<img src="https://example.com/external.png" />',
    ].join('\n');

    const rewritten = __testInternals.rewriteRelativeAssetUrls(html, 'gen-2');

    expect(rewritten).toContain('/api/generations/gen-2/assets/cover.png');
    expect(rewritten).toContain('/api/generations/gen-2/assets/docs/guide.md');
    expect(rewritten).toContain('https://example.com/external.png');
  });

  it('detects missing-file errors by ENOENT code', () => {
    expect(__testInternals.isMissingFileError({ code: 'ENOENT' })).toBe(true);
    expect(__testInternals.isMissingFileError(new Error('x'))).toBe(false);
    expect(__testInternals.isMissingFileError(null)).toBe(false);
  });

  it('escapes unsafe html characters', () => {
    const escaped = __testInternals.escapeHtml('<script>"x" & y</script>');
    expect(escaped).toBe('&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;');
  });

  it('renders markdown html and rewrites relative image links', async () => {
    const markdown = '# Title\n\n![Cover](cover.png)';
    const html = await __testInternals.renderArticleHtml(markdown, 'gen-3', '/tmp/gen-3/article-1.md');
    expect(html).toContain('/api/generations/gen-3/assets/cover.png');
  });

  it('applies saved links from sidecar files without overriding existing markdown links', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-internals-links-'));

    try {
      const generationDir = path.join(tempRoot, 'gen-1');
      const markdownPath = path.join(generationDir, 'article-1.md');
      await mkdir(generationDir, { recursive: true });

      const markdown = [
        '# Title',
        '',
        'OpenRouter API improves routing.',
        '',
        'Existing [TypeScript](https://www.typescriptlang.org/) link stays as-is.',
      ].join('\n');
      await writeFile(markdownPath, markdown, 'utf8');
      await writeFile(
        path.join(generationDir, 'article-1.links.json'),
        `${JSON.stringify({
          version: 1,
          links: [
            { expression: 'OpenRouter', url: 'https://openrouter.ai/', title: null },
            { expression: 'OpenRouter API', url: 'https://openrouter.ai/docs/api-reference/overview', title: null },
            { expression: 'TypeScript', url: 'https://example.com/override', title: null },
          ],
        })}\n`,
        'utf8',
      );

      const html = await __testInternals.renderArticleHtml(markdown, 'gen-1', markdownPath);

      expect(html).toContain('href="https://openrouter.ai/docs/api-reference/overview"');
      expect(html).not.toContain('href="https://openrouter.ai/"');
      expect(html).toContain('href="https://www.typescriptlang.org/"');
      expect(html).not.toContain('href="https://example.com/override"');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('applies saved links for italic expressions and plain words sharing the same line', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-internals-italic-links-'));

    try {
      const generationDir = path.join(tempRoot, 'gen-italic');
      const markdownPath = path.join(generationDir, 'article-1.md');
      await mkdir(generationDir, { recursive: true });

      // Aristotle and *phronesis* share the same line — injecting the italic
      // expression first must not block the plain word from being linked.
      const markdown = [
        '# Title',
        '',
        'Aristotle called this *phronesis* — practical wisdom.',
        '',
        'He also wrote the *Nicomachean Ethics* as a guide.',
      ].join('\n');
      await writeFile(markdownPath, markdown, 'utf8');
      await writeFile(
        path.join(generationDir, 'article-1.links.json'),
        `${JSON.stringify({
          version: 1,
          links: [
            { expression: 'Aristotle', url: 'https://example.com/aristotle', title: null },
            { expression: '*phronesis*', url: 'https://example.com/phronesis', title: null },
            { expression: '*Nicomachean Ethics*', url: 'https://example.com/nicomachean', title: null },
          ],
        })}\n`,
        'utf8',
      );

      const html = await __testInternals.renderArticleHtml(markdown, 'gen-italic', markdownPath);

      expect(html).toContain('href="https://example.com/aristotle"');
      expect(html).toContain('href="https://example.com/phronesis"');
      expect(html).toContain('href="https://example.com/nicomachean"');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('ignores malformed saved links sidecars and still renders html', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-internals-bad-links-'));

    try {
      const generationDir = path.join(tempRoot, 'gen-2');
      const markdownPath = path.join(generationDir, 'article-1.md');
      await mkdir(generationDir, { recursive: true });
      await writeFile(markdownPath, '# Title\n\nOpenRouter\n', 'utf8');
      await writeFile(path.join(generationDir, 'article-1.links.json'), '{bad-json', 'utf8');

      const html = await __testInternals.renderArticleHtml('# Title\n\nOpenRouter\n', 'gen-2', markdownPath);

      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<p>OpenRouter</p>');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('resolves generation assets and rejects invalid or missing paths', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-internals-assets-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const generationDir = path.join(markdownOutputDir, '20260328-190000-internals');
      await mkdir(generationDir, { recursive: true });

      const markdownPath = path.join(generationDir, 'article-1.md');
      const assetPath = path.join(generationDir, 'cover.webp');
      await writeFile(markdownPath, '# Internal Asset Test\n\nBody\n', 'utf8');
      await writeFile(assetPath, 'img', 'utf8');

      const resolved = await __testInternals.resolveGenerationAssetPath(
        '20260328-190000-internals',
        'cover.webp',
        markdownOutputDir,
      );
      expect(resolved).toBe(assetPath);

      await expect(
        __testInternals.resolveGenerationAssetPath('20260328-190000-internals', '/etc/passwd', markdownOutputDir),
      ).rejects.toThrow('Invalid generation asset path.');

      await expect(
        __testInternals.resolveGenerationAssetPath('20260328-190000-internals', 'missing.webp', markdownOutputDir),
      ).rejects.toThrow('no longer exists');

      const dirAssetPath = path.join(generationDir, 'not-a-file');
      await mkdir(dirAssetPath, { recursive: true });
      await expect(
        __testInternals.resolveGenerationAssetPath('20260328-190000-internals', 'not-a-file', markdownOutputDir),
      ).rejects.toThrow('no longer exists');

      await expect(
        __testInternals.resolveGenerationAssetPath('missing-generation', 'cover.webp', markdownOutputDir),
      ).rejects.toThrow('no longer exists');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('resolves active preview article from preferred slug or first available generation', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-internals-active-'));

    try {
      const markdownOutputDir = path.join(tempRoot, 'output');
      const generationOne = path.join(markdownOutputDir, '20260328-200000-one');
      const generationTwo = path.join(markdownOutputDir, '20260328-210000-two');
      await mkdir(generationOne, { recursive: true });
      await mkdir(generationTwo, { recursive: true });

      const onePath = path.join(generationOne, 'article-1.md');
      const twoPath = path.join(generationTwo, 'article-1.md');
      await writeFile(onePath, '# One\n\nBody\n', 'utf8');
      await writeFile(twoPath, '# Two\n\nBody\n', 'utf8');

      const preferred = await __testInternals.resolveActivePreviewArticle(twoPath, markdownOutputDir);
      expect(preferred?.slug).toBe('20260328-210000-two');

      const outsidePath = path.join(tempRoot, 'outside.md');
      await writeFile(outsidePath, '# Outside\n', 'utf8');
      const fallback = await __testInternals.resolveActivePreviewArticle(outsidePath, markdownOutputDir);
      expect(fallback?.slug).toBe('20260328-210000-two');

      const emptyDir = path.join(tempRoot, 'empty-output');
      await mkdir(emptyDir, { recursive: true });
      const none = await __testInternals.resolveActivePreviewArticle(path.join(emptyDir, 'none.md'), emptyDir);
      expect(none).toBeNull();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('renders shell for loading and empty states', () => {
    const withEmptyState = __testInternals.renderShell({
      title: 'Preview',
      sourcePath: '/tmp/out',
      currentSlug: '',
      emptyStateMessage: 'No generated content',
    });

    expect(withEmptyState).toContain('No generated content');
    expect(withEmptyState).toContain("const currentSlug = '';");

    const loading = __testInternals.renderShell({
      title: 'Preview',
      sourcePath: '/tmp/out/article.md',
      currentSlug: 'gen-1',
      emptyStateMessage: null,
    });

    expect(loading).toContain('loading preview-empty');
    expect(loading).toContain("const currentSlug = 'gen-1';");
  });

  it('executes browser-open helper without throwing', async () => {
    await expect(__testInternals.tryOpenBrowser('http://localhost:9999')).resolves.toBeUndefined();
  });

  it('covers non-darwin browser open branches without throwing', async () => {
    const originalPlatform = process.platform;

    try {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      await expect(__testInternals.tryOpenBrowser('http://localhost:9999')).resolves.toBeUndefined();

      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      await expect(__testInternals.tryOpenBrowser('http://localhost:9999')).resolves.toBeUndefined();
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    }
  });
});
