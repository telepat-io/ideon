import React, { useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { AppSettings, SecretSettings } from '../../config/schema.js';
import { getLimnGenerationModels } from '../../images/limnModelCatalog.js';

type MenuAction =
  | 'openrouter'
  | 'replicate'
  | 'llm-model'
  | 'notifications-enabled'
  | 'temperature'
  | 'maxTokens'
  | 'topP'
  | 'markdownOutputDir'
  | 'assetOutputDir'
  | 't2i-model'
  | 'save'
  | 'cancel';

interface SettingsFlowProps {
  initialSettings: AppSettings;
  initialSecrets: SecretSettings;
  onDone: (result: { settings: AppSettings; secrets: SecretSettings } | null) => void;
}

interface MenuItem {
  label: string;
  value: MenuAction;
}

interface EditingState {
  key: MenuAction;
  label: string;
  value: string;
}

export function SettingsFlow({ initialSettings, initialSecrets, onDone }: SettingsFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [secrets, setSecrets] = useState<SecretSettings>(initialSecrets);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const currentModelEntry = getLimnGenerationModels().find((m) => m.family === settings.t2i.modelId) ?? getLimnGenerationModels()[0];

  useInput((input, key) => {
    if (key.escape) {
      if (editing) {
        setEditing(null);
        return;
      }

      if (showModelSelect) {
        setShowModelSelect(false);
      }
    }

    if (key.ctrl && input === 'c') {
      onDone(null);
      exit();
    }
  });

  const menuItems = useMemo<MenuItem[]>(() => {
    const t2iItems: MenuItem[] = [];

    return [
      {
        label: `OpenRouter API key: ${secrets.openRouterApiKey ? 'stored in keychain' : 'missing'}`,
        value: 'openrouter',
      },
      {
        label: `Replicate API token: ${secrets.replicateApiToken ? 'stored in keychain' : 'missing'}`,
        value: 'replicate',
      },
      {
        label: `LLM model: ${settings.model}`,
        value: 'llm-model',
      },
      {
        label: `Notifications > OS notifications enabled: ${settings.notifications.enabled ? 'true' : 'false'}`,
        value: 'notifications-enabled',
      },
      {
        label: `Temperature: ${settings.modelSettings.temperature}`,
        value: 'temperature',
      },
      {
        label: `Max tokens: ${settings.modelSettings.maxTokens}`,
        value: 'maxTokens',
      },
      {
        label: `Top p: ${settings.modelSettings.topP}`,
        value: 'topP',
      },
      {
        label: `Markdown output directory: ${settings.markdownOutputDir}`,
        value: 'markdownOutputDir',
      },
      {
        label: `Asset output directory: ${settings.assetOutputDir}`,
        value: 'assetOutputDir',
      },
      {
        label: `T2I model: ${currentModelEntry?.displayName ?? settings.t2i.modelId}`,
        value: 't2i-model',
      },
      ...t2iItems,
      {
        label: 'Save and exit',
        value: 'save',
      },
      {
        label: 'Cancel',
        value: 'cancel',
      },
    ];
  }, [currentModelEntry, secrets.openRouterApiKey, secrets.replicateApiToken, settings]);

  if (showModelSelect) {
    const items = getLimnGenerationModels().map((model) => ({
      label: `${model.displayName} (${model.family})`,
      value: model.family,
    }));

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Choose T2I Model
        </Text>
        <Text color="gray">Press Esc to go back.</Text>
        <SelectInput
          items={items}
          onSelect={(item) => {
            setSettings((current) => ({
              ...current,
              t2i: {
                modelId: item.value,
                inputOverrides: {},
              },
            }));
            setShowModelSelect(false);
          }}
        />
      </Box>
    );
  }

  if (editing) {
    return (
      <EditorView
        editing={editing}
        onSubmit={(value) => {
          applyEdit(editing.key, value, settings, secrets, setSettings, setSecrets);
          setEditing(null);
        }}
        onCancel={() => {
          setEditing(null);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        Ideon Settings
      </Text>
      <Text color="gray">Enter to edit. Esc backs out of nested menus. Ctrl+C cancels.</Text>
      <Box marginTop={1} flexDirection="column">
        <SelectInput items={menuItems} onSelect={(item) => handleMenuSelect(item.value, settings, secrets, setEditing, setShowModelSelect, onDone, exit)} />
      </Box>
    </Box>
  );
}

function EditorView({
  editing,
  onSubmit,
  onCancel,
}: {
  editing: EditingState;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [value, setValue] = useState(editing.value);

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        {editing.label}
      </Text>
      <Text color="gray">Enter saves. Blank value clears nullable secrets and overrides. Esc cancels.</Text>
      <Box marginTop={1}>
        <Text>{'> '}</Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={(nextValue) => {
            onSubmit(nextValue);
          }}
        />
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Current value: {editing.value || '(empty)'}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press Esc to return without changes.
        </Text>
      </Box>
    </Box>
  );
}

function handleMenuSelect(
  action: MenuAction,
  settings: AppSettings,
  secrets: SecretSettings,
  setEditing: React.Dispatch<React.SetStateAction<EditingState | null>>,
  setShowModelSelect: React.Dispatch<React.SetStateAction<boolean>>,
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
    case 't2i-model':
      setShowModelSelect(true);
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

function applyEdit(
  action: MenuAction,
  value: string,
  settings: AppSettings,
  secrets: SecretSettings,
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
  setSecrets: React.Dispatch<React.SetStateAction<SecretSettings>>,
): void {
  if (action === 'openrouter') {
    setSecrets({ ...secrets, openRouterApiKey: value.trim() || null });
    return;
  }

  if (action === 'replicate') {
    setSecrets({ ...secrets, replicateApiToken: value.trim() || null });
    return;
  }

  if (action === 'llm-model') {
    setSettings({ ...settings, model: value.trim() || settings.model });
    return;
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
    return;
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
    return;
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
    return;
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
    return;
  }

  if (action === 'markdownOutputDir') {
    setSettings({ ...settings, markdownOutputDir: value.trim() || settings.markdownOutputDir });
    return;
  }

  if (action === 'assetOutputDir') {
    setSettings({ ...settings, assetOutputDir: value.trim() || settings.assetOutputDir });
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '(default)';
  }

  return String(value);
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
