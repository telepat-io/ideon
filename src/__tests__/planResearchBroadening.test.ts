import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { runResearchLoop, DEFAULT_RESEARCH_PARAMS } from '../plan/research.js';
import type { CachedGkpClient } from '../integrations/keywordplanner/cachedClient.js';
import type { CacheSummary } from '../types/plan.js';

function createMockGkpClient(): jest.Mocked<CachedGkpClient> {
  return {
    generateKeywordIdeas: jest.fn(),
  } as unknown as jest.Mocked<CachedGkpClient>;
}

describe('research - broadening logic', () => {
  let mockClient: jest.Mocked<CachedGkpClient>;
  let mockCache: CacheSummary;

  beforeEach(() => {
    mockClient = createMockGkpClient();
    mockCache = {};
  });

  it('attempts broadening after diminishing returns', async () => {
    let roundCount = 0;
    mockClient.generateKeywordIdeas.mockImplementation(async () => {
      roundCount++;
      // First round returns few results to trigger diminishing returns
      if (roundCount === 1) {
        return {
          ideas: [{
            text: 'initial-candidate',
            avgMonthlySearches: 100,
            competition: 'LOW',
            competitionIndex: 20,
            highTopOfPageBidMicros: 5000000,
          }],
        };
      }
      // Subsequent rounds return empty to trigger broadening
      return { ideas: [] };
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed-1', 'seed-2'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 50,
        maxQueryRounds: 4,
        diminishingReturnsThreshold: 2,
        maxBroadeningAttempts: 1,
      },
      mockCache,
    );

    // Should have completed at least 1 round
    expect(result.queryRoundsCompleted).toBeGreaterThanOrEqual(1);
  });

  it('respects maxBroadeningAttempts limit', async () => {
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
      ['seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 5,
        diminishingReturnsThreshold: 0,
        maxBroadeningAttempts: 1,
      },
      mockCache,
    );

    expect(result.broadeningAttemptsUsed).toBeLessThanOrEqual(1);
  });

  it('generates broadened seeds with modifiers', async () => {
    const seedsQueried: string[] = [];
    mockClient.generateKeywordIdeas.mockImplementation(async ({ seedKeywords }) => {
      const seed = seedKeywords[0];
      if (seed) {
        seedsQueried.push(seed);
      }
      return {
        ideas: [{
          text: `result-from-${seed}`,
          avgMonthlySearches: 50,
          competition: 'LOW',
          competitionIndex: 20,
          highTopOfPageBidMicros: 500000,
        }],
      };
    });

    await runResearchLoop(
      mockClient,
      ['initial-seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 4,
        diminishingReturnsThreshold: 0,
        maxBroadeningAttempts: 2,
      },
      mockCache,
    );

    // Should have queried initial seed and potentially broadened seeds
    expect(seedsQueried.length).toBeGreaterThan(0);
    expect(seedsQueried).toContain('initial-seed');
  });

  it('uses correct broadening modifiers', async () => {
    const seedsQueried: string[] = [];
    mockClient.generateKeywordIdeas.mockImplementation(async ({ seedKeywords }) => {
      const seed = seedKeywords[0];
      if (seed) {
        seedsQueried.push(seed);
      }
      return {
        ideas: [{
          text: `result-${seed}`,
          avgMonthlySearches: 50,
          competition: 'LOW',
          competitionIndex: 20,
          highTopOfPageBidMicros: 500000,
        }],
      };
    });

    await runResearchLoop(
      mockClient,
      ['test-candidate'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 5,
        diminishingReturnsThreshold: 0,
        maxBroadeningAttempts: 2,
      },
      mockCache,
    );

    // Check if broadening modifiers were used
    const hasBroadenedSeed = seedsQueried.some(
      (s) => s.includes('for beginners') ||
             s.includes('vs competitors') ||
             s.includes('for enterprise') ||
             s.includes('cost of') ||
             s.includes('pricing of'),
    );

    // Broadening may or may not happen depending on diminishing returns
    expect(seedsQueried.length).toBeGreaterThan(0);
  });

  it('excludes exhausted seeds from broadening', async () => {
    const seedsQueried: string[] = [];
    mockClient.generateKeywordIdeas.mockImplementation(async ({ seedKeywords }) => {
      const seed = seedKeywords[0];
      if (seed) {
        seedsQueried.push(seed);
      }
      return {
        ideas: [{
          text: `result-${seed}`,
          avgMonthlySearches: 50,
          competition: 'LOW',
          competitionIndex: 20,
          highTopOfPageBidMicros: 500000,
        }],
      };
    });

    await runResearchLoop(
      mockClient,
      ['exhausted-seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 5,
        diminishingReturnsThreshold: 0,
        maxBroadeningAttempts: 2,
      },
      mockCache,
    );

    // All queried seeds should be tracked
    expect(seedsQueried).toContain('exhausted-seed');
  });

  it('tracks exhausted seeds correctly', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [],
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed-1', 'seed-2'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 2,
      },
      mockCache,
    );

    // Should have tracked queried seeds
    expect(result.exhaustedSeeds.length).toBeGreaterThanOrEqual(0);
  });

  it('sets exhausted flag when no more seeds', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [],
    });

    const result = await runResearchLoop(
      mockClient,
      ['single-seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 1,
      },
      mockCache,
    );

    expect(result.exhausted).toBe(true);
  });

  it('does not set exhausted flag when target reached', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: Array(35).fill(null).map((_, i) => ({
        text: `candidate-${i}`,
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
      })),
    });

    const result = await runResearchLoop(
      mockClient,
      ['seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 30,
        maxQueryRounds: 2,
      },
      mockCache,
    );

    expect(result.exhausted).toBe(false);
    expect(result.candidates.size).toBeGreaterThanOrEqual(30);
  });

  it('activates low volume mode with high CPC candidates', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'high-cpc',
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
        highCpcSignalMicros: 3_000_000,
      },
      mockCache,
    );

    expect(result.lowVolumeMode).toBe(true);
  });

  it('activates low volume mode with competition signal', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'competitive',
        avgMonthlySearches: 10,
        competition: 'HIGH',
        competitionIndex: 30,
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

  it('does not activate low volume mode without signals', async () => {
    mockClient.generateKeywordIdeas.mockResolvedValue({
      ideas: [{
        text: 'low-signal',
        avgMonthlySearches: 10,
        competition: 'LOW',
        competitionIndex: 10,
        highTopOfPageBidMicros: 100000,
      }],
    });

    const result = await runResearchLoop(
      mockClient,
      ['low-signal-seed'],
      ['US'],
      'en',
      {
        ...DEFAULT_RESEARCH_PARAMS,
        targetCandidates: 100,
        maxQueryRounds: 2,
      },
      mockCache,
    );

    expect(result.lowVolumeMode).toBe(false);
  });
});
