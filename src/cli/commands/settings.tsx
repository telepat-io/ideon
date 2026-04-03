import React from 'react';
import { render } from 'ink';
import { SettingsFlow } from '../flows/settingsFlow.js';
import type { AppSettings, SecretSettings } from '../../config/schema.js';
import { readEnvSettings } from '../../config/env.js';
import { getSettingsFilePath, loadSavedSettings, saveSettings } from '../../config/settingsFile.js';
import { KeytarUnavailableError, loadSecrets, saveSecrets } from '../../config/secretStore.js';

interface SettingsFlowResult {
  settings: AppSettings;
  secrets: SecretSettings;
}

export async function openSettings(): Promise<void> {
  const envSettings = readEnvSettings();
  const [settings, secrets] = await Promise.all([
    loadSavedSettings(),
    loadSecrets({ disableKeytar: envSettings.disableKeytar }),
  ]);
  let result: SettingsFlowResult | null = null;

  const app = render(
    <SettingsFlow
      initialSettings={settings}
      initialSecrets={secrets}
      onDone={(value) => {
        result = value;
      }}
    />,
  );

  await app.waitUntilExit();
  const finalResult = result;

  if (!finalResult) {
    console.log('Settings unchanged.');
    return;
  }

  const savedResult = finalResult as SettingsFlowResult;

  await saveSettings(savedResult.settings);

  try {
    await saveSecrets(savedResult.secrets, { disableKeytar: envSettings.disableKeytar });
  } catch (error) {
    if (error instanceof KeytarUnavailableError) {
      console.log('Settings saved, but secrets were not stored in the system keychain.');
      console.log('Use IDEON_OPENROUTER_API_KEY and IDEON_REPLICATE_API_TOKEN in this environment.');
      return;
    }

    throw error;
  }

  console.log(`Settings saved to ${getSettingsFilePath()}.`);
}