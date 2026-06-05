import { describe, it, expect } from '@jest/globals';
import {
  seedKeywordSchema,
  seedListSchema,
  keywordCandidateSchema,
  intentClassificationSchema,
  intentClassificationsSchema,
  articlePlanSchema,
  articlePlansSchema,
  clusterSchema,
  clustersSchema,
} from '../types/plan.js';

describe('seedKeywordSchema', () => {
  it('validates valid seed keyword', () => {
    const result = seedKeywordSchema.safeParse({
      keyword: 'test keyword',
      rationale: 'Test rationale',
      scope: 'head',
      estimatedIntent: 'informational',
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty keyword', () => {
    const result = seedKeywordSchema.safeParse({
      keyword: '',
      rationale: 'Test rationale',
      scope: 'head',
      estimatedIntent: 'informational',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid scope', () => {
    const result = seedKeywordSchema.safeParse({
      keyword: 'test',
      rationale: 'Test rationale',
      scope: 'invalid',
      estimatedIntent: 'informational',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid intent', () => {
    const result = seedKeywordSchema.safeParse({
      keyword: 'test',
      rationale: 'Test rationale',
      scope: 'head',
      estimatedIntent: 'invalid',
    });

    expect(result.success).toBe(false);
  });
});

describe('seedListSchema', () => {
  it('validates valid seed list', () => {
    const result = seedListSchema.safeParse({
      seeds: [
        {
          keyword: 'test',
          rationale: 'rationale',
          scope: 'head',
          estimatedIntent: 'informational',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing seeds array', () => {
    const result = seedListSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('keywordCandidateSchema', () => {
  it('validates valid candidate', () => {
    const result = keywordCandidateSchema.safeParse({
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: 'LOW',
      competitionIndex: 20,
      highTopOfPageBidMicros: 1000000,
      fromCache: false,
      sourceSeed: 'seed',
    });

    expect(result.success).toBe(true);
  });

  it('allows null values for optional fields', () => {
    const result = keywordCandidateSchema.safeParse({
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: null,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
    });

    expect(result.success).toBe(true);
  });

  it('validates competition enum values', () => {
    for (const comp of ['LOW', 'MEDIUM', 'HIGH']) {
      const result = keywordCandidateSchema.safeParse({
        keyword: 'test',
        normalised: 'test',
        avgMonthlySearches: 100,
        competition: comp,
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
      });

      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid competition value', () => {
    const result = keywordCandidateSchema.safeParse({
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: 'INVALID',
      competitionIndex: 20,
      highTopOfPageBidMicros: 1000000,
      fromCache: false,
      sourceSeed: 'seed',
    });

    expect(result.success).toBe(false);
  });
});

describe('intentClassificationSchema', () => {
  it('validates valid classification', () => {
    const result = intentClassificationSchema.safeParse({
      keyword: 'test',
      intentType: 'informational',
      intentScore: 3,
      reasoning: 'Test reasoning',
    });

    expect(result.success).toBe(true);
  });

  it('rejects intentScore out of range', () => {
    const result = intentClassificationSchema.safeParse({
      keyword: 'test',
      intentType: 'informational',
      intentScore: 6,
      reasoning: 'Test reasoning',
    });

    expect(result.success).toBe(false);
  });

  it('rejects intentScore below range', () => {
    const result = intentClassificationSchema.safeParse({
      keyword: 'test',
      intentType: 'informational',
      intentScore: 0,
      reasoning: 'Test reasoning',
    });

    expect(result.success).toBe(false);
  });
});

describe('intentClassificationsSchema', () => {
  it('validates valid classifications list', () => {
    const result = intentClassificationsSchema.safeParse({
      classifications: [
        {
          keyword: 'test',
          intentType: 'informational',
          intentScore: 3,
          reasoning: 'reasoning',
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});

describe('articlePlanSchema', () => {
  it('validates valid article plan', () => {
    const result = articlePlanSchema.safeParse({
      title: 'Test Article',
      primaryKeyword: 'test',
      secondaryKeywords: ['kw1', 'kw2'],
      intentType: 'informational',
      funnelStage: 'top',
      contentAngle: 'Test angle',
      format: 'guide',
      isPillar: false,
      priority: 'medium',
      refreshCandidate: null,
    });

    expect(result.success).toBe(true);
  });

  it('allows optional confidenceNote', () => {
    const result = articlePlanSchema.safeParse({
      title: 'Test Article',
      primaryKeyword: 'test',
      secondaryKeywords: [],
      intentType: 'informational',
      funnelStage: 'top',
      contentAngle: 'Test angle',
      format: 'guide',
      isPillar: false,
      priority: 'medium',
      confidenceNote: 'Low confidence',
      refreshCandidate: null,
    });

    expect(result.success).toBe(true);
  });

  it('validates format enum values', () => {
    const validFormats = ['guide', 'listicle', 'comparison', 'case-study', 'tutorial', 'opinion'];

    for (const format of validFormats) {
      const result = articlePlanSchema.safeParse({
        title: 'Test Article',
        primaryKeyword: 'test',
        secondaryKeywords: [],
        intentType: 'informational',
        funnelStage: 'top',
        contentAngle: 'Test angle',
        format,
        isPillar: false,
        priority: 'medium',
        refreshCandidate: null,
      });

      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid format', () => {
    const result = articlePlanSchema.safeParse({
      title: 'Test Article',
      primaryKeyword: 'test',
      secondaryKeywords: [],
      intentType: 'informational',
      funnelStage: 'top',
      contentAngle: 'Test angle',
      format: 'invalid',
      isPillar: false,
      priority: 'medium',
      refreshCandidate: null,
    });

    expect(result.success).toBe(false);
  });
});

describe('articlePlansSchema', () => {
  it('validates valid article plans list', () => {
    const result = articlePlansSchema.safeParse({
      articles: [
        {
          title: 'Test Article',
          primaryKeyword: 'test',
          secondaryKeywords: [],
          intentType: 'informational',
          funnelStage: 'top',
          contentAngle: 'Test angle',
          format: 'guide',
          isPillar: false,
          priority: 'medium',
          refreshCandidate: null,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});

describe('clusterSchema', () => {
  it('validates valid cluster', () => {
    const result = clusterSchema.safeParse({
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      funnelStage: 'top',
      supportingKeywords: ['kw1', 'kw2'],
      clusterRationale: 'Test rationale',
      coverageGapNote: '',
    });

    expect(result.success).toBe(true);
  });

  it('validates funnelStage enum values', () => {
    for (const stage of ['top', 'middle', 'bottom']) {
      const result = clusterSchema.safeParse({
        seriesName: 'Test Series',
        pillarKeyword: 'pillar',
        funnelStage: stage,
        supportingKeywords: [],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      });

      expect(result.success).toBe(true);
    }
  });
});

describe('clustersSchema', () => {
  it('validates valid clusters list', () => {
    const result = clustersSchema.safeParse({
      clusters: [
        {
          seriesName: 'Test Series',
          pillarKeyword: 'pillar',
          funnelStage: 'top',
          supportingKeywords: [],
          clusterRationale: 'rationale',
          coverageGapNote: '',
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
