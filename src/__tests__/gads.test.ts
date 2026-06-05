// @ts-nocheck
import { jest } from '@jest/globals';

const configSetMock = jest.fn().mockResolvedValue(undefined);
const configGetMock = jest.fn().mockResolvedValue({ key: 'openRouterApiKey', value: false, isSecret: true });
const configUnsetMock = jest.fn().mockResolvedValue(undefined);
const loadSecretsMock = jest.fn();
const readEnvSettingsMock = jest.fn();
const startOAuthFlowMock = jest.fn();
const generateKeywordIdeasMock = jest.fn();

jest.unstable_mockModule('../config/manage.js', () => ({
  configSet: configSetMock,
  configGet: configGetMock,
  configUnset: configUnsetMock,
  configSettingKeys: ['model', 'style'] as never,
  configSecretKeys: ['openRouterApiKey', 'googleAdsDeveloperToken', 'googleAdsClientId', 'googleAdsClientSecret', 'googleAdsRefreshToken', 'googleAdsCustomerId', 'googleAdsLoginCustomerId'] as never,
  isConfigKey: jest.fn(() => true),
  isConfigSettingKey: jest.fn(() => false),
  isConfigSecretKey: jest.fn(() => true),
}));

jest.unstable_mockModule('../config/secretStore.js', () => ({
  loadSecrets: loadSecretsMock,
  saveSecrets: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../config/env.js', () => ({
  readEnvSettings: readEnvSettingsMock,
}));

jest.unstable_mockModule('../integrations/keywordplanner/oauth.js', () => ({
  startOAuthFlow: startOAuthFlowMock,
}));

jest.unstable_mockModule('../integrations/keywordplanner/client.js', () => ({
  GkpClient: jest.fn().mockImplementation(() => ({
    generateKeywordIdeas: generateKeywordIdeasMock,
  })),
}));

const {
  runGadsLoginCommand,
  runGadsLogoutCommand,
  runGadsStatusCommand,
  runGadsTestCommand,
  buildStatusResult,
} = await import('../cli/commands/gads.js');

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

describe('gads commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configSetMock.mockResolvedValue(undefined);
    configUnsetMock.mockResolvedValue(undefined);
    startOAuthFlowMock.mockResolvedValue({ refreshToken: 'new-token' });
  });

  describe('runGadsLoginCommand', () => {
    it('throws in non-TTY mode', async () => {
      await expect(
        runGadsLoginCommand({}, {
          log: jest.fn(),
          prompt: jest.fn(),
          isTTY: false,
        }),
      ).rejects.toThrow('interactive terminal');
    });

    it('skips if refresh token exists without --force', async () => {
      const logs: string[] = [];
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings({ googleAdsRefreshToken: 'existing' }));
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsLoginCommand({ force: false }, {
        log: (msg: string) => logs.push(msg),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(logs.some((l) => l.includes('Already authenticated'))).toBe(true);
      expect(configSetMock).not.toHaveBeenCalled();
    });

    it('re-authorizes with --force even when token exists', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings({ googleAdsRefreshToken: 'existing' }));
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsLoginCommand({
        force: true,
        developerToken: 'dev',
        clientId: 'id',
        clientSecret: 'secret',
        customerId: '123',
      }, {
        log: jest.fn(),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(startOAuthFlowMock).toHaveBeenCalled();
      expect(configSetMock).toHaveBeenCalledWith('googleAdsRefreshToken', 'new-token');
    });

    it('saves credentials progressively and runs OAuth flow', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsLoginCommand({
        developerToken: 'dev-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        customerId: '1234567890',
      }, {
        log: jest.fn(),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(configSetMock).toHaveBeenCalledWith('googleAdsDeveloperToken', 'dev-token');
      expect(configSetMock).toHaveBeenCalledWith('googleAdsClientId', 'client-id');
      expect(configSetMock).toHaveBeenCalledWith('googleAdsClientSecret', 'client-secret');
      expect(configSetMock).toHaveBeenCalledWith('googleAdsCustomerId', '1234567890');
      expect(startOAuthFlowMock).toHaveBeenCalledWith({ clientId: 'client-id', clientSecret: 'client-secret' });
      expect(configSetMock).toHaveBeenCalledWith('googleAdsRefreshToken', 'new-token');
    });

    it('prompts for missing credentials', async () => {
      const promptMock = jest.fn()
        .mockResolvedValueOnce('dev-token')
        .mockResolvedValueOnce('client-id')
        .mockResolvedValueOnce('client-secret')
        .mockResolvedValueOnce('1234567890');

      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsLoginCommand({}, {
        log: jest.fn(),
        prompt: promptMock,
        isTTY: true,
      });

      expect(promptMock).toHaveBeenCalledTimes(4);
      expect(promptMock.mock.calls[0][0]).toContain('developer token');
      expect(promptMock.mock.calls[1][0]).toContain('client ID');
      expect(promptMock.mock.calls[2][0]).toContain('client secret');
      expect(promptMock.mock.calls[3][0]).toContain('customer ID');
    });

    it('saves loginCustomerId when provided via flag', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsLoginCommand({
        developerToken: 'dev',
        clientId: 'id',
        clientSecret: 'secret',
        customerId: '123',
        loginCustomerId: '999',
      }, {
        log: jest.fn(),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(configSetMock).toHaveBeenCalledWith('googleAdsLoginCustomerId', '999');
    });

    it('rejects empty developer token', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await expect(
        runGadsLoginCommand({ developerToken: '  ' }, {
          log: jest.fn(),
          prompt: jest.fn(),
          isTTY: true,
        }),
      ).rejects.toThrow('Developer token cannot be empty');
    });

    it('rejects empty client ID', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await expect(
        runGadsLoginCommand({ developerToken: 'dev', clientId: '' }, {
          log: jest.fn(),
          prompt: jest.fn(),
          isTTY: true,
        }),
      ).rejects.toThrow('Client ID cannot be empty');
    });

    it('rejects empty client secret', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await expect(
        runGadsLoginCommand({ developerToken: 'dev', clientId: 'id', clientSecret: ' ' }, {
          log: jest.fn(),
          prompt: jest.fn(),
          isTTY: true,
        }),
      ).rejects.toThrow('Client secret cannot be empty');
    });

    it('rejects empty customer ID', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await expect(
        runGadsLoginCommand({ developerToken: 'dev', clientId: 'id', clientSecret: 'secret', customerId: '' }, {
          log: jest.fn(),
          prompt: jest.fn(),
          isTTY: true,
        }),
      ).rejects.toThrow('Customer ID cannot be empty');
    });
  });

  describe('runGadsLogoutCommand', () => {
    it('clears refresh token only by default', async () => {
      const logs: string[] = [];

      await runGadsLogoutCommand({}, {
        log: (msg: string) => logs.push(msg),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(configUnsetMock).toHaveBeenCalledTimes(1);
      expect(configUnsetMock).toHaveBeenCalledWith('googleAdsRefreshToken');
      expect(logs.some((l) => l.includes('refresh token cleared'))).toBe(true);
    });

    it('clears all credentials with --all', async () => {
      await runGadsLogoutCommand({ all: true }, {
        log: jest.fn(),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(configUnsetMock).toHaveBeenCalledTimes(6);
      expect(configUnsetMock).toHaveBeenCalledWith('googleAdsDeveloperToken');
      expect(configUnsetMock).toHaveBeenCalledWith('googleAdsClientId');
      expect(configUnsetMock).toHaveBeenCalledWith('googleAdsClientSecret');
      expect(configUnsetMock).toHaveBeenCalledWith('googleAdsRefreshToken');
      expect(configUnsetMock).toHaveBeenCalledWith('googleAdsCustomerId');
      expect(configUnsetMock).toHaveBeenCalledWith('googleAdsLoginCustomerId');
    });

    it('logs appropriate message for --all', async () => {
      const logs: string[] = [];

      await runGadsLogoutCommand({ all: true }, {
        log: (msg: string) => logs.push(msg),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(logs.some((l) => l.includes('All Google Ads credentials cleared'))).toBe(true);
    });
  });

  describe('buildStatusResult', () => {
    it('detects env source when env var is set', () => {
      const env = createMockEnvSettings({ googleAdsDeveloperToken: 'env-token' });
      const secrets = createMockSecrets();
      const result = buildStatusResult(env, secrets);
      expect(result.googleAdsDeveloperToken).toEqual({ set: true, source: 'env' });
    });

    it('detects keychain source when keychain has value', () => {
      const env = createMockEnvSettings();
      const secrets = createMockSecrets({ googleAdsDeveloperToken: 'keychain-token' });
      const result = buildStatusResult(env, secrets);
      expect(result.googleAdsDeveloperToken).toEqual({ set: true, source: 'keychain' });
    });

    it('reports not set when both are missing', () => {
      const env = createMockEnvSettings();
      const secrets = createMockSecrets();
      const result = buildStatusResult(env, secrets);
      expect(result.googleAdsDeveloperToken).toEqual({ set: false, source: null });
    });

    it('env takes precedence over keychain', () => {
      const env = createMockEnvSettings({ googleAdsDeveloperToken: 'env-value' });
      const secrets = createMockSecrets({ googleAdsDeveloperToken: 'keychain-value' });
      const result = buildStatusResult(env, secrets);
      expect(result.googleAdsDeveloperToken).toEqual({ set: true, source: 'env' });
    });

    it('handles all six credentials', () => {
      const env = createMockEnvSettings({
        googleAdsDeveloperToken: 'env1',
        googleAdsClientId: 'env2',
      });
      const secrets = createMockSecrets({
        googleAdsClientSecret: 'ks3',
        googleAdsRefreshToken: 'ks4',
        googleAdsCustomerId: 'ks5',
        googleAdsLoginCustomerId: 'ks6',
      });
      const result = buildStatusResult(env, secrets);

      expect(result.googleAdsDeveloperToken.source).toBe('env');
      expect(result.googleAdsClientId.source).toBe('env');
      expect(result.googleAdsClientSecret.source).toBe('keychain');
      expect(result.googleAdsRefreshToken.source).toBe('keychain');
      expect(result.googleAdsCustomerId.source).toBe('keychain');
      expect(result.googleAdsLoginCustomerId.source).toBe('keychain');
    });
  });

  describe('runGadsStatusCommand', () => {
    it('prints TTY status with all credentials set', async () => {
      const logs: string[] = [];
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings({
        googleAdsDeveloperToken: 'env',
        googleAdsClientId: 'env',
        googleAdsClientSecret: 'env',
        googleAdsRefreshToken: 'env',
        googleAdsCustomerId: 'env',
      }));
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsStatusCommand({}, {
        log: (msg: string) => logs.push(msg),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(logs.some((l) => l.includes('Google Ads Credential Status'))).toBe(true);
      expect(logs.some((l) => l.includes('developer Token'))).toBe(true);
      expect(logs.some((l) => l.includes('✓ env'))).toBe(true);
    });

    it('shows gads login hint when credentials are missing', async () => {
      const logs: string[] = [];
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsStatusCommand({}, {
        log: (msg: string) => logs.push(msg),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(logs.some((l) => l.includes('not set'))).toBe(true);
      expect(logs.some((l) => l.includes('gads login'))).toBe(true);
    });

    it('marks loginCustomerId as optional when not set', async () => {
      const logs: string[] = [];
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings({
        googleAdsDeveloperToken: 'env',
        googleAdsClientId: 'env',
        googleAdsClientSecret: 'env',
        googleAdsRefreshToken: 'env',
        googleAdsCustomerId: 'env',
      }));
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsStatusCommand({}, {
        log: (msg: string) => logs.push(msg),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(logs.some((l) => l.includes('optional'))).toBe(true);
    });

    it('outputs JSON with --json flag', async () => {
      const logs: string[] = [];
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings({ googleAdsDeveloperToken: 'env-token' }));
      loadSecretsMock.mockResolvedValue(createMockSecrets({ googleAdsRefreshToken: 'keychain-token' }));

      await runGadsStatusCommand({ json: true }, {
        log: (msg: string) => logs.push(msg),
        prompt: jest.fn(),
        isTTY: true,
      });

      const jsonOutput = JSON.parse(logs[0]) as Record<string, { set: boolean; source: string | null }>;
      expect(jsonOutput.googleAdsDeveloperToken).toEqual({ set: true, source: 'env' });
      expect(jsonOutput.googleAdsRefreshToken).toEqual({ set: true, source: 'keychain' });
      expect(jsonOutput.googleAdsClientId).toEqual({ set: false, source: null });
    });

    it('shows gads test hint when all required credentials are set', async () => {
      const logs: string[] = [];
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings({
        googleAdsDeveloperToken: 'env',
        googleAdsClientId: 'env',
        googleAdsClientSecret: 'env',
        googleAdsRefreshToken: 'env',
        googleAdsCustomerId: 'env',
      }));
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsStatusCommand({}, {
        log: (msg: string) => logs.push(msg),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(logs.some((l) => l.includes('gads test'))).toBe(true);
      expect(logs.some((l) => l.includes('gads login'))).toBe(false);
    });
  });

  describe('runGadsTestCommand', () => {
    it('throws when required credentials are missing', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await expect(
        runGadsTestCommand({}, {
          log: jest.fn(),
          prompt: jest.fn(),
          isTTY: true,
        }),
      ).rejects.toThrow('Missing required Google Ads credentials');
    });

    it('reports specific missing credentials', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings({ googleAdsDeveloperToken: 'token' }));
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await expect(
        runGadsTestCommand({}, {
          log: jest.fn(),
          prompt: jest.fn(),
          isTTY: true,
        }),
      ).rejects.toThrow(/googleAdsClientId/);
    });

    it('includes config set commands in error message', async () => {
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings());
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await expect(
        runGadsTestCommand({}, {
          log: jest.fn(),
          prompt: jest.fn(),
          isTTY: true,
        }),
      ).rejects.toThrow(/ideon config set googleAdsDeveloperToken/);
    });

    it('succeeds with valid credentials', async () => {
      generateKeywordIdeasMock.mockResolvedValue({
        ideas: [{ text: 'test' }],
        count: 1,
      });

      const logs: string[] = [];
      readEnvSettingsMock.mockReturnValue(createMockEnvSettings({
        googleAdsDeveloperToken: 'dev',
        googleAdsClientId: 'id',
        googleAdsClientSecret: 'secret',
        googleAdsRefreshToken: 'refresh',
        googleAdsCustomerId: '1234567890',
      }));
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await runGadsTestCommand({}, {
        log: (msg: string) => logs.push(msg),
        prompt: jest.fn(),
        isTTY: true,
      });

      expect(logs.some((l) => l.includes('verified'))).toBe(true);
      expect(logs.some((l) => l.includes('1234567890'))).toBe(true);
    });

    it('reports API errors with actionable messages', async () => {
      generateKeywordIdeasMock.mockRejectedValue(
        new Error('DEVELOPER_TOKEN_NOT_APPROVED'),
      );

      readEnvSettingsMock.mockReturnValue(createMockEnvSettings({
        googleAdsDeveloperToken: 'dev',
        googleAdsClientId: 'id',
        googleAdsClientSecret: 'secret',
        googleAdsRefreshToken: 'refresh',
        googleAdsCustomerId: '1234567890',
      }));
      loadSecretsMock.mockResolvedValue(createMockSecrets());

      await expect(
        runGadsTestCommand({}, {
          log: jest.fn(),
          prompt: jest.fn(),
          isTTY: true,
        }),
      ).rejects.toThrow('DEVELOPER_TOKEN_NOT_APPROVED');
    });
  });
});
