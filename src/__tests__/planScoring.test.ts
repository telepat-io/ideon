import { describe, it, expect } from '@jest/globals';
import { computeKobScore, scoreAndFilter, DEFAULT_SCORING_PARAMS } from '../plan/scoring.js';
import type { KeywordCandidate } from '../types/plan.js';

describe('computeKobScore', () => {
  it('computes score with all metrics present', () => {
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

    expect(candidate.volumeScore).toBe(4);
    expect(candidate.difficultyScore).toBe(1);
    expect(score).toBe(16);
  });

  it('handles null monthly searches', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: null,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };

    const score = computeKobScore(candidate);

    expect(candidate.volumeScore).toBe(1);
    expect(candidate.difficultyScore).toBe(3);
    expect(score).toBe(1);
  });

  it('handles null intent score', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: 'MEDIUM',
      competitionIndex: 50,
      highTopOfPageBidMicros: 500000,
      fromCache: false,
      sourceSeed: 'seed',
    };

    const score = computeKobScore(candidate);

    expect(candidate.volumeScore).toBe(3);
    expect(candidate.difficultyScore).toBe(2);
    expect(score).toBe(1.5);
  });

  it('uses competitionIndex over competition when both present', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 1000,
      competition: 'HIGH',
      competitionIndex: 30,
      highTopOfPageBidMicros: 2000000,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 5,
    };

    const score = computeKobScore(candidate);

    expect(candidate.difficultyScore).toBe(1);
    expect(candidate.volumeScore).toBe(4);
    expect(score).toBe(20);
  });

  it('falls back to competition when competitionIndex is null', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 2500,
      competition: 'HIGH',
      competitionIndex: null,
      highTopOfPageBidMicros: 3000000,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };

    const score = computeKobScore(candidate);

    expect(candidate.difficultyScore).toBe(3);
    expect(candidate.volumeScore).toBe(5);
    expect(score).toBe(5);
  });
});

describe('scoreAndFilter', () => {
  it('shortlists candidates with good KOB scores', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'good',
        normalised: 'good',
        avgMonthlySearches: 500,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 4,
        kobScore: 16,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);

    expect(result.shortlist.length).toBe(1);
    expect(result.discarded.length).toBe(0);
  });

  it('discards candidates with low KOB scores', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'bad',
        normalised: 'bad',
        avgMonthlySearches: 5,
        competition: 'HIGH',
        competitionIndex: 80,
        highTopOfPageBidMicros: 100000,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 1,
        kobScore: 0.33,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);

    expect(result.shortlist.length).toBe(0);
    expect(result.discarded.length).toBe(1);
    expect(result.discarded[0].keyword).toBe('bad');
  });

  it('computes KOB score if not present', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'no-score',
        normalised: 'no-score',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 500000,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 3,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);

    expect(result.shortlist.length).toBe(1);
    expect(candidates[0].kobScore).toBeDefined();
  });

  it('uses lower threshold in low volume mode', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'low-vol',
        normalised: 'low-vol',
        avgMonthlySearches: 5,
        competition: 'MEDIUM',
        competitionIndex: 40,
        highTopOfPageBidMicros: 200000,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 2,
        kobScore: 1.5,
      },
    ];

    const normalResult = scoreAndFilter(candidates, { lowVolumeMode: false });
    const lowVolResult = scoreAndFilter(candidates, { lowVolumeMode: true });

    expect(normalResult.shortlist.length).toBe(0);
    expect(lowVolResult.shortlist.length).toBe(1);
  });

  it('discards candidates with all zero signals and low KOB', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'zero-signals',
        normalised: 'zero-signals',
        avgMonthlySearches: null,
        competition: null,
        competitionIndex: null,
        highTopOfPageBidMicros: null,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 1,
        kobScore: 0.33,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);

    expect(result.discarded.length).toBe(1);
    expect(result.discarded[0].reason).toContain('low KOB score, no volume signal, low intent');
  });

  it('handles empty candidates array', () => {
    const result = scoreAndFilter([], DEFAULT_SCORING_PARAMS);
    expect(result.shortlist).toEqual([]);
    expect(result.discarded).toEqual([]);
  });
});
