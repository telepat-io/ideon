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
      model: 'moonshotai/kimi-k2.5',
      modelSettings: { temperature: 0.7, maxTokens: 4000, topP: 1 },
      modelRequestTimeoutMs: 90000,
      t2i: { modelId: 'black-forest-labs/flux-schnell', inputOverrides: {} },
      notifications: { enabled: false },
      markdownOutputDir: '/output',
      assetOutputDir: '/output/assets',
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      style: 'professional',
      targetLength: 900,
    });

    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: 'openrouter-token',
      replicateApiToken: null,
    });

    readEnvSettingsMock.mockReturnValue({});
  });

  it('lists settings values and secret availability', async () => {
    const result = await configList();

    expect(result.settings.model).toBe('moonshotai/kimi-k2.5');
    expect(result.settings.style).toBe('professional');
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

    await configUnset('style');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ style: 'professional' }));
  });

  it('sets and unsets secrets via secret store', async () => {
    await configSet('openRouterApiKey', 'new-token');
    expect(saveSecretsMock).toHaveBeenCalledWith({ openRouterApiKey: 'new-token' }, { disableKeytar: undefined });

    await configUnset('openRouterApiKey');
    expect(saveSecretsMock).toHaveBeenLastCalledWith({ openRouterApiKey: null }, { disableKeytar: undefined });
  });

  it('validates known keys', () => {
    expect(isConfigKey('style')).toBe(true);
    expect(isConfigKey('openRouterApiKey')).toBe(true);
    expect(isConfigKey('unknown.key')).toBe(false);
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

  it('updates path and enum fields', async () => {
    await configSet('model', 'openai/gpt-4.1');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'openai/gpt-4.1' }));

    await configSet('markdownOutputDir', '/tmp/md');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ markdownOutputDir: '/tmp/md' }));

    await configSet('assetOutputDir', '/tmp/assets');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ assetOutputDir: '/tmp/assets' }));

    await configSet('targetLength', 'large');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ targetLength: 1400 }));

    await configSet('targetLength', '1200');
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ targetLength: 1200 }));
  });

  it('throws on invalid values', async () => {
    await expect(configSet('notifications.enabled', 'yes')).rejects.toThrow('true or false');
    await expect(configSet('style', 'unknown-style')).rejects.toThrow('style must be one of');
    await expect(configSet('targetLength', 'tiny')).rejects.toThrow('targetLength must be one of');
    await expect(configSet('modelSettings.maxTokens', '0')).rejects.toThrow('positive integer');
    await expect(configSet('model', '   ')).rejects.toThrow('cannot be empty');
  });
});
