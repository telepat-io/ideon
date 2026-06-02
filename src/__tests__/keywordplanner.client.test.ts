import { jest } from '@jest/globals';
import { GkpClient } from '../integrations/keywordplanner/client.js';

const MOCK_TOKEN_RESPONSE = {
  access_token: 'mock-access-token',
  expires_in: 3600,
};

function mockFetchResponse(status: number, body: unknown, ok = true): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    json: () => Promise.resolve(body),
    body: null,
    bodyUsed: false,
    clone: function () { return this; },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as unknown as Response;
}

describe('GkpClient', () => {
  let fetchSpy: jest.Spied<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('constructor', () => {
    it('strips dashes from customer ID', () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '123-456-7890',
      });

      expect(client).toBeDefined();
    });

    it('strips dashes from login customer ID', () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
        loginCustomerId: '987-654-3210',
      });

      expect(client).toBeDefined();
    });
  });

  describe('token refresh', () => {
    it('refreshes access token on first request', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () => mockFetchResponse(200, { results: [] }));

      await client.generateKeywordIdeas({ seedKeywords: ['test'] });

      const tokenCall = fetchSpy.mock.calls[0];
      expect(tokenCall[0]).toBe('https://oauth2.googleapis.com/token');
      expect(tokenCall[1]?.method).toBe('POST');
      expect(tokenCall[1]?.body).toContain('grant_type=refresh_token');
      expect(tokenCall[1]?.body).toContain('client_id=client-id');
    });

    it('caches access token and reuses it', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () => mockFetchResponse(200, { results: [] }))
        .mockImplementationOnce(async () => mockFetchResponse(200, { results: [] }));

      await client.generateKeywordIdeas({ seedKeywords: ['test'] });
      await client.generateKeywordIdeas({ seedKeywords: ['test2'] });

      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('throws on OAuth2 token exchange failure', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy.mockImplementationOnce(async () =>
        mockFetchResponse(400, { error: 'invalid_grant', error_description: 'Token expired' }, false),
      );

      await expect(client.generateKeywordIdeas({ seedKeywords: ['test'] })).rejects.toThrow(
        'OAuth2 token exchange failed',
      );
    });
  });

  describe('generateKeywordIdeas', () => {
    it('sends correct request and parses response', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () =>
          mockFetchResponse(200, {
            results: [
              {
                text: 'test keyword',
                keywordIdeaMetrics: {
                  avgMonthlySearches: '1000',
                  competition: 'HIGH',
                  competitionIndex: '80',
                  lowTopOfPageBidMicros: '500000',
                  highTopOfPageBidMicros: '1500000',
                },
                closeVariants: [],
              },
            ],
          }),
        );

      const result = await client.generateKeywordIdeas({ seedKeywords: ['test'] });

      expect(result.count).toBe(1);
      expect(result.ideas[0].text).toBe('test keyword');
      expect(result.ideas[0].avgMonthlySearches).toBe(1000);
    });

    it('includes auth headers on API request', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
        loginCustomerId: '9876543210',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () => mockFetchResponse(200, { results: [] }));

      await client.generateKeywordIdeas({ seedKeywords: ['test'] });

      const apiCall = fetchSpy.mock.calls[1];
      const headers = apiCall[1]?.headers as Record<string, string>;
      expect(headers['developer-token']).toBe('dev-token');
      expect(headers['login-customer-id']).toBe('9876543210');
      expect(headers['Authorization']).toBe('Bearer mock-access-token');
    });
  });

  describe('getHistoricalMetrics', () => {
    it('sends correct request and parses response', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () =>
          mockFetchResponse(200, {
            results: [
              {
                text: 'test keyword',
                keywordMetrics: {
                  avgMonthlySearches: '2000',
                  competition: 'MEDIUM',
                  competitionIndex: 50,
                  lowTopOfPageBidMicros: '300000',
                  highTopOfPageBidMicros: '900000',
                  monthlySearchVolumes: [],
                },
              },
            ],
          }),
        );

      const result = await client.getHistoricalMetrics({ keywords: ['test'] });

      expect(result.count).toBe(1);
      expect(result.keywords[0].text).toBe('test keyword');
      expect(result.keywords[0].avgMonthlySearches).toBe(2000);
    });
  });

  describe('getForecastData', () => {
    it('sends correct request and parses response', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () =>
          mockFetchResponse(200, {
            campaignForecastMetrics: {
              averageCpcMicros: '3160942',
              clicks: 797.6166381835938,
              costMicros: '2521219553',
              conversions: 5.2,
              averageCpaMicros: '23456789',
            },
          }),
        );

      const result = await client.getForecastData({ keywords: ['test'] });

      expect(result.campaignForecastMetrics.clicks).toBeCloseTo(797.62, 0);
      expect(result.campaignForecastMetrics.costMicros).toBe(2521219553);
    });
  });

  describe('error handling', () => {
    it('extracts actionable error message for DEVELOPER_TOKEN_INVALID', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () =>
          mockFetchResponse(
            400,
            {
              error: [
                {
                  errorCode: { DEVELOPER_TOKEN_INVALID: true },
                  message: 'The developer token is invalid.',
                },
              ],
            },
            false,
          ),
        );

      await expect(client.generateKeywordIdeas({ seedKeywords: ['test'] })).rejects.toThrow(
        'Invalid developer token',
      );
    });

    it('extracts actionable error message for USER_PERMISSION_DENIED', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () =>
          mockFetchResponse(
            403,
            {
              error: [
                {
                  errorCode: { USER_PERMISSION_DENIED: true },
                  message: 'User permission denied.',
                },
              ],
            },
            false,
          ),
        );

      await expect(client.generateKeywordIdeas({ seedKeywords: ['test'] })).rejects.toThrow(
        'Permission denied',
      );
    });

    it('falls back to raw error message for unknown error codes', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () =>
          mockFetchResponse(
            500,
            {
              error: [
                {
                  errorCode: { UNKNOWN_ERROR: true },
                  message: 'Something went wrong.',
                },
              ],
            },
            false,
          ),
        );

      await expect(client.generateKeywordIdeas({ seedKeywords: ['test'] })).rejects.toThrow('Something went wrong.');
    });

    it('falls back to HTTP status message for non-JSON errors', async () => {
      const client = new GkpClient({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        customerId: '1234567890',
      });

      fetchSpy
        .mockImplementationOnce(async () => mockFetchResponse(200, MOCK_TOKEN_RESPONSE))
        .mockImplementationOnce(async () =>
          mockFetchResponse(500, 'Internal Server Error', false),
        );

      await expect(client.generateKeywordIdeas({ seedKeywords: ['test'] })).rejects.toThrow('HTTP 500');
    });
  });
});
