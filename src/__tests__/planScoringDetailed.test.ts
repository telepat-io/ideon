import { describe, it, expect } from '@jest/globals';
import {
  computeKobScore,
  scoreAndFilter,
  DEFAULT_SCORING_PARAMS,
} from '../plan/scoring.js';
import type { KeywordCandidate } from '../types/plan.js';

describe('scoring - volumeScore edge cases', () => {
  it('scores 0 searches as 1', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 0,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.volumeScore).toBe(1);
  });

  it('scores 9 searches as 1', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 9,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.volumeScore).toBe(1);
  });

  it('scores 10 searches as 2', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 10,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.volumeScore).toBe(2);
  });

  it('scores 99 searches as 2', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 99,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.volumeScore).toBe(2);
  });

  it('scores 100 searches as 3', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.volumeScore).toBe(3);
  });

  it('scores 499 searches as 3', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 499,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.volumeScore).toBe(3);
  });

  it('scores 500 searches as 4', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 500,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.volumeScore).toBe(4);
  });

  it('scores 1999 searches as 4', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 1999,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.volumeScore).toBe(4);
  });

  it('scores 2000 searches as 5', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 2000,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.volumeScore).toBe(5);
  });
});

describe('scoring - difficultyScore edge cases', () => {
  it('scores competitionIndex 0 as 1', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: null,
      competitionIndex: 0,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(1);
  });

  it('scores competitionIndex 32 as 1', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: null,
      competitionIndex: 32,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(1);
  });

  it('scores competitionIndex 33 as 2', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: null,
      competitionIndex: 33,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(2);
  });

  it('scores competitionIndex 65 as 2', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: null,
      competitionIndex: 65,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(2);
  });

  it('scores competitionIndex 66 as 3', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: null,
      competitionIndex: 66,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(3);
  });

  it('scores competitionIndex 100 as 3', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: null,
      competitionIndex: 100,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(3);
  });

  it('falls back to competition when competitionIndex is null', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: 'LOW',
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(1);
  });

  it('scores MEDIUM competition as 2', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: 'MEDIUM',
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(2);
  });

  it('scores HIGH competition as 3', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: 'HIGH',
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(3);
  });

  it('scores null competition as 3', () => {
    const candidate: KeywordCandidate = {
      keyword: 'test',
      normalised: 'test',
      avgMonthlySearches: 100,
      competition: null,
      competitionIndex: null,
      highTopOfPageBidMicros: null,
      fromCache: false,
      sourceSeed: 'seed',
      intentScore: 3,
    };
    computeKobScore(candidate);
    expect(candidate.difficultyScore).toBe(3);
  });
});

describe('scoring - scoreAndFilter edge cases', () => {
  it('keeps candidate with KOB exactly at threshold', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'edge',
        normalised: 'edge',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 3,
        kobScore: 2,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);
    expect(result.shortlist.length).toBe(1);
    expect(result.discarded.length).toBe(0);
  });

  it('discards candidate with KOB just below threshold', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'below',
        normalised: 'below',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 3,
        kobScore: 1.99,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);
    expect(result.shortlist.length).toBe(0);
    expect(result.discarded.length).toBe(1);
    expect(result.discarded[0].reason).toContain('1.99');
  });

  it('low volume mode threshold is 1', () => {
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

  it('discards all-zero signal candidate with low KOB', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'zero',
        normalised: 'zero',
        avgMonthlySearches: null,
        competition: null,
        competitionIndex: null,
        highTopOfPageBidMicros: null,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 1,
        kobScore: 0.5,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);
    expect(result.discarded.length).toBe(1);
    expect(result.discarded[0].reason).toContain('low KOB score, no volume signal, low intent');
  });

  it('keeps candidate with high KOB despite zero signals', () => {
    const candidates: KeywordCandidate[] = [
      {
        keyword: 'high-kob',
        normalised: 'high-kob',
        avgMonthlySearches: null,
        competition: null,
        competitionIndex: null,
        highTopOfPageBidMicros: null,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 1,
        kobScore: 5,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);
    expect(result.shortlist.length).toBe(1);
  });

  it('handles mixed candidates correctly', () => {
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
      {
        keyword: 'bad',
        normalised: 'bad',
        avgMonthlySearches: null,
        competition: null,
        competitionIndex: null,
        highTopOfPageBidMicros: null,
        fromCache: false,
        sourceSeed: 'seed',
        intentScore: 1,
        kobScore: 0.5,
      },
    ];

    const result = scoreAndFilter(candidates, DEFAULT_SCORING_PARAMS);
    expect(result.shortlist.length).toBe(1);
    expect(result.shortlist[0].keyword).toBe('good');
    expect(result.discarded.length).toBe(1);
    expect(result.discarded[0].keyword).toBe('bad');
  });
});
