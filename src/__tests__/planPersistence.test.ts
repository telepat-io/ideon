import { describe, it, expect } from '@jest/globals';
import { createSeriesFromCluster, buildQueueEntry } from '../plan/persistence.js';
import type { PlannedSeries, PlannedArticle } from '../types/plan.js';
import type { Series } from '../types/series.js';

describe('createSeriesFromCluster', () => {
  it('creates series with correct slug from name', async () => {
    const cluster: PlannedSeries = {
      name: 'Content Strategy Guide',
      pillarKeyword: 'content strategy',
      funnelStage: 'top',
      clusterRationale: 'Test rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.name).toBe('Content Strategy Guide');
    expect(series.slug).toBe('content-strategy-guide');
    expect(series.publication).toBe('test-pub');
  });

  it('includes keywords from pillar and articles', async () => {
    const articles: PlannedArticle[] = [
      {
        title: 'Article 1',
        primaryKeyword: 'keyword-1',
        secondaryKeywords: [],
        intentType: 'informational',
        funnelStage: 'top',
        contentAngle: 'angle',
        format: 'guide',
        isPillar: false,
        priority: 'medium',
        refreshCandidate: null,
        type: 'new',
      },
      {
        title: 'Article 2',
        primaryKeyword: 'keyword-2',
        secondaryKeywords: [],
        intentType: 'informational',
        funnelStage: 'top',
        contentAngle: 'angle',
        format: 'guide',
        isPillar: false,
        priority: 'medium',
        refreshCandidate: null,
        type: 'new',
      },
    ];

    const cluster: PlannedSeries = {
      name: 'Test Series',
      pillarKeyword: 'pillar-kw',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles,
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.defaults.keywords).toContain('pillar-kw');
    expect(series.defaults.keywords).toContain('keyword-1');
    expect(series.defaults.keywords).toContain('keyword-2');
  });

  it('sets topic from rationale and gap note', async () => {
    const cluster: PlannedSeries = {
      name: 'Test Series',
      pillarKeyword: 'pillar',
      funnelStage: 'middle',
      clusterRationale: 'Cover the basics',
      coverageGapNote: 'Missing beginner content',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.topic).toBe('Cover the basics | Gap: Missing beginner content');
  });

  it('normalizes special characters in slug', async () => {
    const cluster: PlannedSeries = {
      name: 'C++ & JavaScript Guide!',
      pillarKeyword: 'programming',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.slug).toBe('c-javascript-guide');
  });

  it('trims leading/trailing hyphens from slug', async () => {
    const cluster: PlannedSeries = {
      name: '--Test Series--',
      pillarKeyword: 'test',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.slug).toBe('test-series');
  });
});

describe('buildQueueEntry', () => {
  function createMockSeries(overrides: Partial<Series> = {}): Series {
    return {
      name: 'Test Series',
      slug: 'test-series',
      topic: 'Test topic',
      publication: 'test-pub',
      editorialPolicy: {
        tone: '',
        forbiddenTopics: [],
        disclosureRequirements: [],
        audienceRestrictions: [],
        notes: '',
      },
      defaults: {
        keywords: ['test'],
        contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      },
      ...overrides,
    };
  }

  function createMockArticle(overrides: Partial<PlannedArticle> = {}): PlannedArticle {
    return {
      title: 'Test Article',
      primaryKeyword: 'test-keyword',
      secondaryKeywords: [],
      intentType: 'informational',
      funnelStage: 'top',
      contentAngle: 'Test angle',
      format: 'guide',
      isPillar: false,
      priority: 'medium',
      refreshCandidate: null,
      type: 'new',
      ...overrides,
    };
  }

  it('builds queue entry with correct idea', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.idea).toContain('guide');
    expect(entry.idea).toContain('test-keyword');
    expect(entry.idea).toContain('Test angle');
    expect(entry.idea).toContain('top funnel');
  });

  it('sets correct intent based on format', () => {
    const article = createMockArticle({ format: 'guide' });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.settings.intent).toBe('how-to-guide');
  });

  it('maps listicle format correctly', () => {
    const article = createMockArticle({ format: 'listicle' });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.settings.intent).toBe('listicle');
  });

  it('maps comparison format correctly', () => {
    const article = createMockArticle({ format: 'comparison' });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.settings.intent).toBe('deep-dive-analysis');
  });

  it('maps case-study format correctly', () => {
    const article = createMockArticle({ format: 'case-study' });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.settings.intent).toBe('case-study');
  });

  it('maps tutorial format correctly', () => {
    const article = createMockArticle({ format: 'tutorial' });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.settings.intent).toBe('tutorial');
  });

  it('maps opinion format correctly', () => {
    const article = createMockArticle({ format: 'opinion' });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.settings.intent).toBe('opinion-piece');
  });

  it('sets status to pending', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.status).toBe('pending');
  });

  it('sets series reference', () => {
    const article = createMockArticle();
    const series = createMockSeries({ name: 'My Series', slug: 'my-series' });
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.series).toEqual(series);
  });

  it('sets type and refreshTarget for refresh articles', () => {
    const article = createMockArticle({
      type: 'refresh',
      refreshTarget: 'old-article',
    });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.type).toBe('refresh');
    expect(entry.refreshTarget).toBe('old-article');
  });

  it('sets type to new for fresh articles', () => {
    const article = createMockArticle({ type: 'new' });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.type).toBe('new');
    expect(entry.refreshTarget).toBeUndefined();
  });

  it('uses provided content type in settings', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'blog-post');

    expect(entry.settings.contentTargets[0].contentType).toBe('blog-post');
  });
});
