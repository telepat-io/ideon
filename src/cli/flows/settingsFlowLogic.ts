import type { Dispatch } from 'react';
import type { AppSettings, SecretSettings } from '../../config/schema.js';

export type MenuAction =
  | 'openrouter'
  | 'replicate'
  | 'llm-model'
  | 'notifications-enabled'
  | 'temperature'
  | 'maxTokens'
  | 'topP'
  | 'markdownOutputDir'
  | 'assetOutputDir'
  | 't2i-settings'
  | 't2i-model'
  | 't2i-replicate-model-id'
  | 't2i-input-overrides'
  | 't2i-back'
  | 'save'
  | 'cancel';

export interface EditingState {
  key: MenuAction;
  label: string;
  value: string;
}

export function handleMenuSelect(
  action: MenuAction,
  settings: AppSettings,
  secrets: SecretSettings,
  setEditing: Dispatch<React.SetStateAction<EditingState | null>>,
  setShowModelSelect: Dispatch<React.SetStateAction<boolean>>,
  setMenuMode: Dispatch<React.SetStateAction<'main' | 't2i'>>,
  onDone: (result: { settings: AppSettings; secrets: SecretSettings } | null) => void,
  exit: () => void,
): void {
  switch (action) {
    case 'openrouter':
      setEditing({ key: action, label: 'OpenRouter API key', value: secrets.openRouterApiKey ?? '' });
      return;
    case 'replicate':
      setEditing({ key: action, label: 'Replicate API token', value: secrets.replicateApiToken ?? '' });
      return;
    case 'llm-model':
      setEditing({ key: action, label: 'LLM model', value: settings.model });
      return;
    case 'notifications-enabled':
      setEditing({ key: action, label: 'Notifications > OS notifications enabled (true|false)', value: String(settings.notifications.enabled) });
      return;
    case 'temperature':
      setEditing({ key: action, label: 'Temperature', value: String(settings.modelSettings.temperature) });
      return;
    case 'maxTokens':
      setEditing({ key: action, label: 'Max tokens', value: String(settings.modelSettings.maxTokens) });
      return;
    case 'topP':
      setEditing({ key: action, label: 'Top p', value: String(settings.modelSettings.topP) });
      return;
    case 'markdownOutputDir':
      setEditing({ key: action, label: 'Markdown output directory', value: settings.markdownOutputDir });
      return;
    case 'assetOutputDir':
      setEditing({ key: action, label: 'Asset output directory', value: settings.assetOutputDir });
      return;
    case 't2i-settings':
      setMenuMode('t2i');
      return;
    case 't2i-model':
      setShowModelSelect(true);
      return;
    case 't2i-input-overrides':
      setEditing({
        key: action,
        label: 'T2I input overrides (JSON)',
        value: JSON.stringify(settings.t2i.inputOverrides, null, 2),
      });
      return;
    case 't2i-replicate-model-id':
      setEditing({
        key: action,
        label: 'T2I Replicate model ID override (blank to clear)',
        value: settings.t2i.replicateModelId ?? '',
      });
      return;
    case 't2i-back':
      setMenuMode('main');
      return;
    case 'save':
      onDone({ settings, secrets });
      exit();
      return;
    case 'cancel':
      onDone(null);
      exit();
      return;
  }
}

export function applyEdit(
  action: MenuAction,
  value: string,
  settings: AppSettings,
  secrets: SecretSettings,
  setSettings: Dispatch<React.SetStateAction<AppSettings>>,
  setSecrets: Dispatch<React.SetStateAction<SecretSettings>>,
): boolean {
  if (action === 'openrouter') {
    setSecrets({ ...secrets, openRouterApiKey: value.trim() || null });
    return true;
  }

  if (action === 'replicate') {
    setSecrets({ ...secrets, replicateApiToken: value.trim() || null });
    return true;
  }

  if (action === 'llm-model') {
    setSettings({ ...settings, model: value.trim() || settings.model });
    return true;
  }

  if (action === 'notifications-enabled') {
    const parsed = parseBooleanOrFallback(value, settings.notifications.enabled);
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        enabled: parsed,
      },
    });
    return true;
  }

  if (action === 'temperature') {
    const nextTemperature = clampNumber(parseNumberOrFallback(value, settings.modelSettings.temperature), 0, 2);
    setSettings({
      ...settings,
      modelSettings: {
        ...settings.modelSettings,
        temperature: nextTemperature,
      },
    });
    return true;
  }

  if (action === 'maxTokens') {
    const nextMaxTokens = Math.max(1, Math.round(parseNumberOrFallback(value, settings.modelSettings.maxTokens)));
    setSettings({
      ...settings,
      modelSettings: {
        ...settings.modelSettings,
        maxTokens: nextMaxTokens,
      },
    });
    return true;
  }

  if (action === 'topP') {
    const nextTopP = clampNumber(parseNumberOrFallback(value, settings.modelSettings.topP), 0, 1);
    setSettings({
      ...settings,
      modelSettings: {
        ...settings.modelSettings,
        topP: nextTopP,
      },
    });
    return true;
  }

  if (action === 'markdownOutputDir') {
    setSettings({ ...settings, markdownOutputDir: value.trim() || settings.markdownOutputDir });
    return true;
  }

  if (action === 'assetOutputDir') {
    setSettings({ ...settings, assetOutputDir: value.trim() || settings.assetOutputDir });
    return true;
  }

  if (action === 't2i-input-overrides') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setSettings({
        ...settings,
        t2i: {
          ...settings.t2i,
          inputOverrides: {},
        },
      });
      return true;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return false;
      }

      setSettings({
        ...settings,
        t2i: {
          ...settings.t2i,
          inputOverrides: parsed,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  if (action === 't2i-replicate-model-id') {
    const trimmed = value.trim();
    setSettings({
      ...settings,
      t2i: {
        ...settings.t2i,
        replicateModelId: trimmed.length > 0 ? trimmed : undefined,
      },
    });
    return true;
  }

  return false;
}

function parseNumberOrFallback(value: string, fallback: number): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseBooleanOrFallback(value: string, fallback: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
}
