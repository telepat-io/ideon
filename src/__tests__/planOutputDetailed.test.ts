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

describe('output - formatPlanOutput detailed', () => {
  it('formats pillar article correctly', () => {
    const article = createMockArticle({ isPillar: true });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('Pillar: yes');
  });

  it('formats non-pillar article correctly', () => {
    const article = createMockArticle({ isPillar: false });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('Pillar: no');
  });

  it('formats type correctly for new articles', () => {
    const article = createMockArticle({ type: 'new' });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('Type: new');
  });

  it('formats type correctly for refresh articles', () => {
    const article = createMockArticle({
      type: 'refresh',
      refreshTarget: 'old-article',
    });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('Type: refresh');
    expect(output).toContain('Refresh target: old-article');
  });

  it('includes ideon queue command with correct series slug', () => {
    const article = createMockArticle();
    const series = createMockSeries({
      name: 'My Content Series',
      articles: [article],
    });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('--series my-content-series');
  });

  it('includes intent in queue command', () => {
    const article = createMockArticle({ format: 'guide' });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('--intent guide');
  });

  it('includes all keywords in queue command', () => {
    const article = createMockArticle({
      primaryKeyword: 'primary',
      secondaryKeywords: ['secondary-1', 'secondary-2'],
    });
    const series = createMockSeries({ articles: [article] });
    const plan = createMockPlan({
      mode: 'new-idea',
      series: [series],
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('primary, secondary-1, secondary-2');
  });

  it('handles expand mode with articles', () => {
    const article = createMockArticle();
    const plan = createMockPlan({
      mode: 'expand-series',
      articles: [article],
    });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('## Articles');
    expect(output).toContain('### Article: Test Article');
  });

  it('handles multiple discarded candidates', () => {
    const discarded: DiscardedCandidate[] = [
      { keyword: 'bad-1', kobScore: 0.5, reason: 'low score' },
      { keyword: 'bad-2', kobScore: 0.3, reason: 'no volume' },
      { keyword: 'bad-3', kobScore: 0.1, reason: 'low intent' },
    ];
    const plan = createMockPlan({ discardedCandidates: discarded });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).toContain('bad-1');
    expect(output).toContain('bad-2');
    expect(output).toContain('bad-3');
    expect(output).toContain('KOB: 0.50');
    expect(output).toContain('KOB: 0.30');
    expect(output).toContain('KOB: 0.10');
  });

  it('handles empty discarded candidates', () => {
    const plan = createMockPlan({ discardedCandidates: [] });

    const output = formatPlanOutput(plan, 'test-pub');

    expect(output).not.toContain('## Discarded');
  });
});

describe('output - formatNoResultsOutput detailed', () => {
  it('handles empty pivot suggestions', () => {
    const output = formatNoResultsOutput('new-idea', 'test-pub', [], 0);

    expect(output).not.toContain('## Pivot Suggestions');
  });

  it('handles single pivot suggestion', () => {
    const output = formatNoResultsOutput(
      'new-idea',
      'test-pub',
      ['Try broader terms'],
      0,
    );

    expect(output).toContain('## Pivot Suggestions');
    expect(output).toContain('Try broader terms');
  });

  it('handles multiple pivot suggestions', () => {
    const output = formatNoResultsOutput(
      'new-idea',
      'test-pub',
      ['Try broader terms', 'Consider related topics', 'Change market'],
      0,
    );

    expect(output).toContain('Try broader terms');
    expect(output).toContain('Consider related topics');
    expect(output).toContain('Change market');
  });

  it('includes candidates found count', () => {
    const output = formatNoResultsOutput('new-idea', 'test-pub', [], 42);

    expect(output).toContain('Candidates found: 42');
  });
});
