import { mkdtemp, mkdir, rm, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-series-test-'));
const tempConfigDir = path.join(tempRoot, 'config');

jest.unstable_mockModule('env-paths', () => ({
  default: () => ({ config: tempConfigDir }),
}));

const { deriveSeriesSlugFromName, seriesSchema, seriesEditorialPolicySchema, seriesDefaultsSchema } = await import('../types/series.js');
const { buildSeriesDirective } = await import('../llm/prompts/seriesPolicy.js');
const {
  loadSeries,
  listSeries,
  saveSeries,
  deleteSeries,
  seriesExists,
  getSeriesDir,
} = await import('../config/seriesStore.js');

describe('series types', () => {
  describe('deriveSeriesSlugFromName', () => {
    it('converts name to lowercase kebab-case', () => {
      expect(deriveSeriesSlugFromName('My Series')).toBe('my-series');
    });

    it('strips leading and trailing hyphens', () => {
      expect(deriveSeriesSlugFromName('  --Hello World--  ')).toBe('hello-world');
    });

    it('collapses multiple non-alphanumeric chars into single hyphen', () => {
      expect(deriveSeriesSlugFromName('Tech & Science!!!')).toBe('tech-science');
    });

    it('returns untitled-series for empty input', () => {
      expect(deriveSeriesSlugFromName('')).toBe('untitled-series');
      expect(deriveSeriesSlugFromName('   ')).toBe('untitled-series');
    });
  });

  describe('seriesEditorialPolicySchema', () => {
    it('parses empty object with defaults', () => {
      const result = seriesEditorialPolicySchema.parse({});
      expect(result.tone).toBe('');
      expect(result.forbiddenTopics).toEqual([]);
      expect(result.disclosureRequirements).toEqual([]);
      expect(result.audienceRestrictions).toEqual([]);
      expect(result.notes).toBe('');
    });
  });

  describe('seriesDefaultsSchema', () => {
    it('parses empty object', () => {
      const result = seriesDefaultsSchema.parse({});
      expect(result).toEqual({});
    });

    it('rejects invalid style', () => {
      expect(() => seriesDefaultsSchema.parse({ style: 'invalid' })).toThrow();
    });

    it('parses keywords when provided', () => {
      const result = seriesDefaultsSchema.parse({ keywords: ['organic marketing', 'content strategy'] });
      expect(result.keywords).toEqual(['organic marketing', 'content strategy']);
    });

    it('allows undefined keywords', () => {
      const result = seriesDefaultsSchema.parse({});
      expect(result.keywords).toBeUndefined();
    });
  });

  describe('seriesSchema', () => {
    it('parses minimal series', () => {
      const result = seriesSchema.parse({
        name: 'Test',
        slug: 'test',
      });
      expect(result.name).toBe('Test');
      expect(result.slug).toBe('test');
      expect(result.topic).toBe('');
      expect(result.editorialPolicy.tone).toBe('');
      expect(result.defaults).toEqual({});
    });

    it('parses full series with topic and publication', () => {
      const result = seriesSchema.parse({
        name: 'AI Deep Dives',
        slug: 'ai-deep-dives',
        topic: 'Exploring cutting-edge AI technologies',
        publication: 'tech-blog',
        editorialPolicy: {
          tone: 'technical',
          forbiddenTopics: ['hype'],
          notes: 'Always include code examples.',
        },
        defaults: {
          style: 'technical',
          intent: 'deep-dive-analysis',
          targetLength: 1400,
        },
      });
      expect(result.topic).toBe('Exploring cutting-edge AI technologies');
      expect(result.publication).toBe('tech-blog');
      expect(result.defaults.style).toBe('technical');
      expect(result.editorialPolicy.tone).toBe('technical');
    });

    it('allows optional publication', () => {
      const result = seriesSchema.parse({
        name: 'Standalone',
        slug: 'standalone',
      });
      expect(result.publication).toBeUndefined();
    });

    it('parses series with keywords in defaults', () => {
      const result = seriesSchema.parse({
        name: 'SEO Series',
        slug: 'seo-series',
        topic: 'SEO best practices',
        defaults: {
          keywords: ['organic marketing', 'content strategy', 'seo'],
        },
      });
      expect(result.defaults.keywords).toEqual(['organic marketing', 'content strategy', 'seo']);
    });
  });
});

describe('seriesPolicy prompt builder', () => {
  it('returns empty string for null series', () => {
    expect(buildSeriesDirective(null)).toBe('');
  });

  it('includes series name and narrative thread', () => {
    const series = seriesSchema.parse({ name: 'AI Deep Dives', slug: 'ai-deep-dives' });
    const directive = buildSeriesDirective(series);
    expect(directive).toContain('This article is part of the series "AI Deep Dives".');
    expect(directive).toContain('Maintain thematic coherence and continuity');
  });

  it('includes topic when set', () => {
    const series = seriesSchema.parse({
      name: 'Test',
      slug: 'test',
      topic: 'Exploring machine learning fundamentals',
    });
    const directive = buildSeriesDirective(series);
    expect(directive).toContain('Series topic: Exploring machine learning fundamentals');
  });

  it('omits topic when empty', () => {
    const series = seriesSchema.parse({ name: 'Test', slug: 'test' });
    const directive = buildSeriesDirective(series);
    expect(directive).not.toContain('Series topic:');
  });

  it('includes editorial policy fields', () => {
    const series = seriesSchema.parse({
      name: 'Test',
      slug: 'test',
      editorialPolicy: {
        tone: 'formal',
        forbiddenTopics: ['hype', 'speculation'],
        disclosureRequirements: ['FTC'],
        audienceRestrictions: ['technical readers only'],
        notes: 'Include code examples.',
      },
    });
    const directive = buildSeriesDirective(series);
    expect(directive).toContain('Tone: formal');
    expect(directive).toContain('Forbidden topics: hype, speculation');
    expect(directive).toContain('Disclosure requirements: FTC');
    expect(directive).toContain('Audience restrictions: technical readers only');
    expect(directive).toContain('Editorial policy notes: Include code examples.');
  });
});

describe('seriesStore', () => {
  beforeEach(async () => {
    await mkdir(tempConfigDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(path.join(tempConfigDir, 'series'), { recursive: true, force: true });
  });

  describe('getSeriesDir', () => {
    it('returns correct path', () => {
      expect(getSeriesDir()).toBe(path.join(tempConfigDir, 'series'));
    });
  });

  describe('saveSeries and loadSeries', () => {
    it('saves and loads a series', async () => {
      const series = seriesSchema.parse({ name: 'Test', slug: 'test' });
      await saveSeries(series);

      const loaded = await loadSeries('test');
      expect(loaded.name).toBe('Test');
      expect(loaded.slug).toBe('test');
    });

    it('creates directory on save', async () => {
      const series = seriesSchema.parse({ name: 'Test', slug: 'test' });
      await saveSeries(series);

      const dirStat = await stat(path.join(tempConfigDir, 'series'));
      expect(dirStat.isDirectory()).toBe(true);
    });

    it('throws when series not found', async () => {
      await expect(loadSeries('missing')).rejects.toThrow('Series "missing" not found.');
    });
  });

  describe('listSeries', () => {
    it('returns empty array when no series exist', async () => {
      const result = await listSeries();
      expect(result).toEqual([]);
    });

    it('returns sorted series', async () => {
      await saveSeries(seriesSchema.parse({ name: 'Z', slug: 'z-series' }));
      await saveSeries(seriesSchema.parse({ name: 'A', slug: 'a-series' }));

      const result = await listSeries();
      expect(result).toHaveLength(2);
      expect(result[0]!.slug).toBe('a-series');
      expect(result[1]!.slug).toBe('z-series');
    });

    it('filters by publication slug', async () => {
      await saveSeries(seriesSchema.parse({ name: 'A', slug: 'a', publication: 'pub-1' }));
      await saveSeries(seriesSchema.parse({ name: 'B', slug: 'b', publication: 'pub-2' }));
      await saveSeries(seriesSchema.parse({ name: 'C', slug: 'c' }));

      const result = await listSeries({ publicationSlug: 'pub-1' });
      expect(result).toHaveLength(1);
      expect(result[0]!.slug).toBe('a');
    });

    it('skips non-json files', async () => {
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));
      await writeFile(path.join(tempConfigDir, 'series', 'readme.md'), '# Readme', 'utf8');

      const result = await listSeries();
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteSeries', () => {
    it('removes the file', async () => {
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));
      await deleteSeries('test');

      await expect(loadSeries('test')).rejects.toThrow('Series "test" not found.');
    });

    it('throws when file not found', async () => {
      await expect(deleteSeries('missing')).rejects.toThrow('Series "missing" not found.');
    });
  });

  describe('seriesExists', () => {
    it('returns true when file exists', async () => {
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));
      expect(await seriesExists('test')).toBe(true);
    });

    it('returns false when file does not exist', () => {
      expect(seriesExists('missing')).resolves.toBe(false);
    });
  });
});

describe('series commands', () => {
  beforeEach(async () => {
    await mkdir(tempConfigDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(path.join(tempConfigDir, 'series'), { recursive: true, force: true });
  });

  describe('runSeriesAddCommand', () => {
    it('creates series from flags', async () => {
      const { runSeriesAddCommand } = await import('../cli/commands/series.js');

      const logs: string[] = [];
      await runSeriesAddCommand(
        {
          name: 'AI Deep Dives',
          topic: 'Exploring AI technologies',
          style: 'technical',
          intent: 'deep-dive-analysis',
          tone: 'formal',
        },
        { log: (msg) => logs.push(msg) },
      );

      const series = await loadSeries('ai-deep-dives');
      expect(series.name).toBe('AI Deep Dives');
      expect(series.slug).toBe('ai-deep-dives');
      expect(series.topic).toBe('Exploring AI technologies');
      expect(series.defaults.style).toBe('technical');
      expect(series.editorialPolicy.tone).toBe('formal');
      expect(logs[0]).toContain('Created series "AI Deep Dives"');
    });

    it('creates series with publication association', async () => {
      const { runSeriesAddCommand } = await import('../cli/commands/series.js');

      await runSeriesAddCommand(
        { name: 'My Series', publication: 'tech-blog' },
        { log: () => {} },
      );

      const series = await loadSeries('my-series');
      expect(series.publication).toBe('tech-blog');
    });

    it('throws when name is missing in non-interactive mode', async () => {
      const { runSeriesAddCommand } = await import('../cli/commands/series.js');
      await expect(runSeriesAddCommand({})).rejects.toThrow('Series name is required');
    });

    it('throws when slug already exists', async () => {
      const { runSeriesAddCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'Existing', slug: 'existing' }));

      await expect(
        runSeriesAddCommand({ name: 'Existing' }, { log: () => {} }),
      ).rejects.toThrow('Series "existing" already exists');
    });
  });

  describe('runSeriesListCommand', () => {
    it('prints empty message when no series', async () => {
      const { runSeriesListCommand } = await import('../cli/commands/series.js');

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runSeriesListCommand({ json: false, verbose: false });
      } finally {
        console.log = origLog;
      }

      expect(logs.some((l) => l.includes('No series found'))).toBe(true);
    });

    it('prints JSON output', async () => {
      const { runSeriesListCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runSeriesListCommand({ json: true, verbose: false });
      } finally {
        console.log = origLog;
      }

      const jsonOutput = JSON.parse(logs[0]!);
      expect(jsonOutput).toHaveLength(1);
      expect(jsonOutput[0].slug).toBe('test');
    });

    it('filters by publication', async () => {
      const { runSeriesListCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'A', slug: 'a', publication: 'pub-1' }));
      await saveSeries(seriesSchema.parse({ name: 'B', slug: 'b', publication: 'pub-2' }));

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runSeriesListCommand({ json: true, verbose: false, publication: 'pub-1' });
      } finally {
        console.log = origLog;
      }

      const jsonOutput = JSON.parse(logs[0]!);
      expect(jsonOutput).toHaveLength(1);
      expect(jsonOutput[0].slug).toBe('a');
    });
  });

  describe('runSeriesEditCommand', () => {
    it('edits topic and publication', async () => {
      const { runSeriesEditCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));

      const origLog = console.log;
      console.log = () => {};
      try {
        await runSeriesEditCommand({ slug: 'test', topic: 'New topic', publication: 'my-pub' });
      } finally {
        console.log = origLog;
      }

      const series = await loadSeries('test');
      expect(series.topic).toBe('New topic');
      expect(series.publication).toBe('my-pub');
    });

    it('unsets publication', async () => {
      const { runSeriesEditCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test', publication: 'old-pub' }));

      const origLog = console.log;
      console.log = () => {};
      try {
        await runSeriesEditCommand({ slug: 'test', unsetPublication: true });
      } finally {
        console.log = origLog;
      }

      const series = await loadSeries('test');
      expect(series.publication).toBeUndefined();
    });

    it('edits defaults and editorial policy', async () => {
      const { runSeriesEditCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));

      const origLog = console.log;
      console.log = () => {};
      try {
        await runSeriesEditCommand({
          slug: 'test',
          style: 'technical',
          intent: 'how-to-guide',
          tone: 'casual',
        });
      } finally {
        console.log = origLog;
      }

      const series = await loadSeries('test');
      expect(series.defaults.style).toBe('technical');
      expect(series.defaults.intent).toBe('how-to-guide');
      expect(series.editorialPolicy.tone).toBe('casual');
    });

    it('rejects invalid style', async () => {
      const { runSeriesEditCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));

      await expect(
        runSeriesEditCommand({ slug: 'test', style: 'invalid' }),
      ).rejects.toThrow('Invalid style');
    });

    it('rejects invalid intent', async () => {
      const { runSeriesEditCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));

      await expect(
        runSeriesEditCommand({ slug: 'test', intent: 'invalid' }),
      ).rejects.toThrow('Invalid intent');
    });
  });

  describe('runSeriesRemoveCommand', () => {
    it('deletes when forced', async () => {
      const { runSeriesRemoveCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));

      const logs: string[] = [];
      await runSeriesRemoveCommand(
        { slug: 'test', force: true },
        { log: (msg) => logs.push(msg) },
      );

      expect(await seriesExists('test')).toBe(false);
      expect(logs[0]).toContain('Deleted series "test"');
    });

    it('cancels when confirmation declined', async () => {
      const { runSeriesRemoveCommand } = await import('../cli/commands/series.js');
      await saveSeries(seriesSchema.parse({ name: 'Test', slug: 'test' }));
      const restoreTty = mockTty(true, true);

      try {
        const logs: string[] = [];
        await runSeriesRemoveCommand(
          { slug: 'test', force: false },
          {
            confirmDeletion: async () => false,
            log: (msg) => logs.push(msg),
          },
        );

        expect(await seriesExists('test')).toBe(true);
        expect(logs).toContain('Removal cancelled.');
      } finally {
        restoreTty();
      }
    });

    it('requires --force outside interactive terminal', async () => {
      const { runSeriesRemoveCommand } = await import('../cli/commands/series.js');
      const restoreTty = mockTty(false, false);

      try {
        await expect(
          runSeriesRemoveCommand({ slug: 'test', force: false }),
        ).rejects.toThrow('Remove requires confirmation');
      } finally {
        restoreTty();
      }
    });
  });
});

describe('series in resolver', () => {
  beforeEach(async () => {
    await mkdir(tempConfigDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(path.join(tempConfigDir, 'series'), { recursive: true, force: true });
    await rm(path.join(tempConfigDir, 'publications'), { recursive: true, force: true });
  });

  it('resolves series from input', async () => {
    const { saveSeries: save } = await import('../config/seriesStore.js');
    const { resolveRunInput } = await import('../config/resolver.js');

    await save(seriesSchema.parse({
      name: 'Test Series',
      slug: 'test-series',
      topic: 'AI topic',
      defaults: { style: 'technical' },
    }));

    const result = await resolveRunInput({
      idea: 'Test idea',
      series: 'test-series',
      style: 'professional',
      intent: 'tutorial',
      targetLength: 'medium',
    });

    expect(result.series).not.toBeNull();
    expect(result.series!.slug).toBe('test-series');
    expect(result.series!.topic).toBe('AI topic');
  });

  it('series defaults do not override CLI flags', async () => {
    const { saveSeries: save } = await import('../config/seriesStore.js');
    const { resolveRunInput } = await import('../config/resolver.js');

    await save(seriesSchema.parse({
      name: 'Test',
      slug: 'test',
      defaults: { style: 'technical' },
    }));

    const result = await resolveRunInput({
      idea: 'Test idea',
      series: 'test',
      style: 'professional',
      intent: 'tutorial',
      targetLength: 'medium',
    });

    expect(result.config.settings.style).toBe('professional');
  });

  it('series is null when not specified', async () => {
    const { resolveRunInput } = await import('../config/resolver.js');

    const result = await resolveRunInput({
      idea: 'Test idea',
      style: 'professional',
      intent: 'tutorial',
      targetLength: 'medium',
    });

    expect(result.series).toBeNull();
  });

  it('series publication takes precedence over job publication', async () => {
    const { saveSeries: save } = await import('../config/seriesStore.js');
    const { savePublication } = await import('../config/publicationStore.js');
    const { resolveRunInput } = await import('../config/resolver.js');
    const { publicationSchema } = await import('../types/publication.js');

    await savePublication(publicationSchema.parse({ name: 'Pub', slug: 'pub' }));
    await savePublication(publicationSchema.parse({ name: 'Series Pub', slug: 'series-pub' }));
    await save(seriesSchema.parse({ name: 'Test', slug: 'test', publication: 'series-pub' }));

    const result = await resolveRunInput({
      idea: 'Test idea',
      series: 'test',
      style: 'professional',
      intent: 'tutorial',
      targetLength: 'medium',
    });

    expect(result.publication!.slug).toBe('series-pub');
  });
});

function mockTty(stdoutIsTty: boolean, stdinIsTty: boolean): () => void {
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: stdoutIsTty,
  });

  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: stdinIsTty,
  });

  return () => {
    if (stdoutDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    }
    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    }
  };
}
