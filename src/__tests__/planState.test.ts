import { describe, it, expect } from '@jest/globals';
import { splitSeedsByCache, loadSeriesKeywords } from '../plan/state.js';
import type { CacheSummary } from '../types/plan.js';

describe('splitSeedsByCache', () => {
  it('returns empty arrays when no seeds provided', () => {
    const cacheSummary: CacheSummary = {};
    const result = splitSeedsByCache([], cacheSummary);
    expect(result.freshSeeds).toEqual([]);
    expect(result.querySeeds).toEqual([]);
  });

  it('classifies fresh cache entries as freshSeeds', () => {
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

    const result = splitSeedsByCache(['test keyword'], cacheSummary);
    expect(result.freshSeeds).toEqual(['test keyword']);
    expect(result.querySeeds).toEqual([]);
  });

  it('classifies stale cache entries as querySeeds', () => {
    const cacheSummary: CacheSummary = {
      'test-keyword': {
        ageDays: 45,
        stale: true,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['test'],
      },
    };

    const result = splitSeedsByCache(['test keyword'], cacheSummary);
    expect(result.freshSeeds).toEqual([]);
    expect(result.querySeeds).toEqual(['test keyword']);
  });

  it('classifies missing cache entries as querySeeds', () => {
    const cacheSummary: CacheSummary = {};
    const result = splitSeedsByCache(['new keyword'], cacheSummary);
    expect(result.freshSeeds).toEqual([]);
    expect(result.querySeeds).toEqual(['new keyword']);
  });

  it('classifies entries with null volume and null bid as querySeeds', () => {
    const cacheSummary: CacheSummary = {
      'test-keyword': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: null,
        competition: null,
        highTopOfPageBidMicros: null,
        competitionIndex: null,
        sourceQueries: ['test'],
      },
    };

    const result = splitSeedsByCache(['test keyword'], cacheSummary);
    expect(result.freshSeeds).toEqual([]);
    expect(result.querySeeds).toEqual(['test keyword']);
  });

  it('handles mixed cache states correctly', () => {
    const cacheSummary: CacheSummary = {
      'fresh-keyword': {
        ageDays: 5,
        stale: false,
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
        competitionIndex: 20,
        sourceQueries: ['fresh'],
      },
      'stale-keyword': {
        ageDays: 45,
        stale: true,
        avgMonthlySearches: 50,
        competition: 'MEDIUM',
        highTopOfPageBidMicros: 500000,
        competitionIndex: 50,
        sourceQueries: ['stale'],
      },
    };

    const result = splitSeedsByCache(['fresh keyword', 'stale keyword', 'missing keyword'], cacheSummary);
    expect(result.freshSeeds).toEqual(['fresh keyword']);
    expect(result.querySeeds).toEqual(['stale keyword', 'missing keyword']);
  });

  it('normalizes keyword keys for cache lookup', () => {
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

    const result = splitSeedsByCache(['Test  Keyword'], cacheSummary);
    expect(result.freshSeeds).toEqual(['Test  Keyword']);
    expect(result.querySeeds).toEqual([]);
  });
});

describe('loadSeriesKeywords', () => {
  it('returns empty array when series not found', async () => {
    const result = await loadSeriesKeywords('non-existent-series');
    expect(result).toEqual([]);
  });
});
