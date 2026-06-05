import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { generateSeeds, broadenSeeds } from '../plan/seeds.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { AppSettings } from '../config/schema.js';
import type { SeedList, ExhaustionRecord } from '../types/plan.js';

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
  } as AppSettings;
}

describe('seeds - generateSeeds', () => {
  let mockClient: jest.Mocked<OpenRouterClient>;
  let mockSettings: AppSettings;

  beforeEach(() => {
    mockClient = createMockOpenRouterClient();
    mockSettings = createMockSettings();
  });

  it('calls LLM with seed generation messages', async () => {
    const mockResult: SeedList = {
      seeds: [{
        keyword: 'test-seed',
        rationale: 'Test rationale',
        scope: 'head',
        estimatedIntent: 'informational',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    const result = await generateSeeds(mockClient, mockSettings, {
      contentIdea: 'test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(mockClient.requestStructured).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe('test-seed');
  });

  it('passes business context to LLM', async () => {
    const mockResult: SeedList = { seeds: [] };
    mockClient.requestStructured.mockResolvedValue(mockResult);

    await generateSeeds(mockClient, mockSettings, {
      contentIdea: 'test idea',
      businessContext: 'B2B SaaS company targeting enterprises',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(mockClient.requestStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('B2B SaaS company targeting enterprises'),
          }),
        ]),
      }),
    );
  });

  it('passes coverage map keys to LLM', async () => {
    const mockResult: SeedList = { seeds: [] };
    mockClient.requestStructured.mockResolvedValue(mockResult);

    await generateSeeds(mockClient, mockSettings, {
      contentIdea: 'test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: ['existing-kw-1', 'existing-kw-2'],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(mockClient.requestStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('existing-kw-1'),
          }),
        ]),
      }),
    );
  });

  it('passes exhaustion records to LLM', async () => {
    const mockResult: SeedList = { seeds: [] };
    mockClient.requestStructured.mockResolvedValue(mockResult);

    const exhaustionRecords: ExhaustionRecord[] = [{
      seeds: ['exhausted-1', 'exhausted-2'],
      exhaustedAt: '2024-01-01',
      pivotSuggestions: ['pivot-1'],
    }];

    await generateSeeds(mockClient, mockSettings, {
      contentIdea: 'test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords,
      seedKeywords: [],
    });

    expect(mockClient.requestStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('exhausted-1'),
          }),
        ]),
      }),
    );
  });

  it('passes seed keywords to LLM', async () => {
    const mockResult: SeedList = { seeds: [] };
    mockClient.requestStructured.mockResolvedValue(mockResult);

    await generateSeeds(mockClient, mockSettings, {
      contentIdea: 'test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: ['enforced-1', 'enforced-2'],
    });

    expect(mockClient.requestStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('enforced-1'),
          }),
        ]),
      }),
    );
  });

  it('passes target market to LLM', async () => {
    const mockResult: SeedList = { seeds: [] };
    mockClient.requestStructured.mockResolvedValue(mockResult);

    await generateSeeds(mockClient, mockSettings, {
      contentIdea: 'test idea',
      countryCodes: ['US', 'GB', 'CA'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(mockClient.requestStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('US, GB, CA'),
          }),
        ]),
      }),
    );
  });

  it('returns seeds from LLM response', async () => {
    const mockResult: SeedList = {
      seeds: [
        { keyword: 'seed-1', rationale: 'rationale 1', scope: 'head', estimatedIntent: 'informational' },
        { keyword: 'seed-2', rationale: 'rationale 2', scope: 'long-tail', estimatedIntent: 'commercial' },
        { keyword: 'seed-3', rationale: 'rationale 3', scope: 'head', estimatedIntent: 'transactional' },
      ],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    const result = await generateSeeds(mockClient, mockSettings, {
      contentIdea: 'test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(result).toHaveLength(3);
    expect(result[0].keyword).toBe('seed-1');
    expect(result[1].scope).toBe('long-tail');
    expect(result[2].estimatedIntent).toBe('transactional');
  });
});

describe('seeds - broadenSeeds', () => {
  let mockClient: jest.Mocked<OpenRouterClient>;
  let mockSettings: AppSettings;

  beforeEach(() => {
    mockClient = createMockOpenRouterClient();
    mockSettings = createMockSettings();
  });

  it('calls LLM with broadening messages', async () => {
    const mockResult: SeedList = {
      seeds: [{
        keyword: 'broadened-seed',
        rationale: 'Adjacent angle',
        scope: 'long-tail',
        estimatedIntent: 'informational',
      }],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    const result = await broadenSeeds(mockClient, mockSettings, ['exhausted-1'], [
      { keyword: 'top-candidate', highTopOfPageBidMicros: 5000000 },
    ]);

    expect(mockClient.requestStructured).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].keyword).toBe('broadened-seed');
  });

  it('passes exhausted seeds to LLM', async () => {
    const mockResult: SeedList = { seeds: [] };
    mockClient.requestStructured.mockResolvedValue(mockResult);

    await broadenSeeds(mockClient, mockSettings, ['exhausted-1', 'exhausted-2'], []);

    expect(mockClient.requestStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('exhausted-1'),
          }),
        ]),
      }),
    );
  });

  it('passes top candidates with CPC to LLM', async () => {
    const mockResult: SeedList = { seeds: [] };
    mockClient.requestStructured.mockResolvedValue(mockResult);

    await broadenSeeds(mockClient, mockSettings, ['exhausted'], [
      { keyword: 'high-cpc', highTopOfPageBidMicros: 5000000 },
    ]);

    expect(mockClient.requestStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('high-cpc'),
          }),
        ]),
      }),
    );
  });

  it('handles null CPC values', async () => {
    const mockResult: SeedList = { seeds: [] };
    mockClient.requestStructured.mockResolvedValue(mockResult);

    await broadenSeeds(mockClient, mockSettings, ['exhausted'], [
      { keyword: 'no-cpc', highTopOfPageBidMicros: null },
    ]);

    expect(mockClient.requestStructured).toHaveBeenCalled();
  });

  it('returns broadened seeds from LLM response', async () => {
    const mockResult: SeedList = {
      seeds: [
        { keyword: 'broad-1', rationale: 'angle 1', scope: 'head', estimatedIntent: 'informational' },
        { keyword: 'broad-2', rationale: 'angle 2', scope: 'long-tail', estimatedIntent: 'commercial' },
      ],
    };

    mockClient.requestStructured.mockResolvedValue(mockResult);

    const result = await broadenSeeds(mockClient, mockSettings, ['exhausted'], []);

    expect(result).toHaveLength(2);
    expect(result[0].keyword).toBe('broad-1');
    expect(result[1].keyword).toBe('broad-2');
  });
});
