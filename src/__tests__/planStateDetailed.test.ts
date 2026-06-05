import { describe, it, expect } from '@jest/globals';
import { splitSeedsByCache } from '../plan/state.js';
import type { CacheSummary } from '../types/plan.js';

describe('state - splitSeedsByCache detailed', () => {
  it('handles single fresh seed', () => {
    const cacheSummary: CacheSummary = {
      'fresh': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
    };

    const result = splitSeedsByCache(['fresh'], cacheSummary);
    expect(result.freshSeeds).toEqual(['fresh']);
    expect(result.querySeeds).toEqual([]);
  });

  it('handles single stale seed', () => {
    const cacheSummary: CacheSummary = {
      'stale': {
        ageDays: 45,
        stale: true,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
    };

    const result = splitSeedsByCache(['stale'], cacheSummary);
    expect(result.freshSeeds).toEqual([]);
    expect(result.querySeeds).toEqual(['stale']);
  });

  it('handles seed with only bid data (no volume)', () => {
    const cacheSummary: CacheSummary = {
      'bid-only': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: null,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
    };

    const result = splitSeedsByCache(['bid only'], cacheSummary);
    expect(result.freshSeeds).toEqual(['bid only']);
    expect(result.querySeeds).toEqual([]);
  });

  it('handles seed with only volume data (no bid)', () => {
    const cacheSummary: CacheSummary = {
      'volume-only': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: null,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
    };

    const result = splitSeedsByCache(['volume only'], cacheSummary);
    expect(result.freshSeeds).toEqual(['volume only']);
    expect(result.querySeeds).toEqual([]);
  });

  it('handles seed with neither volume nor bid', () => {
    const cacheSummary: CacheSummary = {
      'empty': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: null,
        competition: null,
        highTopOfPageBidMicros: null,
        competitionIndex: null,
        sourceQueries: ['test'],
      },
    };

    const result = splitSeedsByCache(['empty'], cacheSummary);
    expect(result.freshSeeds).toEqual([]);
    expect(result.querySeeds).toEqual(['empty']);
  });

  it('normalizes keyword with spaces', () => {
    const cacheSummary: CacheSummary = {
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

    const result = splitSeedsByCache(['test  keyword'], cacheSummary);
    expect(result.freshSeeds).toEqual(['test  keyword']);
    expect(result.querySeeds).toEqual([]);
  });

  it('normalizes keyword with special characters', () => {
    const cacheSummary: CacheSummary = {
      'c-programming': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
    };

    const result = splitSeedsByCache(['C++ Programming!'], cacheSummary);
    expect(result.freshSeeds).toEqual(['C++ Programming!']);
    expect(result.querySeeds).toEqual([]);
  });

  it('handles empty cache summary', () => {
    const result = splitSeedsByCache(['any'], {});
    expect(result.freshSeeds).toEqual([]);
    expect(result.querySeeds).toEqual(['any']);
  });

  it('handles empty seed list', () => {
    const result = splitSeedsByCache([], {
      'test': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
    });
    expect(result.freshSeeds).toEqual([]);
    expect(result.querySeeds).toEqual([]);
  });

  it('handles both empty', () => {
    const result = splitSeedsByCache([], {});
    expect(result.freshSeeds).toEqual([]);
    expect(result.querySeeds).toEqual([]);
  });
});
