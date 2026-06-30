import { jest } from '@jest/globals';
import type { AppSettings, SecretSettings } from '../config/schema.js';

const loadSavedSettingsMock = jest.fn<() => Promise<AppSettings>>();
const saveSettingsMock = jest.fn<(settings: AppSettings) => Promise<void>>();
const loadSecretsMock = jest.fn<(options?: { disableKeytar?: boolean }) => Promise<SecretSettings>>();
const saveSecretsMock = jest.fn<(secrets: Partial<SecretSettings>, options?: { disableKeytar?: boolean }) => Promise<void>>();
const readEnvSettingsMock = jest.fn<() => Record<string, unknown>>();

jest.unstable_mockModule('../config/settingsFile.js', () => ({
  loadSavedSettings: loadSavedSettingsMock,
  saveSettings: saveSettingsMock,
}));

jest.unstable_mockModule('../config/secretStore.js', () => ({
  loadSecrets: loadSecretsMock,
  saveSecrets: saveSecretsMock,
  isKeytarUnavailableError: (error: unknown) =>
    error instanceof Error && error.name === 'KeytarUnavailableError',
}));

jest.unstable_mockModule('../config/env.js', () => ({
  readEnvSettings: readEnvSettingsMock,
}));

const {
  configGet,
  configList,
  configSet,
  configUnset,
  isConfigKey,
  mergeSecretsWithEnv,
  tryConfigSetSecret,
} = await import('../config/manage.js');

describe('config manage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    loadSavedSettingsMock.mockResolvedValue({
      model: 'deepseek/deepseek-v4-pro',
      modelSettings: { temperature: 0.7, maxTokens: 4000, topP: 1 },
      modelRequestTimeoutMs: 90000,
      modelRequestMaxAttempts: 4,
      t2i: { modelId: 'flux', replicateModelId: 'black-forest-labs/flux-schnell', inputOverrides: {}, maxAttempts: 4 },
      notifications: { enabled: false },
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      style: 'professional',
      intent: 'tutorial',
      targetLength: 900,
      planModel: 'deepseek/deepseek-v4-pro',
      planIntentModel: 'deepseek/deepseek-v4-flash',
      seoCheckMode: 'errors-only',
      seoCheckMaxTurns: 10,
    });

    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: 'openrouter-token',
      replicateApiToken: null,
      googleAdsDeveloperToken: null,
      googleAdsClientId: null,
      googleAdsClientSecret: null,
      googleAdsRefreshToken: null,
      googleAdsCustomerId: null,
      googleAdsLoginCustomerId: null,
    });

    readEnvSettingsMock.mockReturnValue({});
  });

  it('lists settings values and secret availability', async () => {
    const result = await configList();

    expect(result.settings.model).toBe('deepseek/deepseek-v4-pro');
    expect(result.settings.style).toBe('professional');
    expect(result.settings.intent).toBe('tutorial');
    expect(result.settings['t2i.replicateModelId']).toBe('black-forest-labs/flux-schnell');
    expect(result.secrets.openRouterApiKey).toBe(true);
    expect(result.secrets.replicateApiToken).toBe(false);
  });

  it('lists secret availability from env when keychain is empty', async () => {
    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: null,
      replicateApiToken: null,
      googleAdsDeveloperToken: null,
      googleAdsClientId: null,
      googleAdsClientSecret: null,
      googleAdsRefreshToken: null,
      googleAdsCustomerId: null,
      googleAdsLoginCustomerId: null,
    });
    readEnvSettingsMock.mockReturnValue({
      openRouterApiKey: 'env-openrouter',
      replicateApiToken: 'env-replicate',
      googleAdsDeveloperToken: 'env-dev-token',
      googleAdsClientId: 'env-client-id',
      googleAdsClientSecret: 'env-client-secret',
      googleAdsRefreshToken: 'env-refresh',
      googleAdsCustomerId: 'env-customer',
      googleAdsLoginCustomerId: 'env-login-customer',
    });

    const result = await configList();

    expect(result.secrets).toEqual({
      openRouterApiKey: true,
      replicateApiToken: true,
      googleAdsDeveloperToken: true,
      googleAdsClientId: true,
      googleAdsClientSecret: true,
      googleAdsRefreshToken: true,
      googleAdsCustomerId: true,
      googleAdsLoginCustomerId: true,
    });
  });

  it('prefers env over keychain for secret availability', async () => {
    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: 'keychain-openrouter',
      replicateApiToken: null,
      googleAdsDeveloperToken: null,
      googleAdsClientId: null,
      googleAdsClientSecret: null,
      googleAdsRefreshToken: null,
      googleAdsCustomerId: null,
      googleAdsLoginCustomerId: null,
    });
    readEnvSettingsMock.mockReturnValue({
      replicateApiToken: 'env-replicate',
    });

    const result = await configList();

    expect(result.secrets.openRouterApiKey).toBe(true);
    expect(result.secrets.replicateApiToken).toBe(true);
  });

  it('gets secret availability from env when keychain is empty', async () => {
    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: null,
      replicateApiToken: null,
      googleAdsDeveloperToken: null,
      googleAdsClientId: null,
      googleAdsClientSecret: null,
      googleAdsRefreshToken: null,
      googleAdsCustomerId: null,
      googleAdsLoginCustomerId: null,
    });
    readEnvSettingsMock.mockReturnValue({
      googleAdsRefreshToken: 'env-refresh',
    });

    const result = await configGet('googleAdsRefreshToken');

    expect(result.isSecret).toBe(true);
    expect(result.value).toBe(true);
  });

  it('mergeSecretsWithEnv mirrors resolver precedence', () => {
    const merged = mergeSecretsWithEnv(
      {
        openRouterApiKey: 'env-openrouter',
        replicateApiToken: undefined,
        googleAdsDeveloperToken: undefined,
        googleAdsClientId: undefined,
        googleAdsClientSecret: undefined,
        googleAdsRefreshToken: 'env-refresh',
        googleAdsCustomerId: undefined,
        googleAdsLoginCustomerId: undefined,
      },
      {
        openRouterApiKey: 'keychain-openrouter',
        replicateApiToken: 'keychain-replicate',
        googleAdsDeveloperToken: null,
        googleAdsClientId: null,
        googleAdsClientSecret: null,
        googleAdsRefreshToken: null,
        googleAdsCustomerId: null,
        googleAdsLoginCustomerId: null,
      },
    );

    expect(merged.openRouterApiKey).toBe('env-openrouter');
    expect(merged.replicateApiToken).toBe('keychain-replicate');
    expect(merged.googleAdsRefreshToken).toBe('env-refresh');
  });

  it('gets a scalar setting', async () => {
    const result = await configGet('modelSettings.temperature');

    expect(result.isSecret).toBe(false);
    expect(result.value).toBe(0.7);
  });

  it('gets secret availability', async () => {
    const result = await configGet('openRouterApiKey');

    expect(result.isSecret).toBe(true);
    expect(result.value).toBe(true);
  });

  it('sets and unsets settings through schema-safe writes', async () => {
    await configSet('style', 'technical');
    expect(saveSettingsMock).toHaveBeenCalledWith(expect.objectContaining({ style: 'technical' }));

    await configSet('intent', 'case-study');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ intent: 'case-study' }));

    await configUnset('style');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ style: 'professional' }));

    await configUnset('intent');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ intent: 'tutorial' }));
  });

  it('sets and unsets secrets via secret store', async () => {
    await configSet('openRouterApiKey', 'new-token');
    expect(saveSecretsMock).toHaveBeenCalledWith({ openRouterApiKey: 'new-token' }, { disableKeytar: undefined });

    await configUnset('openRouterApiKey');
    expect(saveSecretsMock).toHaveBeenLastCalledWith({ openRouterApiKey: null }, { disableKeytar: undefined });
  });

  it('tryConfigSetSecret reports env source when secret is already in env', async () => {
    readEnvSettingsMock.mockReturnValue({ openRouterApiKey: 'from-env' });

    const result = await tryConfigSetSecret('openRouterApiKey', 'new-token');

    expect(result).toEqual({ saved: true, source: 'env' });
    expect(saveSecretsMock).not.toHaveBeenCalled();
  });

  it('tryConfigSetSecret saves to keychain when env is empty', async () => {
    readEnvSettingsMock.mockReturnValue({});

    const result = await tryConfigSetSecret('openRouterApiKey', 'new-token');

    expect(result).toEqual({ saved: true, source: 'keychain' });
    expect(saveSecretsMock).toHaveBeenCalledWith({ openRouterApiKey: 'new-token' }, { disableKeytar: undefined });
  });

  it('tryConfigSetSecret returns skipped when keytar is unavailable', async () => {
    readEnvSettingsMock.mockReturnValue({});
    saveSecretsMock.mockRejectedValue(Object.assign(new Error('disabled'), { name: 'KeytarUnavailableError' }));

    const result = await tryConfigSetSecret('openRouterApiKey', 'new-token');

    expect(result).toEqual({ saved: false, source: 'skipped' });
  });

  it('configSet throws when keytar is unavailable and env is empty', async () => {
    readEnvSettingsMock.mockReturnValue({});
    saveSecretsMock.mockRejectedValue(Object.assign(new Error('disabled'), { name: 'KeytarUnavailableError' }));

    await expect(configSet('openRouterApiKey', 'new-token')).rejects.toThrow(
      'Cannot save openRouterApiKey to keychain (TELEPAT_DISABLE_KEYTAR=true)',
    );
  });

  it('validates known keys', () => {
    expect(isConfigKey('style')).toBe(true);
    expect(isConfigKey('intent')).toBe(true);
    expect(isConfigKey('t2i.replicateModelId')).toBe(true);
    expect(isConfigKey('openRouterApiKey')).toBe(true);
    expect(isConfigKey('defaultPublication')).toBe(true);
    expect(isConfigKey('unknown.key')).toBe(false);
  });

  it('gets defaultPublication when set', async () => {
    loadSavedSettingsMock.mockResolvedValue({
      model: 'deepseek/deepseek-v4-pro',
      modelSettings: { temperature: 0.7, maxTokens: 4000, topP: 1 },
      modelRequestTimeoutMs: 90000,
      modelRequestMaxAttempts: 4,
      t2i: { modelId: 'flux', replicateModelId: 'black-forest-labs/flux-schnell', inputOverrides: {}, maxAttempts: 4 },
      notifications: { enabled: false },
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      style: 'professional',
      intent: 'tutorial',
      targetLength: 900,
      defaultPublication: 'tech-blog',
      planModel: 'deepseek/deepseek-v4-pro',
      planIntentModel: 'deepseek/deepseek-v4-flash',
      seoCheckMode: 'errors-only',
      seoCheckMaxTurns: 10,
    });

    const result = await configGet('defaultPublication');
    expect(result.isSecret).toBe(false);
    expect(result.value).toBe('tech-blog');
  });

  it('gets defaultPublication as null when unset', async () => {
    const result = await configGet('defaultPublication');
    expect(result.isSecret).toBe(false);
    expect(result.value).toBeNull();
  });

  it('sets defaultPublication', async () => {
    await configSet('defaultPublication', 'my-pub');
    expect(saveSettingsMock).toHaveBeenCalledWith(expect.objectContaining({ defaultPublication: 'my-pub' }));
  });

  it('lists defaultPublication in settings', async () => {
    loadSavedSettingsMock.mockResolvedValue({
      model: 'deepseek/deepseek-v4-pro',
      modelSettings: { temperature: 0.7, maxTokens: 4000, topP: 1 },
      modelRequestTimeoutMs: 90000,
      modelRequestMaxAttempts: 4,
      t2i: { modelId: 'flux', replicateModelId: 'black-forest-labs/flux-schnell', inputOverrides: {}, maxAttempts: 4 },
      notifications: { enabled: false },
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      style: 'professional',
      intent: 'tutorial',
      targetLength: 900,
      defaultPublication: 'my-pub',
      planModel: 'deepseek/deepseek-v4-pro',
      planIntentModel: 'deepseek/deepseek-v4-flash',
      seoCheckMode: 'errors-only',
      seoCheckMaxTurns: 10,
    });

    const result = await configList();
    expect(result.settings.defaultPublication).toBe('my-pub');
  });

  it('rejects empty defaultPublication', async () => {
    await expect(configSet('defaultPublication', '')).rejects.toThrow('defaultPublication cannot be empty');
  });

  it('sets and unsets t2i.replicateModelId', async () => {
    await configSet('t2i.replicateModelId', 'black-forest-labs/flux-2-pro');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        t2i: expect.objectContaining({
          modelId: 'flux',
          replicateModelId: 'black-forest-labs/flux-2-pro',
        }),
      }),
    );

    await configUnset('t2i.replicateModelId');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        t2i: expect.objectContaining({
          replicateModelId: undefined,
        }),
      }),
    );
  });

  it('coerces numeric and boolean fields', async () => {
    await configSet('modelSettings.temperature', '0.4');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        modelSettings: expect.objectContaining({ temperature: 0.4 }),
      }),
    );

    await configSet('modelSettings.maxTokens', '2400');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        modelSettings: expect.objectContaining({ maxTokens: 2400 }),
      }),
    );

    await configSet('modelSettings.topP', '0.8');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        modelSettings: expect.objectContaining({ topP: 0.8 }),
      }),
    );

    await configSet('modelRequestTimeoutMs', '120000');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ modelRequestTimeoutMs: 120000 }),
    );

    await configSet('notifications.enabled', 'true');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        notifications: expect.objectContaining({ enabled: true }),
      }),
    );
  });

  it('updates model and enum fields', async () => {
    await configSet('model', 'openai/gpt-4.1');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'openai/gpt-4.1' }));

    await configSet('targetLength', 'large');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ targetLength: 1400 }));

    await configSet('targetLength', '1200');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ targetLength: 1200 }));
  });

  it('throws on invalid values', async () => {
    await expect(configSet('notifications.enabled', 'yes')).rejects.toThrow('true or false');
    await expect(configSet('style', 'unknown-style')).rejects.toThrow('style must be one of');
    await expect(configSet('intent', 'unknown-intent')).rejects.toThrow('intent must be one of');
    await expect(configSet('targetLength', 'tiny')).rejects.toThrow('targetLength must be one of');
    await expect(configSet('modelSettings.maxTokens', '0')).rejects.toThrow('positive integer');
    await expect(configSet('model', '   ')).rejects.toThrow('cannot be empty');
    await expect(configSet('t2i.replicateModelId', '  ')).rejects.toThrow('t2i.replicateModelId cannot be empty');
    await expect(configSet('modelSettings.temperature', 'abc')).rejects.toThrow('must be a number');
    await expect(configSet('modelSettings.topP', 'abc')).rejects.toThrow('must be a number');
  });

  it('gets all setting keys', async () => {
    expect((await configGet('model')).value).toBe('deepseek/deepseek-v4-pro');
    expect((await configGet('modelSettings.maxTokens')).value).toBe(4000);
    expect((await configGet('modelSettings.topP')).value).toBe(1);
    expect((await configGet('modelRequestTimeoutMs')).value).toBe(90000);
    expect((await configGet('notifications.enabled')).value).toBe(false);
    expect((await configGet('style')).value).toBe('professional');
    expect((await configGet('intent')).value).toBe('tutorial');
    expect((await configGet('targetLength')).value).toBe(900);
  });

  it('sets notifications.enabled to false', async () => {
    await configSet('notifications.enabled', 'false');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        notifications: expect.objectContaining({ enabled: false }),
      }),
    );
  });
});
