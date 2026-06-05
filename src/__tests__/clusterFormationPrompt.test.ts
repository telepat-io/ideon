import { describe, it, expect } from '@jest/globals';
import { buildClusterFormationMessages } from '../llm/prompts/clusterFormation.js';
import type { KeywordCandidate } from '../types/plan.js';

describe('buildClusterFormationMessages', () => {
  it('returns system and user messages', () => {
    const messages = buildClusterFormationMessages({
      shortlist: [],
      coverageMapKeys: [],
      excludeSeries: [],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes shortlist keywords in user message', () => {
    const shortlist: KeywordCandidate[] = [
      {
        keyword: 'kw1',
        normalised: 'kw1',
        avgMonthlySearches: 100,
        competition: 'LOW',
        competitionIndex: 20,
        highTopOfPageBidMicros: 1000000,
        fromCache: false,
        sourceSeed: 'seed',
        kobScore: 5,
        intentType: 'informational',
        intentScore: 4,
        volumeScore: 3,
        difficultyScore: 1,
      },
    ];

    const messages = buildClusterFormationMessages({
      shortlist,
      coverageMapKeys: [],
      excludeSeries: [],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(messages[1].content).toContain('kw1');
    expect(messages[1].content).toContain('kobScore');
    expect(messages[1].content).toContain('5');
  });

  it('includes coverage map keys', () => {
    const messages = buildClusterFormationMessages({
      shortlist: [],
      coverageMapKeys: ['existing-kw1', 'existing-kw2'],
      excludeSeries: [],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(messages[1].content).toContain('existing-kw1, existing-kw2');
    expect(messages[1].content).toContain('Already covered');
  });

  it('shows (none) when no coverage map keys', () => {
    const messages = buildClusterFormationMessages({
      shortlist: [],
      coverageMapKeys: [],
      excludeSeries: [],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(messages[1].content).toContain('(none)');
  });

  it('includes series to exclude', () => {
    const messages = buildClusterFormationMessages({
      shortlist: [],
      coverageMapKeys: [],
      excludeSeries: ['series-1', 'series-2'],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(messages[1].content).toContain('series-1, series-2');
    expect(messages[1].content).toContain('Series to avoid duplicating');
  });

  it('includes desired series count', () => {
    const messages = buildClusterFormationMessages({
      shortlist: [],
      coverageMapKeys: [],
      excludeSeries: [],
      desiredSeriesCount: 5,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(messages[1].content).toContain('5 series');
  });

  it('includes funnel stage options', () => {
    const messages = buildClusterFormationMessages({
      shortlist: [],
      coverageMapKeys: [],
      excludeSeries: [],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(messages[1].content).toContain('top / middle / bottom');
  });

  it('includes KOB score anchor rule', () => {
    const messages = buildClusterFormationMessages({
      shortlist: [],
      coverageMapKeys: [],
      excludeSeries: [],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(messages[1].content).toContain('KOB >= 4');
  });
});
