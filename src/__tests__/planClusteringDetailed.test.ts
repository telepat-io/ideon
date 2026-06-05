import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { formClusters, clusterKeywordMap } from '../plan/clustering.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { AppSettings } from '../config/schema.js';
import type { KeywordCandidate, Clusters } from '../types/plan.js';

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
  } as unknown as AppSettings;
}

describe('clustering - formClusters', () => {
  let mockClient: jest.Mocked<OpenRouterClient>;
  let mockSettings: AppSettings;

  beforeEach(() => {
    mockClient = createMockOpenRouterClient();
    mockSettings = createMockSettings();
  });

  it('calls LLM with cluster formation messages', async () => {
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

    const mockResult: Clusters = {
      clusters: [{
        seriesName: 'Test Series',
        pillarKeyword: 'kw1',
        funnelStage: 'top',
        supportingKeywords: [],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    const result = await formClusters(mockClient, mockSettings, {
      shortlist,
      coverageMapKeys: [],
      excludeSeries: [],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(mockClient.requestStructured).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].seriesName).toBe('Test Series');
  });

  it('passes coverage map keys to LLM', async () => {
    const mockResult: Clusters = {
      clusters: [{
        seriesName: 'Test',
        pillarKeyword: 'pillar',
        funnelStage: 'top',
        supportingKeywords: [],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await formClusters(mockClient, mockSettings, {
      shortlist: [],
      coverageMapKeys: ['existing-1', 'existing-2'],
      excludeSeries: [],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(mockClient.requestStructured).toHaveBeenCalled();
  });

  it('passes exclude series to LLM', async () => {
    const mockResult: Clusters = {
      clusters: [{
        seriesName: 'Test',
        pillarKeyword: 'pillar',
        funnelStage: 'top',
        supportingKeywords: [],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await formClusters(mockClient, mockSettings, {
      shortlist: [],
      coverageMapKeys: [],
      excludeSeries: ['series-1', 'series-2'],
      desiredSeriesCount: 3,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(mockClient.requestStructured).toHaveBeenCalled();
  });

  it('passes desired series count to LLM', async () => {
    const mockResult: Clusters = {
      clusters: [{
        seriesName: 'Test',
        pillarKeyword: 'pillar',
        funnelStage: 'top',
        supportingKeywords: [],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await formClusters(mockClient, mockSettings, {
      shortlist: [],
      coverageMapKeys: [],
      excludeSeries: [],
      desiredSeriesCount: 5,
      countryCodes: ['US'],
      language: 'en',
    });

    expect(mockClient.requestStructured).toHaveBeenCalled();
  });

  it('passes target market to LLM', async () => {
    const mockResult: Clusters = {
      clusters: [{
        seriesName: 'Test',
        pillarKeyword: 'pillar',
        funnelStage: 'top',
        supportingKeywords: [],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await formClusters(mockClient, mockSettings, {
      shortlist: [],
      coverageMapKeys: [],
      excludeSeries: [],
      desiredSeriesCount: 3,
      countryCodes: ['US', 'GB'],
      language: 'en',
    });

    expect(mockClient.requestStructured).toHaveBeenCalled();
  });
});

describe('clustering - clusterKeywordMap detailed', () => {
  it('handles multiple clusters with overlapping keywords', () => {
    const clusters = [
      {
        seriesName: 'Series A',
        pillarKeyword: 'shared',
        funnelStage: 'top' as const,
        supportingKeywords: ['unique-a'],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      },
      {
        seriesName: 'Series B',
        pillarKeyword: 'unique-b',
        funnelStage: 'middle' as const,
        supportingKeywords: ['shared'],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      },
    ];

    const map = clusterKeywordMap(clusters);

    // Last cluster wins for overlapping keywords
    expect(map.get('shared')).toBe('Series B');
    expect(map.get('unique-a')).toBe('Series A');
    expect(map.get('unique-b')).toBe('Series B');
  });

  it('handles cluster with empty supporting keywords', () => {
    const clusters = [
      {
        seriesName: 'Solo',
        pillarKeyword: 'pillar',
        funnelStage: 'top' as const,
        supportingKeywords: [],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      },
    ];

    const map = clusterKeywordMap(clusters);

    expect(map.size).toBe(1);
    expect(map.get('pillar')).toBe('Solo');
  });

  it('handles empty clusters array', () => {
    const map = clusterKeywordMap([]);
    expect(map.size).toBe(0);
  });
});
