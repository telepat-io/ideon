import { jest } from '@jest/globals';
import type { AppSettings, SecretSettings } from '../config/schema.js';

const loadSavedSettingsMock = jest.fn<() => Promise<AppSettings>>();
const saveSettingsMock = jest.fn<(settings: AppSettings) => Promise<void>>();
const loadSecretsMock = jest.fn<(options?: { disableKeytar?: boolean }) => Promise<SecretSettings>>();
const saveSecretsMock = jest.fn<(secrets: Partial<SecretSettings>, options?: { disableKeytar?: boolean }) => Promise<void>>();
const readEnvSettingsMock = jest.fn<() => { disableKeytar?: boolean }>();

jest.unstable_mockModule('../config/settingsFile.js', () => ({
  loadSavedSettings: loadSavedSettingsMock,
  saveSettings: saveSettingsMock,
}));

jest.unstable_mockModule('../config/secretStore.js', () => ({
  loadSecrets: loadSecretsMock,
  saveSecrets: saveSecretsMock,
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
