import { ReportedError } from '../reportedError.js';
import {
  configGet,
  configList,
  configSet,
  configUnset,
  isConfigKey,
  type ConfigKey,
} from '../../config/manage.js';

export async function runConfigListCommand(options: { json: boolean }): Promise<void> {
  const result = await configList();

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('Settings');
  for (const [key, value] of Object.entries(result.settings)) {
    console.log(`  ${key}: ${String(value)}`);
  }

  console.log('Secrets');
  for (const [key, isSet] of Object.entries(result.secrets)) {
    console.log(`  ${key}: ${isSet ? 'set' : 'missing'}`);
  }
}

export async function runConfigGetCommand(options: { key: string; json: boolean }): Promise<void> {
  const key = parseConfigKey(options.key);
  const result = await configGet(key);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`${result.key}: ${String(result.value)}`);
}

export async function runConfigSetCommand(options: { key: string; value: string }): Promise<void> {
  const key = parseConfigKey(options.key);

  try {
    await configSet(key, options.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to set config value.';
    throw new ReportedError(message);
  }

  console.log(`Set ${key}.`);
}

export async function runConfigUnsetCommand(options: { key: string }): Promise<void> {
  const key = parseConfigKey(options.key);

  try {
    await configUnset(key);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to unset config value.';
    throw new ReportedError(message);
  }

  console.log(`Unset ${key}.`);
}

function parseConfigKey(rawKey: string): ConfigKey {
  const key = rawKey.trim();
  if (!isConfigKey(key)) {
    throw new ReportedError(
      `Unsupported config key: ${rawKey}. Run \`ideon config list\` to view supported keys.`,
    );
  }

  return key;
}
