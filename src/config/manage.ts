import { appSettingsSchema, defaultAppSettings, targetLengthValues, writingStyleValues, type AppSettings } from './schema.js';
import { readEnvSettings } from './env.js';
import { loadSavedSettings, saveSettings } from './settingsFile.js';
import { loadSecrets, saveSecrets, type SecretStoreOptions } from './secretStore.js';

export const configSettingKeys = [
  'model',
  'modelSettings.temperature',
  'modelSettings.maxTokens',
  'modelSettings.topP',
  'modelRequestTimeoutMs',
  'notifications.enabled',
  'markdownOutputDir',
  'assetOutputDir',
  'style',
  'targetLength',
] as const;

export const configSecretKeys = ['openRouterApiKey', 'replicateApiToken'] as const;

export type ConfigSettingKey = (typeof configSettingKeys)[number];
export type ConfigSecretKey = (typeof configSecretKeys)[number];
export type ConfigKey = ConfigSettingKey | ConfigSecretKey;

export interface ConfigListResult {
  settings: Record<ConfigSettingKey, unknown>;
  secrets: Record<ConfigSecretKey, boolean>;
}

export interface ConfigGetResult {
  key: ConfigKey;
  value: unknown;
  isSecret: boolean;
}

export function isConfigSettingKey(key: string): key is ConfigSettingKey {
  return (configSettingKeys as readonly string[]).includes(key);
}

export function isConfigSecretKey(key: string): key is ConfigSecretKey {
  return (configSecretKeys as readonly string[]).includes(key);
}

export function isConfigKey(key: string): key is ConfigKey {
  return isConfigSettingKey(key) || isConfigSecretKey(key);
}

export async function configList(): Promise<ConfigListResult> {
  const [settings, secrets] = await Promise.all([
    loadSavedSettings(),
    loadSecrets(readSecretStoreOptions()),
  ]);

  return {
    settings: {
      model: settings.model,
      'modelSettings.temperature': settings.modelSettings.temperature,
      'modelSettings.maxTokens': settings.modelSettings.maxTokens,
      'modelSettings.topP': settings.modelSettings.topP,
      modelRequestTimeoutMs: settings.modelRequestTimeoutMs,
      'notifications.enabled': settings.notifications.enabled,
      markdownOutputDir: settings.markdownOutputDir,
      assetOutputDir: settings.assetOutputDir,
      style: settings.style,
      targetLength: settings.targetLength,
    },
    secrets: {
      openRouterApiKey: Boolean(secrets.openRouterApiKey),
      replicateApiToken: Boolean(secrets.replicateApiToken),
    },
  };
}

export async function configGet(key: ConfigKey): Promise<ConfigGetResult> {
  if (isConfigSecretKey(key)) {
    const secrets = await loadSecrets(readSecretStoreOptions());
    return {
      key,
      value: Boolean(secrets[key]),
      isSecret: true,
    };
  }

  const settings = await loadSavedSettings();
  return {
    key,
    value: getSettingValue(settings, key),
    isSecret: false,
  };
}

export async function configSet(key: ConfigKey, rawValue: string): Promise<void> {
  if (isConfigSecretKey(key)) {
    await saveSecrets({ [key]: normalizeSecretValue(rawValue) }, readSecretStoreOptions());
    return;
  }

  const settings = await loadSavedSettings();
  const nextSettings = applySettingValue(settings, key, rawValue);
  await saveSettings(appSettingsSchema.parse(nextSettings));
}

export async function configUnset(key: ConfigKey): Promise<void> {
  if (isConfigSecretKey(key)) {
    await saveSecrets({ [key]: null }, readSecretStoreOptions());
    return;
  }

  const settings = await loadSavedSettings();
  const nextSettings = setSettingValue(settings, key, getSettingValue(defaultAppSettings, key));
  await saveSettings(appSettingsSchema.parse(nextSettings));
}

function readSecretStoreOptions(): SecretStoreOptions {
  const envSettings = readEnvSettings();
  return { disableKeytar: envSettings.disableKeytar };
}

function normalizeSecretValue(rawValue: string): string | null {
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function applySettingValue(settings: AppSettings, key: ConfigSettingKey, rawValue: string): AppSettings {
  const value = coerceSettingValue(key, rawValue);
  return setSettingValue(settings, key, value);
}

function coerceSettingValue(key: ConfigSettingKey, rawValue: string): unknown {
  const trimmed = rawValue.trim();

  switch (key) {
    case 'model':
    case 'markdownOutputDir':
    case 'assetOutputDir': {
      if (trimmed.length === 0) {
        throw new Error(`${key} cannot be empty.`);
      }
      return trimmed;
    }
    case 'modelSettings.temperature': {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        throw new Error('modelSettings.temperature must be a number.');
      }
      return parsed;
    }
    case 'modelSettings.maxTokens':
    case 'modelRequestTimeoutMs': {
      const parsed = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${key} must be a positive integer.`);
      }
      return parsed;
    }
    case 'modelSettings.topP': {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        throw new Error('modelSettings.topP must be a number.');
      }
      return parsed;
    }
    case 'notifications.enabled': {
      if (trimmed === 'true') {
        return true;
      }
      if (trimmed === 'false') {
        return false;
      }
      throw new Error('notifications.enabled must be true or false.');
    }
    case 'style': {
      if (!(writingStyleValues as readonly string[]).includes(trimmed)) {
        throw new Error(`style must be one of: ${writingStyleValues.join(', ')}.`);
      }
      return trimmed;
    }
    case 'targetLength': {
      const normalized = trimmed.toLowerCase();
      if ((targetLengthValues as readonly string[]).includes(normalized)) {
        return normalized;
      }

      const parsed = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`targetLength must be one of: ${targetLengthValues.join(', ')}, or a positive integer word count.`);
      }

      return parsed;
    }
    default:
      throw new Error(`Unsupported config key: ${key}`);
  }
}

function getSettingValue(settings: AppSettings, key: ConfigSettingKey): unknown {
  switch (key) {
    case 'model':
      return settings.model;
    case 'modelSettings.temperature':
      return settings.modelSettings.temperature;
    case 'modelSettings.maxTokens':
      return settings.modelSettings.maxTokens;
    case 'modelSettings.topP':
      return settings.modelSettings.topP;
    case 'modelRequestTimeoutMs':
      return settings.modelRequestTimeoutMs;
    case 'notifications.enabled':
      return settings.notifications.enabled;
    case 'markdownOutputDir':
      return settings.markdownOutputDir;
    case 'assetOutputDir':
      return settings.assetOutputDir;
    case 'style':
      return settings.style;
    case 'targetLength':
      return settings.targetLength;
    default:
      return undefined;
  }
}

function setSettingValue(settings: AppSettings, key: ConfigSettingKey, value: unknown): AppSettings {
  switch (key) {
    case 'model':
      return { ...settings, model: value as string };
    case 'modelSettings.temperature':
      return { ...settings, modelSettings: { ...settings.modelSettings, temperature: value as number } };
    case 'modelSettings.maxTokens':
      return { ...settings, modelSettings: { ...settings.modelSettings, maxTokens: value as number } };
    case 'modelSettings.topP':
      return { ...settings, modelSettings: { ...settings.modelSettings, topP: value as number } };
    case 'modelRequestTimeoutMs':
      return { ...settings, modelRequestTimeoutMs: value as number };
    case 'notifications.enabled':
      return { ...settings, notifications: { ...settings.notifications, enabled: value as boolean } };
    case 'markdownOutputDir':
      return { ...settings, markdownOutputDir: value as string };
    case 'assetOutputDir':
      return { ...settings, assetOutputDir: value as string };
    case 'style':
      return { ...settings, style: value as AppSettings['style'] };
    case 'targetLength':
      return { ...settings, targetLength: value as AppSettings['targetLength'] };
    default:
      return settings;
  }
}
