import { readFile } from 'node:fs/promises';
import { readEnvSettings } from './env.js';
import { loadSavedSettings } from './settingsFile.js';
import { loadSecrets } from './secretStore.js';
import { appSettingsSchema, jobInputSchema, type JobInput, type ResolvedConfig } from './schema.js';

export interface ResolveConfigInput {
  idea?: string;
  jobPath?: string;
}

export interface ResolvedRunInput {
  config: ResolvedConfig;
  idea: string;
  job: JobInput | null;
}

export async function resolveRunInput(input: ResolveConfigInput): Promise<ResolvedRunInput> {
  const [savedSettings, secrets] = await Promise.all([loadSavedSettings(), loadSecrets()]);
  const envSettings = readEnvSettings();
  const job = input.jobPath ? await loadJobInput(input.jobPath) : null;

  const mergedSettings = appSettingsSchema.parse({
    ...savedSettings,
    ...(job?.settings ?? {}),
    ...(envSettings.model ? { model: envSettings.model } : {}),
    ...(envSettings.modelRequestTimeoutMs !== undefined
      ? { modelRequestTimeoutMs: envSettings.modelRequestTimeoutMs }
      : {}),
    ...(envSettings.temperature !== undefined || envSettings.maxTokens !== undefined || envSettings.topP !== undefined
      ? {
          modelSettings: {
            ...savedSettings.modelSettings,
            ...(job?.settings?.modelSettings ?? {}),
            ...(envSettings.temperature !== undefined ? { temperature: envSettings.temperature } : {}),
            ...(envSettings.maxTokens !== undefined ? { maxTokens: envSettings.maxTokens } : {}),
            ...(envSettings.topP !== undefined ? { topP: envSettings.topP } : {}),
          },
        }
      : {}),
    ...(envSettings.markdownOutputDir ? { markdownOutputDir: envSettings.markdownOutputDir } : {}),
    ...(envSettings.assetOutputDir ? { assetOutputDir: envSettings.assetOutputDir } : {}),
  });

  const idea = input.idea ?? job?.idea ?? job?.prompt;
  if (!idea) {
    throw new Error('No idea provided. Pass an argument to `ideon write` or use --job with an idea in the JSON file.');
  }

  return {
    config: {
      settings: mergedSettings,
      secrets: {
        openRouterApiKey: envSettings.openRouterApiKey ?? secrets.openRouterApiKey,
        replicateApiToken: envSettings.replicateApiToken ?? secrets.replicateApiToken,
      },
    },
    idea,
    job,
  };
}

async function loadJobInput(jobPath: string): Promise<JobInput> {
  const raw = await readFile(jobPath, 'utf8');
  return jobInputSchema.parse(JSON.parse(raw));
}