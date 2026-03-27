import React from 'react';
import { render } from 'ink';
import { SettingsFlow } from '../flows/settingsFlow.js';
import type { AppSettings, SecretSettings } from '../../config/schema.js';
import { getSettingsFilePath, loadSavedSettings, saveSettings } from '../../config/settingsFile.js';
import { loadSecrets, saveSecrets } from '../../config/secretStore.js';

interface SettingsFlowResult {
  settings: AppSettings;
  secrets: SecretSettings;
}

export async function openSettings(): Promise<void> {
  const [settings, secrets] = await Promise.all([loadSavedSettings(), loadSecrets()]);
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

  await Promise.all([saveSettings(savedResult.settings), saveSecrets(savedResult.secrets)]);
  console.log(`Settings saved to ${getSettingsFilePath()}.`);
}