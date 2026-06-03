// @ts-nocheck
import { jest } from '@jest/globals';

const computeGkpFingerprintMock = jest.fn(() => 'fingerprint-test');
const isGkpQuerySnapshotFreshMock = jest.fn(() => true);
const loadGkpQuerySnapshotMock = jest.fn(async () => null);
const saveGkpQuerySnapshotMock = jest.fn(async (snapshot) => snapshot);
const loadGkpKeywordRecordMock = jest.fn(async () => null);
const saveGkpKeywordRecordMock = jest.fn(async (record) => record);
const normalizeKeywordKeyMock = jest.fn((keyword: string) => keyword.toLowerCase().replace(/\s+/g, '-'));

jest.unstable_mockModule('../config/gkpStore.js', () => ({
  computeGkpFingerprint: computeGkpFingerprintMock,
  isGkpQuerySnapshotFresh: isGkpQuerySnapshotFreshMock,
  loadGkpQuerySnapshot: loadGkpQuerySnapshotMock,
  saveGkpQuerySnapshot: saveGkpQuerySnapshotMock,
  loadGkpKeywordRecord: loadGkpKeywordRecordMock,
  saveGkpKeywordRecord: saveGkpKeywordRecordMock,
  normalizeKeywordKey: normalizeKeywordKeyMock,
}));

const mockClient = {
  generateKeywordIdeas: jest.fn(),
  getHistoricalMetrics: jest.fn(),
  getForecastData: jest.fn(),
};

const { CachedGkpClient } = await import('../integrations/keywordplanner/cachedClient.js');

function createIdeasResponse(overrides = {}) {
  return {
    ideas: [
      {
        text: 'test keyword',
        avgMonthlySearches: 1000,
        competition: 'LOW',
        competitionIndex: 20,
        lowTopOfPageBidMicros: 100000,
        highTopOfPageBidMicros: 500000,
        closeVariants: [],
      },
    ],
    count: 1,
    ...overrides,
  };
}

function createHistoricalResponse(overrides = {}) {
  return {
    keywords: [
      {
        text: 'test keyword',
        avgMonthlySearches: 2000,
        competition: 'MEDIUM',
        competitionIndex: 50,
        lowTopOfPageBidMicros: 300000,
        highTopOfPageBidMicros: 900000,
        monthlySearchVolumes: [],
      },
    ],
    count: 1,
    ...overrides,
  };
}

function createForecastResponse(overrides = {}) {
  return {
    campaignForecastMetrics: {
      averageCpcMicros: 3000000,
      clicks: 500,
      costMicros: 1500000000,
      conversions: 3,
      averageCpaMicros: 50000000,
    },
    ...overrides,
  };
}

describe('CachedGkpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    computeGkpFingerprintMock.mockReturnValue('fingerprint-test');
    isGkpQuerySnapshotFreshMock.mockReturnValue(true);
    loadGkpQuerySnapshotMock.mockResolvedValue(null);
    saveGkpQuerySnapshotMock.mockImplementation(async (snapshot) => snapshot);
    loadGkpKeywordRecordMock.mockResolvedValue(null);
    saveGkpKeywordRecordMock.mockImplementation(async (record) => record);
    normalizeKeywordKeyMock.mockImplementation((k: string) => k.toLowerCase().replace(/\s+/g, '-'));
  });

  describe('generateKeywordIdeas', () => {
    it('returns cached response without calling API when snapshot is fresh', async () => {
      const cached = createIdeasResponse();
      loadGkpQuerySnapshotMock.mockResolvedValue({
        version: 1,
        fingerprint: 'fingerprint-test',
        mode: 'ideas',
        savedAt: new Date().toISOString(),
        ttlDays: 30,
        response: cached,
      });

      const client = new CachedGkpClient({ client: mockClient as any });
      const result = await client.generateKeywordIdeas({ seedKeywords: ['seo'] });

      expect(result).toEqual(cached);
      expect(mockClient.generateKeywordIdeas).not.toHaveBeenCalled();
    });

    it('calls API and saves snapshot on cache miss', async () => {
      const fresh = createIdeasResponse();
      mockClient.generateKeywordIdeas.mockResolvedValue(fresh);

      const client = new CachedGkpClient({ client: mockClient as any });
      const result = await client.generateKeywordIdeas({ seedKeywords: ['seo'] });

      expect(result).toEqual(fresh);
      expect(mockClient.generateKeywordIdeas).toHaveBeenCalledWith({ seedKeywords: ['seo'] });
      expect(saveGkpQuerySnapshotMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fingerprint: 'fingerprint-test',
          mode: 'ideas',
          ttlDays: 30,
          response: fresh,
        }),
      );
    });

    it('bypasses cache when refresh option is set', async () => {
      const cached = createIdeasResponse();
      loadGkpQuerySnapshotMock.mockResolvedValue({
        version: 1,
        fingerprint: 'fingerprint-test',
        mode: 'ideas',
        savedAt: new Date().toISOString(),
        ttlDays: 30,
        response: cached,
      });
      const fresh = createIdeasResponse({ count: 2 });
      mockClient.generateKeywordIdeas.mockResolvedValue(fresh);

      const client = new CachedGkpClient({ client: mockClient as any });
      const result = await client.generateKeywordIdeas({ seedKeywords: ['seo'] }, { refresh: true });

      expect(result).toEqual(fresh);
      expect(mockClient.generateKeywordIdeas).toHaveBeenCalledTimes(1);
    });

    it('saves keyword records for each idea', async () => {
      const fresh = createIdeasResponse({
        ideas: [
          { text: 'seo tools', avgMonthlySearches: 12000, competition: 'MEDIUM', competitionIndex: 50, lowTopOfPageBidMicros: 500000, highTopOfPageBidMicros: 2000000, closeVariants: [] },
          { text: 'marketing', avgMonthlySearches: 8000, competition: 'HIGH', competitionIndex: 80, lowTopOfPageBidMicros: 1000000, highTopOfPageBidMicros: 5000000, closeVariants: [] },
        ],
        count: 2,
      });
      mockClient.generateKeywordIdeas.mockResolvedValue(fresh);

      const client = new CachedGkpClient({ client: mockClient as any, publication: 'my-blog', series: 'seo' });
      await client.generateKeywordIdeas({ seedKeywords: ['test'], countryCodes: ['US'], language: 'en' });

      expect(saveGkpKeywordRecordMock).toHaveBeenCalledTimes(2);
      expect(saveGkpKeywordRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'seo tools',
          publication: 'my-blog',
          series: 'seo',
          countryCodes: ['US'],
          language: 'en',
          sourceQueries: ['fingerprint-test'],
        }),
      );
    });

    it('includes publication and series in snapshot', async () => {
      mockClient.generateKeywordIdeas.mockResolvedValue(createIdeasResponse());

      const client = new CachedGkpClient({ client: mockClient as any, publication: 'pub', series: 'ser' });
      await client.generateKeywordIdeas({ seedKeywords: ['test'] });

      expect(saveGkpQuerySnapshotMock).toHaveBeenCalledWith(
        expect.objectContaining({
          publication: 'pub',
          series: 'ser',
        }),
      );
    });
  });

  describe('getHistoricalMetrics', () => {
    it('returns cached response without calling API', async () => {
      const cached = createHistoricalResponse();
      loadGkpQuerySnapshotMock.mockResolvedValue({
        version: 1,
        fingerprint: 'fingerprint-test',
        mode: 'historical',
        savedAt: new Date().toISOString(),
        ttlDays: 30,
        response: cached,
      });

      const client = new CachedGkpClient({ client: mockClient as any });
      const result = await client.getHistoricalMetrics({ keywords: ['seo'] });

      expect(result).toEqual(cached);
      expect(mockClient.getHistoricalMetrics).not.toHaveBeenCalled();
    });

    it('calls API and saves snapshot on cache miss', async () => {
      const fresh = createHistoricalResponse();
      mockClient.getHistoricalMetrics.mockResolvedValue(fresh);

      const client = new CachedGkpClient({ client: mockClient as any });
      const result = await client.getHistoricalMetrics({ keywords: ['seo'] });

      expect(result).toEqual(fresh);
      expect(saveGkpQuerySnapshotMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fingerprint: 'fingerprint-test',
          mode: 'historical',
          ttlDays: 30,
          response: fresh,
        }),
      );
    });

    it('saves keyword records', async () => {
      mockClient.getHistoricalMetrics.mockResolvedValue(createHistoricalResponse());

      const client = new CachedGkpClient({ client: mockClient as any });
      await client.getHistoricalMetrics({ keywords: ['seo'] });

      expect(saveGkpKeywordRecordMock).toHaveBeenCalledTimes(1);
      expect(saveGkpKeywordRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'test keyword' }),
      );
    });

    it('bypasses cache when refresh option is set', async () => {
      const cached = createHistoricalResponse();
      loadGkpQuerySnapshotMock.mockResolvedValue({
        version: 1,
        fingerprint: 'fingerprint-test',
        mode: 'historical',
        savedAt: new Date().toISOString(),
        ttlDays: 30,
        response: cached,
      });
      const fresh = createHistoricalResponse({ count: 5 });
      mockClient.getHistoricalMetrics.mockResolvedValue(fresh);

      const client = new CachedGkpClient({ client: mockClient as any });
      const result = await client.getHistoricalMetrics({ keywords: ['seo'] }, { refresh: true });

      expect(result).toEqual(fresh);
      expect(mockClient.getHistoricalMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('getForecastData', () => {
    it('returns cached response without calling API', async () => {
      const cached = createForecastResponse();
      loadGkpQuerySnapshotMock.mockResolvedValue({
        version: 1,
        fingerprint: 'fingerprint-test',
        mode: 'forecast',
        savedAt: new Date().toISOString(),
        ttlDays: 30,
        response: cached,
      });

      const client = new CachedGkpClient({ client: mockClient as any });
      const result = await client.getForecastData({ keywords: ['seo'] });

      expect(result).toEqual(cached);
      expect(mockClient.getForecastData).not.toHaveBeenCalled();
    });

    it('calls API and saves snapshot on cache miss', async () => {
      const fresh = createForecastResponse();
      mockClient.getForecastData.mockResolvedValue(fresh);

      const client = new CachedGkpClient({ client: mockClient as any });
      const result = await client.getForecastData({ keywords: ['seo'] });

      expect(result).toEqual(fresh);
      expect(saveGkpQuerySnapshotMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fingerprint: 'fingerprint-test',
          mode: 'forecast',
          ttlDays: 30,
          response: fresh,
        }),
      );
    });

    it('does not save keyword records', async () => {
      mockClient.getForecastData.mockResolvedValue(createForecastResponse());

      const client = new CachedGkpClient({ client: mockClient as any });
      await client.getForecastData({ keywords: ['seo'] });

      expect(saveGkpKeywordRecordMock).not.toHaveBeenCalled();
    });

    it('bypasses cache when refresh option is set', async () => {
      const cached = createForecastResponse();
      loadGkpQuerySnapshotMock.mockResolvedValue({
        version: 1,
        fingerprint: 'fingerprint-test',
        mode: 'forecast',
        savedAt: new Date().toISOString(),
        ttlDays: 30,
        response: cached,
      });
      const fresh = createForecastResponse({ campaignForecastMetrics: { averageCpcMicros: 1000000, clicks: 100, costMicros: 500000000, conversions: 1, averageCpaMicros: 10000000 } });
      mockClient.getForecastData.mockResolvedValue(fresh);

      const client = new CachedGkpClient({ client: mockClient as any });
      const result = await client.getForecastData({ keywords: ['seo'] }, { refresh: true });

      expect(result).toEqual(fresh);
      expect(mockClient.getForecastData).toHaveBeenCalledTimes(1);
    });
  });
});
