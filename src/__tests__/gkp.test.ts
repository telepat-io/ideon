// @ts-nocheck
import { jest } from '@jest/globals';

const loadSecretsMock = jest.fn();
const readEnvSettingsMock = jest.fn();

jest.unstable_mockModule('../config/env.js', () => ({
  readEnvSettings: readEnvSettingsMock,
}));

jest.unstable_mockModule('../config/secretStore.js', () => ({
  loadSecrets: loadSecretsMock,
}));

const mockGkpClient = {
  generateKeywordIdeas: jest.fn(),
  getHistoricalMetrics: jest.fn(),
  getForecastData: jest.fn(),
};

const computeGkpFingerprintMock = jest.fn(() => 'fingerprint-1');
const isGkpQuerySnapshotFreshMock = jest.fn(() => true);
const listGkpQuerySnapshotsMock = jest.fn(async () => []);
const loadGkpKeywordRecordMock = jest.fn(async () => null);
const loadGkpQuerySnapshotMock = jest.fn(async () => null);
const normalizeKeywordKeyMock = jest.fn((keyword: string) => keyword.toLowerCase().replace(/\s+/g, '-'));
const saveGkpKeywordRecordMock = jest.fn(async (record) => record);
const saveGkpQuerySnapshotMock = jest.fn(async (snapshot) => ({ version: 1, ...snapshot }));

jest.unstable_mockModule('../integrations/keywordplanner/client.js', () => ({
  GkpClient: jest.fn().mockImplementation(() => mockGkpClient),
}));

jest.unstable_mockModule('../config/gkpStore.js', () => ({
  computeGkpFingerprint: computeGkpFingerprintMock,
  isGkpQuerySnapshotFresh: isGkpQuerySnapshotFreshMock,
  listGkpQuerySnapshots: listGkpQuerySnapshotsMock,
  loadGkpKeywordRecord: loadGkpKeywordRecordMock,
  loadGkpQuerySnapshot: loadGkpQuerySnapshotMock,
  normalizeKeywordKey: normalizeKeywordKeyMock,
  saveGkpKeywordRecord: saveGkpKeywordRecordMock,
  saveGkpQuerySnapshot: saveGkpQuerySnapshotMock,
}));

const {
  runGkpIdeasCommand,
  runGkpHistoricalCommand,
  runGkpForecastCommand,
  runGkpListCommand,
} = await import('../cli/commands/gkp.js');

function createMockEnvSettings(overrides: Record<string, string | undefined> = {}) {
  return {
    openRouterApiKey: undefined,
    replicateApiToken: undefined,
    googleAdsDeveloperToken: overrides.googleAdsDeveloperToken,
    googleAdsClientId: overrides.googleAdsClientId,
    googleAdsClientSecret: overrides.googleAdsClientSecret,
    googleAdsRefreshToken: overrides.googleAdsRefreshToken,
    googleAdsCustomerId: overrides.googleAdsCustomerId,
    googleAdsLoginCustomerId: overrides.googleAdsLoginCustomerId,
    disableKeytar: undefined,
    model: undefined,
    modelRequestTimeoutMs: undefined,
    modelRequestMaxAttempts: undefined,
    temperature: undefined,
    maxTokens: undefined,
    topP: undefined,
    notificationsEnabled: undefined,
    style: undefined,
    intent: undefined,
    targetLength: undefined,
    t2iReplicateModelId: undefined,
  };
}

function createMockSecrets(overrides: Record<string, string | null> = {}) {
  return {
    openRouterApiKey: null,
    replicateApiToken: null,
    googleAdsDeveloperToken: overrides.googleAdsDeveloperToken ?? null,
    googleAdsClientId: overrides.googleAdsClientId ?? null,
    googleAdsClientSecret: overrides.googleAdsClientSecret ?? null,
    googleAdsRefreshToken: overrides.googleAdsRefreshToken ?? null,
    googleAdsCustomerId: overrides.googleAdsCustomerId ?? null,
    googleAdsLoginCustomerId: overrides.googleAdsLoginCustomerId ?? null,
  };
}

function mockAllCredentials() {
  readEnvSettingsMock.mockReturnValue(createMockEnvSettings({
    googleAdsDeveloperToken: 'dev-token',
    googleAdsClientId: 'client-id',
    googleAdsClientSecret: 'client-secret',
    googleAdsRefreshToken: 'refresh-token',
    googleAdsCustomerId: '1234567890',
  }));
  loadSecretsMock.mockResolvedValue(createMockSecrets());
}

describe('gkp commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    computeGkpFingerprintMock.mockReturnValue('fingerprint-1');
    isGkpQuerySnapshotFreshMock.mockReturnValue(true);
    listGkpQuerySnapshotsMock.mockResolvedValue([]);
    loadGkpKeywordRecordMock.mockResolvedValue(null);
    loadGkpQuerySnapshotMock.mockResolvedValue(null);
    saveGkpKeywordRecordMock.mockImplementation(async (record) => record);
    saveGkpQuerySnapshotMock.mockImplementation(async (snapshot) => ({ version: 1, ...snapshot }));
  });

  describe('runGkpIdeasCommand', () => {
    it('throws when no keywords or url provided', async () => {
      mockAllCredentials();
      await expect(
        runGkpIdeasCommand({}),
      ).rejects.toThrow('--keywords or --url is required');
    });

    it('throws when required credentials are missing', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());
      await expect(
        runGkpIdeasCommand({ keywords: 'seo' }),
      ).rejects.toThrow('Missing required Google Ads credentials');
    });

    it('includes config set commands in credential error', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());
      try {
        await runGkpIdeasCommand({ keywords: 'seo' });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain('ideon config set');
      }
    });

    it('calls generateKeywordIdeas with keywords', async () => {
      mockAllCredentials();
      mockGkpClient.generateKeywordIdeas.mockResolvedValue({ ideas: [], count: 0 });

      await runGkpIdeasCommand({ keywords: 'seo,marketing' });

      expect(mockGkpClient.generateKeywordIdeas).toHaveBeenCalledWith({
        seedKeywords: ['seo', 'marketing'],
        url: undefined,
        site: undefined,
        countryCodes: undefined,
        language: undefined,
        pageSize: undefined,
      });
    });

    it('calls generateKeywordIdeas with url', async () => {
      mockAllCredentials();
      mockGkpClient.generateKeywordIdeas.mockResolvedValue({ ideas: [], count: 0 });

      await runGkpIdeasCommand({ url: 'https://example.com' });

      expect(mockGkpClient.generateKeywordIdeas).toHaveBeenCalledWith({
        seedKeywords: undefined,
        url: 'https://example.com',
        site: undefined,
        countryCodes: undefined,
        language: undefined,
        pageSize: undefined,
      });
    });

    it('passes country codes and language to client', async () => {
      mockAllCredentials();
      mockGkpClient.generateKeywordIdeas.mockResolvedValue({ ideas: [], count: 0 });

      await runGkpIdeasCommand({ keywords: 'test', country: 'US,GB', language: 'fr', pageSize: 10 });

      expect(mockGkpClient.generateKeywordIdeas).toHaveBeenCalledWith({
        seedKeywords: ['test'],
        url: undefined,
        site: undefined,
        countryCodes: ['US', 'GB'],
        language: 'fr',
        pageSize: 10,
      });
    });

    it('prints TTY table with keyword ideas', async () => {
      mockAllCredentials();
      mockGkpClient.generateKeywordIdeas.mockResolvedValue({
        ideas: [
          {
            text: 'seo tools',
            avgMonthlySearches: 12000,
            competition: 'MEDIUM',
            competitionIndex: 50,
            lowTopOfPageBidMicros: 500000,
            highTopOfPageBidMicros: 2000000,
            closeVariants: [],
          },
          {
            text: 'marketing automation',
            avgMonthlySearches: 8000,
            competition: 'HIGH',
            competitionIndex: 80,
            lowTopOfPageBidMicros: 1000000,
            highTopOfPageBidMicros: 5000000,
            closeVariants: [],
          },
        ],
        count: 2,
      });

      const logs: string[] = [];
      await runGkpIdeasCommand({ keywords: 'seo' }, {
        log: (msg: string) => logs.push(msg),
      });

      const output = logs.join('\n');
      expect(output).toContain('seo tools');
      expect(output).toContain('marketing automation');
      expect(output).toContain('12,000');
      expect(output).toContain('MEDIUM');
      expect(output).toContain('$0.50');
      expect(output).toContain('$2.00');
      expect(output).toContain('Total: 2 keywords');
    });

    it('prints "no results" when ideas are empty', async () => {
      mockAllCredentials();
      mockGkpClient.generateKeywordIdeas.mockResolvedValue({ ideas: [], count: 0 });

      const logs: string[] = [];
      await runGkpIdeasCommand({ keywords: 'nonexistent' }, {
        log: (msg: string) => logs.push(msg),
      });

      expect(logs.some((l) => l.includes('No keyword ideas found'))).toBe(true);
    });

    it('outputs JSON with --json flag', async () => {
      mockAllCredentials();
      const expectedResult = {
        ideas: [{ text: 'seo', avgMonthlySearches: 1000, competition: 'LOW', competitionIndex: 20, lowTopOfPageBidMicros: 100000, highTopOfPageBidMicros: 500000, closeVariants: [] }],
        count: 1,
      };
      mockGkpClient.generateKeywordIdeas.mockResolvedValue(expectedResult);

      const logs: string[] = [];
      await runGkpIdeasCommand({ keywords: 'seo', json: true }, {
        log: (msg: string) => logs.push(msg),
      });

      const parsed = JSON.parse(logs[0]);
      expect(parsed).toEqual(expectedResult);
    });

    it('returns a fresh cached ideas response without calling the API', async () => {
      mockAllCredentials();
      loadGkpQuerySnapshotMock.mockResolvedValue({
        version: 1,
        fingerprint: 'fingerprint-1',
        mode: 'ideas',
        savedAt: '2026-06-01T00:00:00.000Z',
        ttlDays: 30,
        count: 1,
        response: { ideas: [{ text: 'cached seo', avgMonthlySearches: 300, competition: 'LOW', competitionIndex: 10, lowTopOfPageBidMicros: 100000, highTopOfPageBidMicros: 200000, closeVariants: [] }], count: 1 },
      });

      const logs: string[] = [];
      await runGkpIdeasCommand({ keywords: 'seo', json: true }, {
        log: (msg: string) => logs.push(msg),
      });

      expect(mockGkpClient.generateKeywordIdeas).not.toHaveBeenCalled();
      expect(JSON.parse(logs[0])).toEqual({
        ideas: [{ text: 'cached seo', avgMonthlySearches: 300, competition: 'LOW', competitionIndex: 10, lowTopOfPageBidMicros: 100000, highTopOfPageBidMicros: 200000, closeVariants: [] }],
        count: 1,
      });
    });

    it('bypasses cache when --refresh is set', async () => {
      mockAllCredentials();
      loadGkpQuerySnapshotMock.mockResolvedValue({
        version: 1,
        fingerprint: 'fingerprint-1',
        mode: 'ideas',
        savedAt: '2026-06-01T00:00:00.000Z',
        ttlDays: 30,
        count: 1,
        response: { ideas: [], count: 0 },
      });
      mockGkpClient.generateKeywordIdeas.mockResolvedValue({ ideas: [], count: 0 });

      await runGkpIdeasCommand({ keywords: 'seo', refresh: true });

      expect(mockGkpClient.generateKeywordIdeas).toHaveBeenCalledTimes(1);
    });

    it('wraps API errors with actionable message', async () => {
      mockAllCredentials();
      mockGkpClient.generateKeywordIdeas.mockRejectedValue(new Error('DEVELOPER_TOKEN_INVALID'));

      await expect(
        runGkpIdeasCommand({ keywords: 'test' }),
      ).rejects.toThrow('Failed to generate keyword ideas');
    });
  });

  describe('runGkpHistoricalCommand', () => {
    it('throws when --keywords is missing', async () => {
      mockAllCredentials();
      await expect(
        runGkpHistoricalCommand({}),
      ).rejects.toThrow('--keywords is required');
    });

    it('throws when required credentials are missing', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());
      await expect(
        runGkpHistoricalCommand({ keywords: 'seo' }),
      ).rejects.toThrow('Missing required Google Ads credentials');
    });

    it('calls getHistoricalMetrics with keywords', async () => {
      mockAllCredentials();
      mockGkpClient.getHistoricalMetrics.mockResolvedValue({ keywords: [], count: 0 });

      await runGkpHistoricalCommand({ keywords: 'seo,marketing' });

      expect(mockGkpClient.getHistoricalMetrics).toHaveBeenCalledWith({
        keywords: ['seo', 'marketing'],
        countryCodes: undefined,
        language: undefined,
        includeAverageCpc: undefined,
      });
    });

    it('passes country codes and language to client', async () => {
      mockAllCredentials();
      mockGkpClient.getHistoricalMetrics.mockResolvedValue({ keywords: [], count: 0 });

      await runGkpHistoricalCommand({ keywords: 'test', country: 'DE', language: 'de' });

      expect(mockGkpClient.getHistoricalMetrics).toHaveBeenCalledWith({
        keywords: ['test'],
        countryCodes: ['DE'],
        language: 'de',
        includeAverageCpc: undefined,
      });
    });

    it('passes includeCpc to client', async () => {
      mockAllCredentials();
      mockGkpClient.getHistoricalMetrics.mockResolvedValue({ keywords: [], count: 0 });

      await runGkpHistoricalCommand({ keywords: 'test', includeCpc: false });

      expect(mockGkpClient.getHistoricalMetrics).toHaveBeenCalledWith({
        keywords: ['test'],
        countryCodes: undefined,
        language: undefined,
        includeAverageCpc: false,
      });
    });

    it('prints TTY table with historical metrics', async () => {
      mockAllCredentials();
      mockGkpClient.getHistoricalMetrics.mockResolvedValue({
        keywords: [
          {
            text: 'seo tools',
            avgMonthlySearches: 12000,
            competition: 'MEDIUM',
            competitionIndex: 50,
            lowTopOfPageBidMicros: 500000,
            highTopOfPageBidMicros: 2000000,
            monthlySearchVolumes: [],
          },
        ],
        count: 1,
      });

      const logs: string[] = [];
      await runGkpHistoricalCommand({ keywords: 'seo' }, {
        log: (msg: string) => logs.push(msg),
      });

      const output = logs.join('\n');
      expect(output).toContain('Historical Metrics');
      expect(output).toContain('seo tools');
      expect(output).toContain('12,000');
      expect(output).toContain('$0.50');
      expect(output).toContain('$2.00');
      expect(output).toContain('Total: 1 keyword');
    });

    it('prints "no results" when empty', async () => {
      mockAllCredentials();
      mockGkpClient.getHistoricalMetrics.mockResolvedValue({ keywords: [], count: 0 });

      const logs: string[] = [];
      await runGkpHistoricalCommand({ keywords: 'nonexistent' }, {
        log: (msg: string) => logs.push(msg),
      });

      expect(logs.some((l) => l.includes('No historical data found'))).toBe(true);
    });

    it('outputs JSON with --json flag', async () => {
      mockAllCredentials();
      const expectedResult = {
        keywords: [{ text: 'seo', avgMonthlySearches: 1000, competition: 'LOW', competitionIndex: 20, lowTopOfPageBidMicros: 100000, highTopOfPageBidMicros: 500000, monthlySearchVolumes: [] }],
        count: 1,
      };
      mockGkpClient.getHistoricalMetrics.mockResolvedValue(expectedResult);

      const logs: string[] = [];
      await runGkpHistoricalCommand({ keywords: 'seo', json: true }, {
        log: (msg: string) => logs.push(msg),
      });

      expect(JSON.parse(logs[0])).toEqual(expectedResult);
    });

    it('wraps API errors with actionable message', async () => {
      mockAllCredentials();
      mockGkpClient.getHistoricalMetrics.mockRejectedValue(new Error('CUSTOMER_NOT_FOUND'));

      await expect(
        runGkpHistoricalCommand({ keywords: 'test' }),
      ).rejects.toThrow('Failed to get historical data');
    });
  });

  describe('runGkpForecastCommand', () => {
    it('throws when --keywords is missing', async () => {
      mockAllCredentials();
      await expect(
        runGkpForecastCommand({}),
      ).rejects.toThrow('--keywords is required');
    });

    it('throws when required credentials are missing', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());
      await expect(
        runGkpForecastCommand({ keywords: 'seo' }),
      ).rejects.toThrow('Missing required Google Ads credentials');
    });

    it('calls getForecastData with keywords', async () => {
      mockAllCredentials();
      mockGkpClient.getForecastData.mockResolvedValue({ campaignForecastMetrics: { averageCpcMicros: 0, clicks: 0, costMicros: 0, conversions: 0, averageCpaMicros: 0 } });

      await runGkpForecastCommand({ keywords: 'seo,marketing' });

      expect(mockGkpClient.getForecastData).toHaveBeenCalledWith({
        keywords: ['seo', 'marketing'],
        keywordMatchType: undefined,
        maxCpcBidMicros: undefined,
        countryCodes: undefined,
        language: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('passes match type and max CPC bid to client', async () => {
      mockAllCredentials();
      mockGkpClient.getForecastData.mockResolvedValue({ campaignForecastMetrics: { averageCpcMicros: 0, clicks: 0, costMicros: 0, conversions: 0, averageCpaMicros: 0 } });

      await runGkpForecastCommand({ keywords: 'test', matchType: 'EXACT', maxCpcBid: 5000000 });

      expect(mockGkpClient.getForecastData).toHaveBeenCalledWith({
        keywords: ['test'],
        keywordMatchType: 'EXACT',
        maxCpcBidMicros: 5000000,
        countryCodes: undefined,
        language: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('passes country codes, date range, and language', async () => {
      mockAllCredentials();
      mockGkpClient.getForecastData.mockResolvedValue({ campaignForecastMetrics: { averageCpcMicros: 0, clicks: 0, costMicros: 0, conversions: 0, averageCpaMicros: 0 } });

      await runGkpForecastCommand({
        keywords: 'test',
        country: 'US,GB',
        language: 'en',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(mockGkpClient.getForecastData).toHaveBeenCalledWith({
        keywords: ['test'],
        keywordMatchType: undefined,
        maxCpcBidMicros: undefined,
        countryCodes: ['US', 'GB'],
        language: 'en',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
    });

    it('prints TTY table with forecast metrics', async () => {
      mockAllCredentials();
      mockGkpClient.getForecastData.mockResolvedValue({
        campaignForecastMetrics: {
          averageCpcMicros: 3160942,
          clicks: 797.62,
          costMicros: 2521219553,
          conversions: 5.2,
          averageCpaMicros: 23456789,
        },
      });

      const logs: string[] = [];
      await runGkpForecastCommand({ keywords: 'seo' }, {
        log: (msg: string) => logs.push(msg),
      });

      const output = logs.join('\n');
      expect(output).toContain('Campaign Forecast');
      expect(output).toContain('797.6');
      expect(output).toContain('$2521.22');
    });

    it('outputs JSON with --json flag', async () => {
      mockAllCredentials();
      const expectedResult = {
        campaignForecastMetrics: { averageCpcMicros: 3160942, clicks: 797.62, costMicros: 2521219553, conversions: 5.2, averageCpaMicros: 23456789 },
      };
      mockGkpClient.getForecastData.mockResolvedValue(expectedResult);

      const logs: string[] = [];
      await runGkpForecastCommand({ keywords: 'seo', json: true }, {
        log: (msg: string) => logs.push(msg),
      });

      expect(JSON.parse(logs[0])).toEqual(expectedResult);
    });

    it('wraps API errors with actionable message', async () => {
      mockAllCredentials();
      mockGkpClient.getForecastData.mockRejectedValue(new Error('CLIENT_CUSTOMER_ID_INVALID'));

      await expect(
        runGkpForecastCommand({ keywords: 'test' }),
      ).rejects.toThrow('Failed to get forecast data');
    });
  });

  describe('runGkpListCommand', () => {
    it('prints json output for cached entries', async () => {
      listGkpQuerySnapshotsMock.mockResolvedValue([
        {
          version: 1,
          fingerprint: 'fingerprint-1',
          mode: 'ideas',
          savedAt: '2026-06-03T12:00:00.000Z',
          ttlDays: 30,
          publication: 'tech-blog',
          series: 'seo-playbooks',
          keywords: ['content strategy'],
          count: 12,
          response: {},
        },
      ]);

      const logs: string[] = [];
      await runGkpListCommand({ json: true, verbose: false }, {
        log: (msg: string) => logs.push(msg),
      });

      expect(JSON.parse(logs[0])).toEqual([
        {
          fingerprint: 'fingerprint-1',
          mode: 'ideas',
          query: 'content strategy',
          publication: 'tech-blog',
          series: 'seo-playbooks',
          count: 12,
          savedAt: '2026-06-03T12:00:00.000Z',
          ttlDays: 30,
          fresh: true,
          countryCodes: undefined,
          language: undefined,
          matchType: undefined,
          startDate: undefined,
          endDate: undefined,
        },
      ]);
    });

    it('forwards list filters to the store', async () => {
      await runGkpListCommand({ publication: 'tech-blog', series: 'seo-playbooks', search: 'content', fresh: true, stale: false, json: true, verbose: false });

      expect(listGkpQuerySnapshotsMock).toHaveBeenCalledWith({
        publication: 'tech-blog',
        series: 'seo-playbooks',
        search: 'content',
        freshOnly: true,
        staleOnly: false,
      });
    });
  });
});
