import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { runResearchLoop, DEFAULT_RESEARCH_PARAMS } from '../plan/research.js';
import type { CachedGkpClient } from '../integrations/keywordplanner/cachedClient.js';
import type { CacheSummary } from '../types/plan.js';

function createMockGkpClient(): jest.Mocked<CachedGkpClient> {
  return {
    generateKeywordIdeas: jest.fn(),
  } as unknown as jest.Mocked<CachedGkpClient>;
}

describe('DEFAULT_RESEARCH_PARAMS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_RESEARCH_PARAMS.targetCandidates).toBe(30);
    expect(DEFAULT_RESEARCH_PARAMS.maxQueryRounds).toBe(6);
    expect(DEFAULT_RESEARCH_PARAMS.diminishingReturnsThreshold).toBe(3);
    expect(DEFAULT_RESEARCH_PARAMS.maxBroadeningAttempts).toBe(2);
    expect(DEFAULT_RESEARCH_PARAMS.highCpcSignalMicros).toBe(3_000_000);
    expect(DEFAULT_RESEARCH_PARAMS.cacheTtlDays).toBe(30);
  });
});

describe('runResearchLoop', () => {
  let mockClient: jest.Mocked<CachedGkpClient>;
  let mockCache: CacheSummary;

  beforeEach(() => {
    mockClient = createMockGkpClient();
    mockCache = {};
  });

  it('returns empty result when no seeds provided', async () => {
    const result = await runResearchLoop(
      mockClient,
      [],
      ['US'],
      'en',
      DEFAULT_RESEARCH_PARAMS,
      mockCache,
    );

    expect(result.candidates.size).toBe(0);
    expect(result.queryRoundsCompleted).toBeGreaterThanOrEqual(0);
    expect(result.exhausted).toBe(false);
  });

  it('uses cache hits when available', async () => {
    mockCache = {
      'test-keyword': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
    };

    const result = await runResearchLoop(
      mockClient,
      ['test keyword'],
      ['US'],
      'en',
      { ...DEFAULT_RESEARCH_PARAMS, targetCandidates: 1 },
      mockCache,
    );

    expect(result.candidates.size).toBe(1);
    expect(result.cacheHits).toBe(1);
    expect(result.apiCallsMade).toBe(0);
  });

  it('makes API call when cache miss', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [
        {
          text: 'api-result-keyword',
          avgMonthlySearches: 50,
          competition: 'LOW',
          competitionIndex: 20,
          lowTopOfPageBidMicros: 200000,
          highTopOfPageBidMicros: 500000,
          closeVariants: [],
        },
      ],
      count: 1,
    });

    const result = await runResearchLoop(
      mockClient,
      ['uncached-seed'],
      ['US'],
      'en',
      { ...DEFAULT_RESEARCH_PARAMS, targetCandidates: 1 },
      mockCache,
    );

    expect(mockClient.generateKeywordIdeas).toHaveBeenCalledTimes(1);
    expect(result.apiCallsMade).toBe(1);
    expect(result.candidates.size).toBe(1);
  });

  it('stops when target candidates reached', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: Array(10).fill(null).map((_, i) => ({
        text: `keyword-${i}`,
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        lowTopOfPageBidMicros: 500000,
        highTopOfPageBidMicros: 1000000,
        closeVariants: [],
      })),
      count: 10,
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed-1', 'seed-2', 'seed-3'],
      ['US'],
      'en',
      { ...DEFAULT_RESEARCH_PARAMS, targetCandidates: 5 },
      mockCache,
    );

    expect(result.candidates.size).toBeGreaterThanOrEqual(5);
  });

  it('handles API errors gracefully', async () => {
    mockClient.generateKeywordIdeas.mockRejectedValue(new Error('API error'));

    const result = await runResearchLoop(
      mockClient,
      ['failing-seed'],
      ['US'],
      'en',
      { ...DEFAULT_RESEARCH_PARAMS, targetCandidates: 1, maxQueryRounds: 1 },
      mockCache,
    );

    expect(result.candidates.size).toBe(0);
  });

  it('generates long-tail variants when many ideas returned', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: Array(15).fill(null).map((_, i) => ({
        text: `idea-${i}`,
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        lowTopOfPageBidMicros: 500000,
        highTopOfPageBidMicros: 1000000,
        closeVariants: [],
      })),
      count: 15,
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed-with-many-ideas'],
      ['US'],
      'en',
      { ...DEFAULT_RESEARCH_PARAMS, targetCandidates: 50, maxQueryRounds: 3 },
      mockCache,
    );

    // Should have at least the 15 ideas from the API
    expect(result.candidates.size).toBeGreaterThanOrEqual(15);
  });

  it('emits round events', async () => {
    const events: Array<{ type: string; round?: number }> = [];

    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'test',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        lowTopOfPageBidMicros: 500000,
        highTopOfPageBidMicros: 1000000,
        closeVariants: [],
      }],
      count: 1,
    });

    await runResearchLoop(
      mockClient,
      ['seed'],
      ['US'],
      'en',
      { ...DEFAULT_RESEARCH_PARAMS, targetCandidates: 1 },
      mockCache,
      (event) => events.push(event),
    );

    const roundEvents = events.filter((e) => e.type === 'round');
    expect(roundEvents.length).toBeGreaterThan(0);
    expect(roundEvents[0].round).toBe(1);
  });

  it('emits cache-hit events', async () => {
    const events: Array<{ type: string; keyword?: string }> = [];

    mockCache = {
      'cached-keyword': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
    };

    await runResearchLoop(
      mockClient,
      ['cached keyword'],
      ['US'],
      'en',
      { ...DEFAULT_RESEARCH_PARAMS, targetCandidates: 1 },
      mockCache,
      (event) => events.push(event),
    );

    const cacheEvents = events.filter((e) => e.type === 'cache-hit');
    expect(cacheEvents.length).toBe(1);
    expect(cacheEvents[0].keyword).toBe('cached keyword');
  });

  it('emits api-call events', async () => {
    const events: Array<{ type: string; keyword?: string }> = [];

    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'api-result',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        lowTopOfPageBidMicros: 500000,
        highTopOfPageBidMicros: 1000000,
        closeVariants: [],
      }],
      count: 1,
    });

    await runResearchLoop(
      mockClient,
      ['api-seed'],
      ['US'],
      'en',
      { ...DEFAULT_RESEARCH_PARAMS, targetCandidates: 1 },
      mockCache,
      (event) => events.push(event),
    );

    const apiEvents = events.filter((e) => e.type === 'api-call');
    expect(apiEvents.length).toBe(1);
    expect(apiEvents[0].keyword).toBe('api-seed');
  });

  it('deduplicates candidates by normalized keyword', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [
        { text: 'Duplicate Keyword', avgMonthlySearches: 100, competition: 'LOW', competitionIndex: 20, lowTopOfPageBidMicros: 500000, highTopOfPageBidMicros: 1000000, closeVariants: [] },
        { text: 'duplicate-keyword', avgMonthlySearches: 200, competition: 'MEDIUM', competitionIndex: 40, lowTopOfPageBidMicros: 1000000, highTopOfPageBidMicros: 2000000, closeVariants: [] },
      ],
      count: 2,
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed'],
      ['US'],
      'en',
      { ...DEFAULT_RESEARCH_PARAMS, targetCandidates: 5 },
      mockCache,
    );

    expect(result.candidates.size).toBe(1);
  });
});
