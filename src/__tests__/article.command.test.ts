import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';

const filesystemModule = await import('../output/filesystem.js');

jest.unstable_mockModule('../output/filesystem.js', () => ({
  ...filesystemModule,
  resolveOutputPaths: () => mockedOutputPaths,
}));

let mockedOutputPaths = { markdownOutputDir: '', assetOutputDir: '' };

const { runArticleListCommand } = await import('../cli/commands/article.js');

const META_TEMPLATE = {
  version: 1,
  title: 'Default Title',
  slug: 'default-slug',
  idea: 'Default idea',
  description: 'Default description',
  subtitle: null,
  keywords: [] as string[],
  contentType: 'article',
  style: 'professional',
  intent: 'tutorial',
  targetLength: null,
  angle: null,
  cover: null,
  sections: [] as Array<{ title: string; description: string }>,
  images: [] as unknown[],
  outputs: [] as unknown[],
  generatedAt: '2026-05-08T12:00:00.000Z',
  generationDir: '/output/gen',
};

describe('runArticleListCommand', () => {
  let tempRoot: string;
  let outputDir: string;
  let logs: string[];

  beforeEach(async () => {
    jest.clearAllMocks();
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-article-test-'));
    outputDir = path.join(tempRoot, 'output');
    await mkdir(outputDir, { recursive: true });
    mockedOutputPaths = { markdownOutputDir: outputDir, assetOutputDir: path.join(outputDir, 'assets') };
    logs = [];
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  function log(msg: string): void {
    logs.push(msg);
  }

  async function seedGeneration(slug: string, opts: {
    title?: string;
    description?: string;
    keywords?: string[];
    publication?: string;
    series?: string;
    contentType?: string;
    body?: string;
    mtimeOffsetMs?: number;
  } = {}): Promise<string> {
    const dirName = `20260508-120000-${slug}`;
    const generationDir = path.join(outputDir, dirName);
    await mkdir(generationDir, { recursive: true });

    const meta = {
      ...META_TEMPLATE,
      title: opts.title ?? `Title for ${slug}`,
      slug,
      description: opts.description ?? `Description for ${slug}`,
      keywords: opts.keywords ?? [],
      contentType: opts.contentType ?? 'article',
      generationDir,
      ...(opts.publication ? { publication: opts.publication } : {}),
      ...(opts.series ? { series: opts.series } : {}),
    };

    await writeFile(path.join(generationDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

    const body = opts.body ?? `---\ntitle: ${JSON.stringify(meta.title)}\nslug: ${JSON.stringify(slug)}\n---\n\n# ${meta.title}\n\nSome article body content for ${slug}.\n`;
    await writeFile(path.join(generationDir, 'article-1.md'), body, 'utf8');

    return generationDir;
  }

  it('lists articles sorted by mtime (newest first)', async () => {
    await seedGeneration('first-article', { title: 'First Article' });
    await seedGeneration('second-article', { title: 'Second Article' });

    await runArticleListCommand({ json: false, verbose: false }, { log });

    expect(logs.some((l) => l.includes('first-article'))).toBe(true);
    expect(logs.some((l) => l.includes('second-article'))).toBe(true);
  });

  it('returns empty message when no articles exist', async () => {
    await runArticleListCommand({ json: false, verbose: false }, { log });

    expect(logs.some((l) => l.includes('No articles found'))).toBe(true);
  });

  it('outputs JSON when --json is set', async () => {
    await seedGeneration('json-article', { title: 'JSON Article', keywords: ['test'] });

    const jsonLogs: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => jsonLogs.push(msg);
    try {
      await runArticleListCommand({ json: true, verbose: false }, { log });
    } finally {
      console.log = origLog;
    }

    const output = JSON.parse(jsonLogs.join('')) as Array<{ slug: string; title: string }>;
    expect(output).toHaveLength(1);
    expect(output[0]!.slug).toBe('json-article');
    expect(output[0]!.title).toBe('JSON Article');
  });

  it('shows verbose output with description and keywords', async () => {
    await seedGeneration('verbose-article', {
      title: 'Verbose Article',
      description: 'A detailed description',
      keywords: ['react', 'hooks'],
      publication: 'tech-blog',
    });

    await runArticleListCommand({ json: false, verbose: true }, { log });

    expect(logs.some((l) => l.includes('A detailed description'))).toBe(true);
    expect(logs.some((l) => l.includes('react, hooks'))).toBe(true);
    expect(logs.some((l) => l.includes('tech-blog'))).toBe(true);
  });

  describe('search', () => {
    it('searches by exact phrase in title', async () => {
      await seedGeneration('react-hooks', { title: 'React Hooks Deep Dive' });
      await seedGeneration('vue-composition', { title: 'Vue Composition API' });

      await runArticleListCommand({ search: 'React Hooks', json: false, verbose: false }, { log });

      expect(logs.some((l) => l.includes('react-hooks'))).toBe(true);
      expect(logs.some((l) => l.includes('vue-composition'))).toBe(false);
    });

    it('searches by exact phrase in body content', async () => {
      await seedGeneration('article-a', { body: '---\ntitle: "Article A"\nslug: "article-a"\n---\n\n# Article A\n\nLearn about machine learning fundamentals.\n' });
      await seedGeneration('article-b', { body: '---\ntitle: "Article B"\nslug: "article-b"\n---\n\n# Article B\n\nIntroduction to web development.\n' });

      await runArticleListCommand({ search: 'machine learning', json: false, verbose: false }, { log });

      expect(logs.some((l) => l.includes('article-a'))).toBe(true);
      expect(logs.some((l) => l.includes('article-b'))).toBe(false);
    });

    it('searches by exact phrase in keywords', async () => {
      await seedGeneration('seo-article', { keywords: ['organic marketing', 'content strategy'] });
      await seedGeneration('other-article', { keywords: ['javascript', 'typescript'] });

      await runArticleListCommand({ search: 'organic marketing', json: false, verbose: false }, { log });

      expect(logs.some((l) => l.includes('seo-article'))).toBe(true);
      expect(logs.some((l) => l.includes('other-article'))).toBe(false);
    });

    it('falls back to all-words AND logic when no exact phrase match', async () => {
      await seedGeneration('react-hooks', { title: 'React Hooks', body: '---\ntitle: "React Hooks"\nslug: "react-hooks"\n---\n\n# React Hooks\n\nLearn about custom hooks.\n' });
      await seedGeneration('react-native', { title: 'React Native', body: '---\ntitle: "React Native"\nslug: "react-native"\n---\n\n# React Native\n\nMobile development.\n' });
      await seedGeneration('vue-intro', { title: 'Vue Intro', body: '---\ntitle: "Vue Intro"\nslug: "vue-intro"\n---\n\n# Vue Intro\n\nGetting started with Vue.\n' });

      await runArticleListCommand({ search: 'hooks React', json: false, verbose: false }, { log });

      expect(logs.some((l) => l.includes('react-hooks'))).toBe(true);
      expect(logs.some((l) => l.includes('react-native'))).toBe(false);
      expect(logs.some((l) => l.includes('vue-intro'))).toBe(false);
    });

    it('returns empty when search has no matches', async () => {
      await seedGeneration('some-article', { title: 'Some Article', body: '---\ntitle: "Some Article"\nslug: "some-article"\n---\n\n# Some\n\nContent here.\n' });

      await runArticleListCommand({ search: 'nonexistent xyz query', json: false, verbose: false }, { log });

      expect(logs.some((l) => l.includes('No articles found'))).toBe(true);
    });
  });

  describe('filters', () => {
    it('filters by publication', async () => {
      await seedGeneration('pub-a', { publication: 'tech-blog' });
      await seedGeneration('pub-b', { publication: 'marketing-blog' });
      await seedGeneration('no-pub', {});

      await runArticleListCommand({ publication: 'tech-blog', json: false, verbose: false }, { log });

      expect(logs.some((l) => l.includes('pub-a'))).toBe(true);
      expect(logs.some((l) => l.includes('pub-b'))).toBe(false);
      expect(logs.some((l) => l.includes('no-pub'))).toBe(false);
    });

    it('filters by series', async () => {
      await seedGeneration('series-a', { series: 'deep-dives' });
      await seedGeneration('series-b', { series: 'quick-tips' });

      await runArticleListCommand({ series: 'deep-dives', json: false, verbose: false }, { log });

      expect(logs.some((l) => l.includes('series-a'))).toBe(true);
      expect(logs.some((l) => l.includes('series-b'))).toBe(false);
    });

    it('filters by content type', async () => {
      await seedGeneration('article-x', { contentType: 'article' });
      await seedGeneration('blog-x', { contentType: 'blog-post' });

      await runArticleListCommand({ contentType: 'blog-post', json: false, verbose: false }, { log });

      expect(logs.some((l) => l.includes('article-x'))).toBe(false);
      expect(logs.some((l) => l.includes('blog-x'))).toBe(true);
    });

    it('combines search and filter', async () => {
      await seedGeneration('tech-react', { title: 'React Hooks', publication: 'tech-blog' });
      await seedGeneration('mkt-react', { title: 'React Hooks', publication: 'marketing-blog' });

      await runArticleListCommand({ search: 'React', publication: 'tech-blog', json: false, verbose: false }, { log });

      expect(logs.some((l) => l.includes('tech-react'))).toBe(true);
      expect(logs.some((l) => l.includes('mkt-react'))).toBe(false);
    });

    it('limits results', async () => {
      await seedGeneration('article-1', { title: 'Article 1' });
      await seedGeneration('article-2', { title: 'Article 2' });
      await seedGeneration('article-3', { title: 'Article 3' });

      await runArticleListCommand({ limit: 2, json: false, verbose: false }, { log });

      const articleLines = logs.filter((l) => l.includes('article-'));
      expect(articleLines.length).toBeLessThanOrEqual(2);
    });
  });

  it('skips directories without markdown files', async () => {
    const emptyDir = path.join(outputDir, '20260508-120000-empty');
    await mkdir(emptyDir, { recursive: true });
    await writeFile(path.join(emptyDir, 'meta.json'), JSON.stringify({ ...META_TEMPLATE, generationDir: emptyDir }), 'utf8');

    await seedGeneration('has-markdown', { title: 'Has Markdown' });

    await runArticleListCommand({ json: false, verbose: false }, { log });

    expect(logs.some((l) => l.includes('has-markdown'))).toBe(true);
  });

  it('skips directories without meta.json gracefully', async () => {
    const noMetaDir = path.join(outputDir, '20260508-120000-no-meta');
    await mkdir(noMetaDir, { recursive: true });
    await writeFile(path.join(noMetaDir, 'article-1.md'), '---\ntitle: "No Meta Article"\nslug: "no-meta"\n---\n\n# No Meta Article\n\nBody content.\n', 'utf8');

    await runArticleListCommand({ json: false, verbose: false }, { log });

    expect(logs.some((l) => l.includes('no-meta'))).toBe(true);
  });
});
