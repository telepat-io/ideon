import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { AppSettings, SecretSettings } from '../../config/schema.js';
import { getLimnGenerationModels } from '../../images/limnModelCatalog.js';
import { applyEdit, handleMenuSelect, type EditingState, type MenuAction } from './settingsFlowLogic.js';

interface SettingsFlowProps {
  initialSettings: AppSettings;
  initialSecrets: SecretSettings;
  onDone: (result: { settings: AppSettings; secrets: SecretSettings } | null) => void;
}

interface MenuItem {
  label: string;
  value: MenuAction;
}

export function SettingsFlow({ initialSettings, initialSecrets, onDone }: SettingsFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [secrets, setSecrets] = useState<SecretSettings>(initialSecrets);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [menuMode, setMenuMode] = useState<'main' | 't2i'>('main');
  const currentModelEntry = getLimnGenerationModels().find((m) => m.family === settings.t2i.modelId) ?? getLimnGenerationModels()[0];

  useInput((input, key) => {
    if (key.escape) {
      if (editing) {
        setEditing(null);
        return;
      }

      if (showModelSelect) {
        setShowModelSelect(false);
        return;
      }

      if (menuMode === 't2i') {
        setMenuMode('main');
        return;
      }
    }

    if (key.ctrl && input === 'c') {
      onDone(null);
      exit();
    }
  });

  const formatT2iOverridesSummary = (overrides: Record<string, unknown>): string => {
    const count = Object.keys(overrides).length;
    return count === 0 ? 'none' : `${count} override${count === 1 ? '' : 's'}`;
  };

  const menuItems = useMemo<MenuItem[]>(() => {
    const t2iSubmenu: MenuItem[] = [
      {
        label: `T2I model: ${currentModelEntry?.displayName ?? settings.t2i.modelId}`,
        value: 't2i-model',
      },
      {
        label: `T2I input overrides: ${formatT2iOverridesSummary(settings.t2i.inputOverrides)}`,
        value: 't2i-input-overrides',
      },
      {
        label: 'Back',
        value: 't2i-back',
      },
    ];

    if (menuMode === 't2i') {
      return t2iSubmenu;
    }

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
        label: `T2I settings: ${currentModelEntry?.displayName ?? settings.t2i.modelId}`,
        value: 't2i-settings',
      },
      {
        label: 'Save and exit',
        value: 'save',
      },
      {
        label: 'Cancel',
        value: 'cancel',
      },
    ];
  }, [currentModelEntry, menuMode, secrets.openRouterApiKey, secrets.replicateApiToken, settings]);

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
          const accepted = applyEdit(editing.key, value, settings, secrets, setSettings, setSecrets);
          if (accepted) {
            setEditing(null);
          }
          return accepted;
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
        <SelectInput
          items={menuItems}
          onSelect={(item) => handleMenuSelect(item.value, settings, secrets, setEditing, setShowModelSelect, setMenuMode, onDone, exit)}
        />
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
  onSubmit: (value: string) => boolean;
  onCancel: () => void;
}): React.JSX.Element {
  const [value, setValue] = useState(editing.value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(editing.value);
    setError(null);
  }, [editing]);

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
            const accepted = onSubmit(nextValue);
            if (!accepted) {
              setError('Invalid JSON. Please enter an object or leave blank to clear.');
            }
          }}
        />
      </Box>
      {error ? (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      ) : null}
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

