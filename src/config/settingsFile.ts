import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';
import { appSettingsSchema, defaultAppSettings, type AppSettings } from './schema.js';

const ideonPaths = envPaths('ideon', { suffix: '' });
const settingsDir = path.join(ideonPaths.config);
const settingsFilePath = path.join(settingsDir, 'settings.json');

export function getSettingsFilePath(): string {
  return settingsFilePath;
}

export async function loadSavedSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsFilePath, 'utf8');
    return appSettingsSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultAppSettings;
    }

    throw error;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await mkdir(settingsDir, { recursive: true });
  await writeFile(settingsFilePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}