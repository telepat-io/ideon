import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { planArticlesForCluster, planArticlesForSeries } from '../plan/articles.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { AppSettings } from '../config/schema.js';
import type { Cluster, ArticlePlans } from '../types/plan.js';

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

describe('planArticlesForCluster', () => {
  let mockClient: jest.Mocked<OpenRouterClient>;
  let mockSettings: AppSettings;

  beforeEach(() => {
    mockClient = createMockOpenRouterClient();
    mockSettings = createMockSettings();
  });

  it('calls LLM with article planning messages', async () => {
    const mockCluster: Cluster = {
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      funnelStage: 'top',
      supportingKeywords: ['kw1', 'kw2'],
      clusterRationale: 'rationale',
      coverageGapNote: '',
    };

    const mockResult: ArticlePlans = {
      articles: [
        {
          title: 'Article 1',
          primaryKeyword: 'kw1',
          secondaryKeywords: [],
          intentType: 'informational',
          funnelStage: 'top',
          contentAngle: 'angle',
          format: 'guide',
          isPillar: true,
          priority: 'high',
          refreshCandidate: null,
        },
      ],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    const result = await planArticlesForCluster(mockClient, mockSettings, {
      cluster: mockCluster,
      desiredArticlesPerSeries: 3,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
    });

    expect(mockClient.requestStructured).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Article 1');
    expect(result[0].type).toBe('new');
  });

  it('maps refreshCandidate to type and refreshTarget', async () => {
    const mockCluster: Cluster = {
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      funnelStage: 'top',
      supportingKeywords: [],
      clusterRationale: 'rationale',
      coverageGapNote: '',
    };

    const mockResult: ArticlePlans = {
      articles: [
        {
          title: 'Refresh Article',
          primaryKeyword: 'kw1',
          secondaryKeywords: [],
          intentType: 'informational',
          funnelStage: 'top',
          contentAngle: 'angle',
          format: 'guide',
          isPillar: false,
          priority: 'medium',
          refreshCandidate: 'old-article-slug',
        },
      ],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    const result = await planArticlesForCluster(mockClient, mockSettings, {
      cluster: mockCluster,
      desiredArticlesPerSeries: 1,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
    });

    expect(result[0].type).toBe('refresh');
    expect(result[0].refreshTarget).toBe('old-article-slug');
  });

  it('passes existing articles to prevent duplication', async () => {
    const mockCluster: Cluster = {
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      funnelStage: 'top',
      supportingKeywords: [],
      clusterRationale: 'rationale',
      coverageGapNote: '',
    };

    const mockResult: ArticlePlans = {
      articles: [],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    await planArticlesForCluster(mockClient, mockSettings, {
      cluster: mockCluster,
      desiredArticlesPerSeries: 1,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [
        { title: 'Existing Article', keywords: ['existing-kw'] },
      ],
      coverageOverlap: [],
    });

    expect(mockClient.requestStructured).toHaveBeenCalled();
  });
});

describe('planArticlesForSeries', () => {
  let mockClient: jest.Mocked<OpenRouterClient>;
  let mockSettings: AppSettings;

  beforeEach(() => {
    mockClient = createMockOpenRouterClient();
    mockSettings = createMockSettings();
  });

  it('calls LLM with series article planning messages', async () => {
    const mockResult: ArticlePlans = {
      articles: [
        {
          title: 'Series Article',
          primaryKeyword: 'kw1',
          secondaryKeywords: [],
          intentType: 'informational',
          funnelStage: 'middle',
          contentAngle: 'angle',
          format: 'tutorial',
          isPillar: false,
          priority: 'medium',
          refreshCandidate: null,
        },
      ],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    const result = await planArticlesForSeries(mockClient, mockSettings, {
      seriesName: 'Existing Series',
      pillarKeyword: 'pillar',
      supportingKeywords: ['kw1'],
      funnelStage: 'middle',
      desiredArticleCount: 2,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
    });

    expect(mockClient.requestStructured).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Series Article');
  });

  it('handles empty article list', async () => {
    const mockResult: ArticlePlans = {
      articles: [],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    const result = await planArticlesForSeries(mockClient, mockSettings, {
      seriesName: 'Empty Series',
      pillarKeyword: 'pillar',
      supportingKeywords: [],
      funnelStage: 'top',
      desiredArticleCount: 1,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
    });

    expect(result).toHaveLength(0);
  });
});
