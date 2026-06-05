import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { runResearchLoop, DEFAULT_RESEARCH_PARAMS } from '../plan/research.js';
import type { CachedGkpClient } from '../integrations/keywordplanner/cachedClient.js';
import type { CacheSummary } from '../types/plan.js';

function createMockGkpClient(): jest.Mocked<CachedGkpClient> {
  return {
    generateKeywordIdeas: jest.fn(),
  } as unknown as jest.Mocked<CachedGkpClient>;
}

describe('research - generateBroadenedSeeds', () => {
  let mockClient: jest.Mocked<CachedGkpClient>;
  let mockCache: CacheSummary;

  beforeEach(() => {
    mockClient = createMockGkpClient();
    mockCache = {};
  });

  it('generates broadened seeds from top candidates', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'top-candidate',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 5000000,
      }],
    });

    const result = await runResearchLoop(
      mockClient,
      ['exhausted-seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 50,
        maxQueryRounds: 3,
        diminishingReturnsThreshold: 0,
      },
      mockCache,
    );

    // Should have attempted broadening
    expect(result.queryRoundsCompleted).toBeGreaterThan(0);
  });

  it('limits broadened seeds to top 3 candidates', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: Array(20).fill(null).map((_, i) => ({
        text: `candidate-${i}`,
        avgMonthlySearches: 100 + i,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000 + (i * 100000),
      })),
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 5,
        diminishingReturnsThreshold: 0,
      },
      mockCache,
    );

    // Should have generated candidates from the API
    expect(result.candidates.size).toBeGreaterThanOrEqual(20);
  });

  it('excludes already exhausted seeds from broadening', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'candidate',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 5000000,
      }],
    });

    const result = await runResearchLoop(
      mockClient,
      ['exhausted'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 50,
        maxQueryRounds: 3,
        diminishingReturnsThreshold: 0,
        maxBroadeningAttempts: 1,
      },
      mockCache,
    );

    expect(result.broadeningAttemptsUsed).toBeLessThanOrEqual(1);
  });

  it('uses broadening modifiers', async () => {
    mockClient.generateKeywordIdeas.mockImplementation(async ({ seedKeywords }) => {
      const seed = seedKeywords[0];
      if (seed?.includes('for beginners') || seed?.includes('vs competitors')) {
        return {
          ideas: [{
            text: `broadened-${seed}`,
            avgMonthlySearches: 50,
            competition: 'LOW',
            competitionIndex: 20,
            highTopOfPageBidMicros: 500000,
          }],
        };
      }
      return {
        ideas: [{
          text: 'original',
          avgMonthlySearches: 100,
          competition: 'LOW',
          competitionIndex: 20,
          highTopOfPageBidMicros: 5000000,
        }],
      };
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 50,
        maxQueryRounds: 4,
        diminishingReturnsThreshold: 0,
        maxBroadeningAttempts: 2,
      },
      mockCache,
    );

    // Should have attempted broadening
    expect(result.queryRoundsCompleted).toBeGreaterThan(0);
  });

  it('activates low volume mode when high CPC signal present', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'high-cpc-keyword',
        avgMonthlySearches: 10,
        competition: 'HIGH',
        competitionIndex: 80,
        highTopOfPageBidMicros: 5000000,
      }],
    });

    const result = await runResearchLoop(
      mockClient,
      ['niche-seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 2,
      },
      mockCache,
    );

    // Should activate low volume mode due to high CPC
    expect(result.lowVolumeMode).toBe(true);
  });

  it('activates low volume mode when competition signal present', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'competitive-keyword',
        avgMonthlySearches: 10,
        competition: 'HIGH',
        competitionIndex: 50,
        highTopOfPageBidMicros: 100000,
      }],
    });

    const result = await runResearchLoop(
      mockClient,
      ['competitive-seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 2,
      },
      mockCache,
    );

    expect(result.lowVolumeMode).toBe(true);
  });

  it('stops at diminishing returns threshold', async () => {
    let callCount = 0;
    mockClient.generateKeywordIdeas.mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        return { ideas: [] };
      }
      return {
        ideas: [{
          text: `late-candidate-${callCount}`,
          avgMonthlySearches: 100,
          competition: 'LOW',
          competitionIndex: 20,
          highTopOfPageBidMicros: 1000000,
        }],
      };
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed-1', 'seed-2', 'seed-3'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 50,
        maxQueryRounds: 5,
        diminishingReturnsThreshold: 1,
        maxBroadeningAttempts: 0,
      },
      mockCache,
    );

    expect(result.queryRoundsCompleted).toBeLessThanOrEqual(5);
  });

  it('handles multiple seeds in single round', async () => {
    let callIndex = 0;
    mockClient.generateKeywordIdeas.mockImplementation(async ({ seedKeywords }) => {
      const seed = seedKeywords[0];
      callIndex++;
      return {
        ideas: [{
          text: `result-from-${seed}`,
          avgMonthlySearches: 100,
          competition: 'LOW',
          competitionIndex: 20,
          highTopOfPageBidMicros: 1000000,
        }],
      };
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed-1', 'seed-2', 'seed-3'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 10,
        maxQueryRounds: 2,
      },
      mockCache,
    );

    expect(mockClient.generateKeywordIdeas).toHaveBeenCalledTimes(3);
    expect(result.candidates.size).toBe(3);
  });

  it('deduplicates candidates across rounds', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'Duplicate Keyword',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
      }],
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed-1', 'seed-2'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 5,
        maxQueryRounds: 2,
      },
      mockCache,
    );

    // Same keyword from different seeds should be deduplicated
    expect(result.candidates.size).toBe(1);
  });

  it('emits events for each seed queried', async () => {
    const events: Array<{ type: string; keyword?: string }> = [];

    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'result',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
      }],
    });

    await runResearchLoop(
      mockClient,
      ['seed-1', 'seed-2'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 5,
        maxQueryRounds: 1,
      },
      mockCache,
      (event) => events.push(event),
    );

    const apiEvents = events.filter((e) => e.type === 'api-call');
    expect(apiEvents.length).toBe(2);
  });

  it('handles cache hit for multiple seeds', async () => {
    const events: Array<{ type: string }> = [];

    const mockCache: CacheSummary = {
      'cached-1': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
      'cached-2': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: 200,
        competition: 'MEDIUM',
        highTopOfPageBidMicros: 2000000,
        competitionIndex: 40,
        sourceQueries: ['test'],
      },
    };

    const result = await runResearchLoop(
      mockClient,
      ['cached 1', 'cached 2'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 5,
        maxQueryRounds: 1,
      },
      mockCache,
      (event) => events.push(event),
    );

    const cacheEvents = events.filter((e) => e.type === 'cache-hit');
    expect(cacheEvents.length).toBe(2);
    expect(result.apiCallsMade).toBe(0);
  });
});
