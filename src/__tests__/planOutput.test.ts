import { describe, it, expect } from '@jest/globals';
import { formatPlanOutput, formatNoResultsOutput } from '../plan/output.js';
import type { Plan, PlannedSeries, PlannedArticle, DiscardedCandidate } from '../types/plan.js';

function createMockPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    mode: 'new-idea',
    lowVolumeMode: false,
    researchStats: {
      queryRoundsCompleted: 3,
      candidatesEvaluated: 50,
      candidatesPassed: 10,
      cacheHits: 20,
      apiCallsMade: 15,
    },
    series: [],
    articles: [],
    discardedCandidates: [],
    ...overrides,
  };
}

function createMockSeries(overrides: Partial<PlannedSeries> = {}): PlannedSeries {
  return {
    name: 'Test Series',
    pillarKeyword: 'test-keyword',
    funnelStage: 'top',
    clusterRationale: 'Test rationale',
    coverageGapNote: '',
    articles: [],
    ...overrides,
  };
}

function createMockArticle(overrides: Partial<PlannedArticle> = {}): PlannedArticle {
  return {
    title: 'Test Article',
    primaryKeyword: 'test-keyword',
    secondaryKeywords: ['secondary-1'],
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

describe('formatPlanOutput', () => {
  it('formats explore mode header correctly', () => {
    const plan = createMockPlan({ mode: 'new-idea' });
    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('# Plan: explore');
    expect(output).toContain('Mode: new-idea');
    expect(output).toContain('Publication: test-pub');
  });

  it('formats expand mode header correctly', () => {
    const plan = createMockPlan({ mode: 'expand-series' });
    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('# Plan: expand');
    expect(output).toContain('Mode: expand-series');
  });

  it('includes research stats', () => {
    const plan = createMockPlan();
    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('## Research');
    expect(output).toContain('Rounds: 3');
    expect(output).toContain('Candidates evaluated: 50');
    expect(output).toContain('Candidates passed: 10');
    expect(output).toContain('Cache hits: 20');
    expect(output).toContain('API calls: 15');
  });

  it('includes series details for explore mode', () => {
    const article = createMockArticle();
    const series = createMockSeries({
      name: 'Content Strategy',
      articles: [article],
    });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('## Series: Content Strategy');
    expect(output).toContain('Pillar keyword: test-keyword');
    expect(output).toContain('Funnel: top');
    expect(output).toContain('Rationale: Test rationale');
    expect(output).toContain('### Article: Test Article');
    expect(output).toContain('Primary keyword: test-keyword');
    expect(output).toContain('Intent: informational');
    expect(output).toContain('Format: guide');
    expect(output).toContain('Priority: medium');
  });

  it('includes articles section for expand mode', () => {
    const article = createMockArticle();
    const plan = createMockPlan({
      mode: 'expand-series',
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('## Articles');
    expect(output).toContain('### Article: Test Article');
    expect(output).toContain('Primary keyword: test-keyword');
  });

  it('includes discarded candidates when present', () => {
    const discarded: DiscardedCandidate[] = [
      { keyword: 'bad-keyword', kobScore: 0.5, reason: 'low score' },
    ];
    const plan = createMockPlan({ discardedCandidates: discarded });
    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('## Discarded');
    expect(output).toContain('bad-keyword');
    expect(output).toContain('KOB: 0.50');
    expect(output).toContain('low score');
  });

  it('includes low volume mode indicator', () => {
    const plan = createMockPlan({ lowVolumeMode: true });
    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('Low-volume: yes');
  });

  it('includes secondary keywords when present', () => {
    const article = createMockArticle({
      secondaryKeywords: ['kw1', 'kw2', 'kw3'],
    });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('Secondary keywords: kw1, kw2, kw3');
  });

  it('skips secondary keywords when empty', () => {
    const article = createMockArticle({
      secondaryKeywords: [],
    });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).not.toContain('Secondary keywords:');
  });

  it('includes confidence note when present', () => {
    const article = createMockArticle({
      confidenceNote: 'Low confidence due to sparse data',
    });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('Confidence: Low confidence due to sparse data');
  });

  it('includes refresh target when present', () => {
    const article = createMockArticle({
      type: 'refresh',
      refreshTarget: 'old-article-slug',
    });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('Refresh target: old-article-slug');
    expect(output).toContain('Type: refresh');
  });

  it('includes ideon queue add command for each article', () => {
    const article = createMockArticle();
    const series = createMockSeries({
      name: 'Content Strategy',
      articles: [article],
    });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('ideon queue add');
    expect(output).toContain('"Test Article"');
    expect(output).toContain('--publication test-pub');
    expect(output).toContain('--series content-strategy');
  });
});

describe('formatNoResultsOutput', () => {
  it('formats no results message correctly', () => {
    const output = formatNoResultsOutput('new-idea', 'test-pub', [], 0);

    expect(output).toContain('# Plan: explore');
    expect(output).toContain('Mode: new-idea');
    expect(output).toContain('Publication: test-pub');
    expect(output).toContain('## No Results');
    expect(output).toContain('Candidates found: 0');
    expect(output).toContain('Status: exhausted');
    expect(output).toContain('No sufficient demand signals found for this topic.');
  });

  it('includes pivot suggestions when present', () => {
    const output = formatNoResultsOutput(
      'new-idea',
      'test-pub',
      ['Try broader terms', 'Consider related topics'],
      5,
    );

    expect(output).toContain('## Pivot Suggestions');
    expect(output).toContain('Try broader terms');
    expect(output).toContain('Consider related topics');
  });

  it('handles expand mode', () => {
    const output = formatNoResultsOutput('expand-series', 'test-pub', [], 0);

    expect(output).toContain('# Plan: expand');
    expect(output).toContain('Mode: expand-series');
  });
});
