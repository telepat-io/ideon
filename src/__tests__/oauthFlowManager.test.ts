import { jest } from '@jest/globals';

const tryConfigSetSecretMock = jest.fn<(...args: any[]) => Promise<{ saved: boolean; source: string }>>();
const loadSecretsMock = jest.fn<(...args: any[]) => Promise<any>>();
const readEnvSettingsMock = jest.fn<() => any>();

const mockServer = {
  listen: jest.fn<(port: number, cb: () => void) => void>(),
  on: jest.fn(),
  close: jest.fn(),
  listening: true,
};

const buildAuthUrlMock = jest.fn<(clientId: string, redirectUri: string) => string>();
const exchangeCodeMock = jest.fn<(...args: any[]) => Promise<string>>();
const startServerOnPortMock = jest.fn<(...args: any[]) => Promise<any>>();

jest.unstable_mockModule('../config/manage.js', () => ({
  tryConfigSetSecret: tryConfigSetSecretMock,
}));

jest.unstable_mockModule('../config/secretStore.js', () => ({
  loadSecrets: loadSecretsMock,
}));

jest.unstable_mockModule('../config/env.js', () => ({
  readEnvSettings: readEnvSettingsMock,
}));

jest.unstable_mockModule('../integrations/keywordplanner/oauth.js', () => ({
  buildAuthUrl: buildAuthUrlMock,
  exchangeCode: exchangeCodeMock,
  startServerOnPort: startServerOnPortMock,
  resolveGadsOAuthRedirect: jest.fn((_url: string | undefined, port = 9876) => ({
    redirectUri: `http://localhost:${port}/callback`,
    redirectPath: '/callback',
    listenPort: port,
  })),
}));

jest.unstable_mockModule('node:http', () => ({
  createServer: jest.fn(() => mockServer),
}));

const { startGadsLogin, getGadsLoginStatus, resetGadsLoginState } = await import('../integrations/mcp/oauthFlowManager.js');

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
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

describe('oauthFlowManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGadsLoginState();

    tryConfigSetSecretMock.mockResolvedValue({ saved: true, source: 'keychain' });
    readEnvSettingsMock.mockReturnValue({ disableKeytar: undefined });
    loadSecretsMock.mockResolvedValue(createMockSecrets());
    buildAuthUrlMock.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?test=1');
    startServerOnPortMock.mockResolvedValue({
      server: mockServer,
      redirectPath: '/callback',
      redirectUri: 'http://localhost:9876/callback',
    });
    mockServer.listen.mockImplementation((_port: number, cb: () => void) => { cb(); });
    mockServer.on.mockReturnThis();
    mockServer.close.mockImplementation((..._args: any[]) => { /* no-op */ });
  });

  it('starts in not_started state', () => {
    const status = getGadsLoginStatus();
    expect(status.status).toBe('not_started');
  });

  it('starts OAuth flow and returns auth URL', async () => {
    const result = await startGadsLogin({
      developerToken: 'dev-token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      customerId: '1234567890',
    });

    expect(result.status).toBe('pending');
    expect(result.authUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth?test=1');
    expect(result.port).toBe(9876);
    expect(tryConfigSetSecretMock).toHaveBeenCalledWith('googleAdsDeveloperToken', 'dev-token');
    expect(tryConfigSetSecretMock).toHaveBeenCalledWith('googleAdsClientId', 'client-id');
    expect(tryConfigSetSecretMock).toHaveBeenCalledWith('googleAdsClientSecret', 'client-secret');
    expect(tryConfigSetSecretMock).toHaveBeenCalledWith('googleAdsCustomerId', '1234567890');
  });

  it('saves loginCustomerId when provided', async () => {
    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
      loginCustomerId: '999',
    });

    expect(tryConfigSetSecretMock).toHaveBeenCalledWith('googleAdsLoginCustomerId', '999');
  });

  it('reports pending status while flow is active', async () => {
    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    const status = getGadsLoginStatus();
    expect(status.status).toBe('pending');
    expect(status.authUrl).toBeTruthy();
  });

  it('returns existing state when flow is already pending', async () => {
    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    const result = await startGadsLogin({
      developerToken: 'dev2',
      clientId: 'id2',
      clientSecret: 'secret2',
      customerId: '456',
    });

    expect(result.status).toBe('pending');
    expect(tryConfigSetSecretMock).not.toHaveBeenCalledWith('googleAdsDeveloperToken', 'dev2');
  });

  it('throws when refresh token exists and force is not set', async () => {
    loadSecretsMock.mockResolvedValue(createMockSecrets({ googleAdsRefreshToken: 'existing-token' }));

    await expect(
      startGadsLogin({
        developerToken: 'dev',
        clientId: 'id',
        clientSecret: 'secret',
        customerId: '123',
      }),
    ).rejects.toThrow('Already authenticated');
  });

  it('allows re-authorization with force=true', async () => {
    loadSecretsMock.mockResolvedValue(createMockSecrets({ googleAdsRefreshToken: 'existing-token' }));

    const result = await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
      force: true,
    });

    expect(result.status).toBe('pending');
    expect(tryConfigSetSecretMock).toHaveBeenCalledWith('googleAdsDeveloperToken', 'dev');
  });

  it('throws when all ports are in use', async () => {
    startServerOnPortMock.mockRejectedValue(new Error('Port 9876 is in use.'));

    await expect(
      startGadsLogin({
        developerToken: 'dev',
        clientId: 'id',
        clientSecret: 'secret',
        customerId: '123',
      }),
    ).rejects.toThrow('All ports');
  });

  it('retries on port-in-use errors', async () => {
    startServerOnPortMock
      .mockRejectedValueOnce(new Error('Port 9876 is in use.'))
      .mockRejectedValueOnce(new Error('Port 9877 is in use.'))
      .mockResolvedValueOnce({
        server: mockServer,
        redirectPath: '/callback',
        redirectUri: 'http://localhost:9878/callback',
      });

    const result = await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    expect(result.port).toBe(9878);
    expect(startServerOnPortMock).toHaveBeenCalledTimes(3);
  });

  it('resetGadsLoginState clears to not_started', async () => {
    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    resetGadsLoginState();
    const status = getGadsLoginStatus();
    expect(status.status).toBe('not_started');
  });

  it('handles successful OAuth callback', async () => {
    exchangeCodeMock.mockResolvedValue('new-refresh-token');

    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    expect(mockServer.on).toHaveBeenCalledWith('request', expect.any(Function));
    const requestHandler = mockServer.on.mock.calls.find((c: any) => c[0] === 'request')![1] as Function;

    const req = { url: '/callback?code=test-auth-code' };
    const res = {
      writeHead: jest.fn(),
      end: jest.fn(),
    };

    await requestHandler(req, res);
    await flushMicrotasks();

    expect(exchangeCodeMock).toHaveBeenCalledWith(
      'test-auth-code',
      'id',
      'secret',
      'http://localhost:9876/callback',
      expect.objectContaining({ fetch: expect.any(Function) }),
    );
    expect(tryConfigSetSecretMock).toHaveBeenCalledWith('googleAdsRefreshToken', 'new-refresh-token');
    expect(getGadsLoginStatus().status).toBe('completed');
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html' });
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Authorization successful'));
  });

  it('handles OAuth callback with error parameter', async () => {
    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    const requestHandler = mockServer.on.mock.calls.find((c: any) => c[0] === 'request')![1] as Function;
    const req = { url: '/callback?error=access_denied' };
    const res = { writeHead: jest.fn(), end: jest.fn() };

    await requestHandler(req, res);
    await flushMicrotasks();

    expect(getGadsLoginStatus().status).toBe('timed_out');
    expect(getGadsLoginStatus().message).toContain('access_denied');
    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'text/html' });
  });

  it('handles OAuth callback with missing code', async () => {
    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    const requestHandler = mockServer.on.mock.calls.find((c: any) => c[0] === 'request')![1] as Function;
    const req = { url: '/callback' };
    const res = { writeHead: jest.fn(), end: jest.fn() };

    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'text/html' });
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Missing authorization code'));
  });

  it('handles OAuth callback on non-matching path', async () => {
    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    const requestHandler = mockServer.on.mock.calls.find((c: any) => c[0] === 'request')![1] as Function;
    const req = { url: '/other-path' };
    const res = { writeHead: jest.fn(), end: jest.fn() };

    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalledWith('Not found.');
  });

  it('handles token exchange failure', async () => {
    exchangeCodeMock.mockRejectedValue(new Error('invalid_grant'));

    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    const requestHandler = mockServer.on.mock.calls.find((c: any) => c[0] === 'request')![1] as Function;
    const req = { url: '/callback?code=bad-code' };
    const res = { writeHead: jest.fn(), end: jest.fn() };

    await requestHandler(req, res);
    await flushMicrotasks();

    expect(getGadsLoginStatus().status).toBe('timed_out');
    expect(getGadsLoginStatus().message).toContain('invalid_grant');
    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'text/html' });
  });

  it('returns refreshToken in completed state when keytar is disabled', async () => {
    exchangeCodeMock.mockResolvedValue('new-refresh-token');
    tryConfigSetSecretMock.mockResolvedValue({ saved: false, source: 'skipped' });

    await startGadsLogin({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    const requestHandler = mockServer.on.mock.calls.find((c: any) => c[0] === 'request')![1] as Function;
    const req = { url: '/callback?code=test-auth-code' };
    const res = { writeHead: jest.fn(), end: jest.fn() };

    await requestHandler(req, res);
    await flushMicrotasks();

    const status = getGadsLoginStatus();
    expect(status.status).toBe('completed');
    expect(status.refreshToken).toBe('new-refresh-token');
    expect(status.saved).toBe(false);
  });

  it('throws on non-port-in-use server errors', async () => {
    startServerOnPortMock.mockRejectedValue(new Error('Permission denied'));

    await expect(
      startGadsLogin({
        developerToken: 'dev',
        clientId: 'id',
        clientSecret: 'secret',
        customerId: '123',
      }),
    ).rejects.toThrow('Permission denied');
  });
});
