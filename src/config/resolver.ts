import { readFile } from 'node:fs/promises';
import { readEnvSettings } from './env.js';
import { loadSavedSettings } from './settingsFile.js';
import { loadSecrets } from './secretStore.js';
import { appSettingsSchema, contentTypeValues, jobInputSchema, writingStyleValues, targetLengthValues, type JobInput, type ResolvedConfig, type TargetLength } from './schema.js';

export interface ContentTargetInput {
  contentType: (typeof contentTypeValues)[number] | string;
  count: number;
}

export interface ResolveConfigInput {
  idea?: string;
  jobPath?: string;
  style?: (typeof writingStyleValues)[number] | string;
  contentTargets?: ContentTargetInput[];
  targetLength?: TargetLength | string;
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

  assertNoLegacyXMode(savedSettings.contentTargets, 'saved settings contentTargets');
  assertNoLegacyXMode(job?.settings?.contentTargets, 'job settings contentTargets');
  assertNoLegacyXMode(input.contentTargets, 'CLI contentTargets');

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
    ...(envSettings.style ? { style: envSettings.style } : {}),
    ...(envSettings.targetLength ? { targetLength: envSettings.targetLength } : {}),
    ...(input.style ? { style: input.style } : {}),
    ...(input.targetLength ? { targetLength: input.targetLength } : {}),
    ...(input.contentTargets ? { contentTargets: input.contentTargets } : {}),
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
  const parsed = JSON.parse(raw) as {
    settings?: {
      contentTargets?: Array<{ contentType?: unknown; count?: unknown; xMode?: unknown }>;
    };
  };

  assertNoLegacyXMode(parsed.settings?.contentTargets, 'job settings contentTargets');
  return jobInputSchema.parse(parsed);
}

function assertNoLegacyXMode(
  contentTargets: Array<{ contentType?: unknown; count?: unknown; xMode?: unknown }> | undefined,
  sourceLabel: string,
): void {
  if (!contentTargets) {
    return;
  }

  const hasLegacyXMode = contentTargets.some((target) => typeof target.xMode === 'string' && target.xMode.length > 0);
  if (!hasLegacyXMode) {
    return;
  }

  throw new Error(
    `Unsupported legacy xMode in ${sourceLabel}. Split X outputs into explicit types by using \"x-post\" for single posts and \"x-thread\" for threaded posts.`,
  );
}