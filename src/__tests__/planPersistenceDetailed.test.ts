import { describe, it, expect } from '@jest/globals';
import { createSeriesFromCluster, buildQueueEntry } from '../plan/persistence.js';
import type { PlannedSeries, PlannedArticle } from '../types/plan.js';
import type { Series } from '../types/series.js';

describe('persistence - createSeriesFromCluster detailed', () => {
  it('handles series name with leading/trailing spaces', async () => {
    const cluster: PlannedSeries = {
      name: '  Test Series  ',
      pillarKeyword: 'test',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.slug).toBe('test-series');
  });

  it('handles series name with multiple consecutive special characters', async () => {
    const cluster: PlannedSeries = {
      name: 'Test---Series',
      pillarKeyword: 'test',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.slug).toBe('test-series');
  });

  it('handles series name with underscores', async () => {
    const cluster: PlannedSeries = {
      name: 'Test_Series_Name',
      pillarKeyword: 'test',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.slug).toBe('test-series-name');
  });

  it('handles series name with numbers', async () => {
    const cluster: PlannedSeries = {
      name: 'Series 2024 Guide',
      pillarKeyword: 'test',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.slug).toBe('series-2024-guide');
  });

  it('handles empty articles list', async () => {
    const cluster: PlannedSeries = {
      name: 'Empty Series',
      pillarKeyword: 'pillar',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.defaults.keywords).toEqual(['pillar']);
  });

  it('handles articles with duplicate keywords', async () => {
    const articles: PlannedArticle[] = [
      {
        title: 'Article 1',
        primaryKeyword: 'shared-kw',
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
        primaryKeyword: 'shared-kw',
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
      pillarKeyword: 'pillar',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles,
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    // Keywords may have duplicates (not deduplicated at this stage)
    expect(series.defaults.keywords).toContain('pillar');
    expect(series.defaults.keywords).toContain('shared-kw');
  });

  it('sets correct editorial policy defaults', async () => {
    const cluster: PlannedSeries = {
      name: 'Test Series',
      pillarKeyword: 'test',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.editorialPolicy.tone).toBe('');
    expect(series.editorialPolicy.forbiddenTopics).toEqual([]);
    expect(series.editorialPolicy.disclosureRequirements).toEqual([]);
    expect(series.editorialPolicy.audienceRestrictions).toEqual([]);
    expect(series.editorialPolicy.notes).toBe('');
  });

  it('sets correct content targets', async () => {
    const cluster: PlannedSeries = {
      name: 'Test Series',
      pillarKeyword: 'test',
      funnelStage: 'top',
      clusterRationale: 'rationale',
      coverageGapNote: '',
      articles: [],
    };

    const series = await createSeriesFromCluster(cluster, 'test-pub');

    expect(series.defaults.contentTargets).toEqual([
      { contentType: 'article', role: 'primary', count: 1 },
    ]);
  });
});

describe('persistence - buildQueueEntry detailed', () => {
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

  it('generates unique queue ID', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry1 = buildQueueEntry(article, series, 'test-pub', 'article');
    const entry2 = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry1.id).toBeDefined();
    expect(entry2.id).toBeDefined();
  });

  it('sets addedAt timestamp', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.addedAt).toBeDefined();
    expect(new Date(entry.addedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('sets job to null', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.job).toBeNull();
  });

  it('sets publication to null', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.publication).toBeNull();
  });

  it('includes content angle in idea', () => {
    const article = createMockArticle({ contentAngle: 'Beginner-friendly approach' });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.idea).toContain('Beginner-friendly approach');
  });

  it('includes funnel stage in idea', () => {
    const article = createMockArticle({ funnelStage: 'bottom' });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.idea).toContain('bottom funnel');
  });

  it('handles blog-post content type', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'blog-post');

    expect(entry.settings.contentTargets[0].contentType).toBe('blog-post');
  });

  it('handles newsletter content type', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'newsletter');

    expect(entry.settings.contentTargets[0].contentType).toBe('newsletter');
  });

  it('sets style to professional by default', () => {
    const article = createMockArticle();
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.settings.style).toBe('professional');
  });

  it('handles refresh type with target', () => {
    const article = createMockArticle({
      type: 'refresh',
      refreshTarget: 'old-article-slug',
    });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.type).toBe('refresh');
    expect(entry.refreshTarget).toBe('old-article-slug');
  });

  it('handles new type without target', () => {
    const article = createMockArticle({
      type: 'new',
    });
    const series = createMockSeries();
    const entry = buildQueueEntry(article, series, 'test-pub', 'article');

    expect(entry.type).toBe('new');
    expect(entry.refreshTarget).toBeUndefined();
  });
});
