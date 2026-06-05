import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { classifyIntent, DEFAULT_SCORING_PARAMS, scoreAndFilter, computeKobScore } from '../plan/scoring.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { AppSettings } from '../config/schema.js';
import type { KeywordCandidate, IntentClassifications } from '../types/plan.js';

function createMockOpenRouterClient(): jest.Mocked<OpenRouterClient> {
  return {
    requestStructured: jest.fn(),
  } as unknown as jest.Mocked<OpenRouterClient>;
}

function createMockSettings(): AppSettings {
  return {
    model: 'test-model',
    style: 'professional',
    intent: 'tutorial',
    targetLength: 'medium',
    contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
    notifications: { enabled: false },
  } as AppSettings;
}

describe('scoring - classifyIntent', () => {
  let mockClient: jest.Mocked<OpenRouterClient>;
  let mockSettings: AppSettings;

  beforeEach(() => {
    mockClient = createMockOpenRouterClient();
    mockSettings = createMockSettings();
  });

  it('skips candidates that already have intent', async () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'already-classified',
        normalised: 'already-classified',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
        intentType: 'informational',
        intentScore: 3,
      },
    ];

    await classifyIntent(mockClient, mockSettings, candidates);

    expect(mockClient.requestStructured).not.toHaveBeenCalled();
  });

  it('classifies candidates without intent', async () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'unclassified',
        normalised: 'unclassified',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
      },
    ];

    const mockResult: IntentClassifications = {
      classifications: [{
        keyword: 'unclassified',
        intentType: 'commercial',
        intentScore: 4,
        reasoning: 'High CPC signal',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await classifyIntent(mockClient, mockSettings, candidates);

    expect(mockClient.requestStructured).toHaveBeenCalledTimes(1);
    expect(candidates[0].intentType).toBe('commercial');
    expect(candidates[0].intentScore).toBe(4);
  });

  it('handles mixed candidates (some classified, some not)', async () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'classified',
        normalised: 'classified',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
        intentType: 'informational',
        intentScore: 3,
      },
      {
        keyword: 'unclassified',
        normalised: 'unclassified',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
      },
    ];

    const mockResult: IntentClassifications = {
      classifications: [{
        keyword: 'unclassified',
        intentType: 'transactional',
        intentScore: 5,
        reasoning: 'Buying intent',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await classifyIntent(mockClient, mockSettings, candidates);

    expect(mockClient.requestStructured).toHaveBeenCalledTimes(1);
    expect(candidates[1].intentType).toBe('transactional');
    expect(candidates[1].intentScore).toBe(5);
    // First candidate should be unchanged
    expect(candidates[0].intentType).toBe('informational');
  });

  it('chunks large candidate lists', async () => {
    const candidates: KeywordCandidate[] = Array(60).fill(null).map((_, i) => ({
      keyword: `kw-${i}`,
      normalised: `kw-${i}`,
      avgMonthlySearches: 100,
      competition: 'LOW',
      competitionIndex: 20,
      highTopOfPageBidMicros: 1000000,
      fromCache: false,
      sourceSeed: 'seed',
    }));

    const mockResult: IntentClassifications = {
      classifications: candidates.map((c) => ({
        keyword: c.keyword,
        intentType: 'informational' as const,
        intentScore: 3,
        reasoning: 'test',
      })),
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await classifyIntent(mockClient, mockSettings, candidates);

    // Should be called twice (60 candidates / 50 per chunk = 2 calls)
    expect(mockClient.requestStructured).toHaveBeenCalledTimes(2);
  });

  it('matches classifications to candidates by normalized keyword', async () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'Test Keyword',
        normalised: 'test-keyword',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
      },
    ];

    const mockResult: IntentClassifications = {
      classifications: [{
        keyword: 'test-keyword',
        intentType: 'commercial',
        intentScore: 4,
        reasoning: 'test',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await classifyIntent(mockClient, mockSettings, candidates);

    expect(candidates[0].intentType).toBe('commercial');
    expect(candidates[0].intentScore).toBe(4);
  });

  it('passes candidate metrics to LLM', async () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'test',
        normalised: 'test',
        avgMonthlySearches: 500,
        competition: 'MEDIUM',
        competitionIndex: 50,
        highTopOfPageBidMicros: 2000000,
        fromCache: false,
        sourceSeed: 'seed',
      },
    ];

    const mockResult: IntentClassifications = {
      classifications: [{
        keyword: 'test',
        intentType: 'informational',
        intentScore: 3,
        reasoning: 'test',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await classifyIntent(mockClient, mockSettings, candidates);

    expect(mockClient.requestStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('500'),
          }),
        ]),
      }),
    );
  });
});

describe('scoring - normalizeKeywordKey', () => {
  it('normalizes keyword with spaces', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'test keyword',
        normalised: 'test-keyword',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);
    expect(result.shortlist.length).toBe(1);
  });

  it('handles empty keyword gracefully', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: '',
        normalised: 'untitled-keyword',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
        kobScore: 5,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);
    expect(result.shortlist.length).toBe(1);
  });
});

describe('scoring - computeKobScore formula', () => {
  it('computes correct score: (volume * intent) / difficulty', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 500,
      competition: 'LOW',
      competitionIndex: 20,
      highTopOfPageBidMicros: 1000000,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 4,
    };

    const score = computeKobScore(candidate);

    // volume=4, intent=4, difficulty=1 => (4*4)/1 = 16
    expect(score).toBe(16);
    expect(candidate.kobScore).toBe(16);
  });

  it('handles division by minimum difficulty', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: 'LOW',
      competitionIndex: 20,
      highTopOfPageBidMicros: 1000000,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 5,
    };

    const score = computeKobScore(candidate);

    // volume=3, intent=5, difficulty=1 => (3*5)/1 = 15
    expect(score).toBe(15);
  });

  it('handles maximum difficulty', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: 'HIGH',
      competitionIndex: 80,
      highTopOfPageBidMicros: 1000000,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };

    const score = computeKobScore(candidate);

    // volume=3, intent=3, difficulty=3 => (3*3)/3 = 3
    expect(score).toBe(3);
  });
});
