import { envSettingsSchema, type EnvSettings } from './schema.js';

function parseNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
}

export function readEnvSettings(env: NodeJS.ProcessEnv = process.env): EnvSettings {
  return envSettingsSchema.parse({
    openRouterApiKey: env.IDEON_OPENROUTER_API_KEY,
    replicateApiToken: env.IDEON_REPLICATE_API_TOKEN,
    disableKeytar: parseBoolean(env.IDEON_DISABLE_KEYTAR),
    model: env.IDEON_MODEL,
    temperature: parseNumber(env.IDEON_TEMPERATURE),
    maxTokens: parseNumber(env.IDEON_MAX_TOKENS),
    topP: parseNumber(env.IDEON_TOP_P),
    modelRequestTimeoutMs: parseNumber(env.IDEON_MODEL_REQUEST_TIMEOUT_MS),
    notificationsEnabled: parseBoolean(env.IDEON_NOTIFICATIONS_ENABLED),
    markdownOutputDir: env.IDEON_MARKDOWN_OUTPUT_DIR,
    assetOutputDir: env.IDEON_ASSET_OUTPUT_DIR,
    style: env.IDEON_STYLE,
    targetLength: env.IDEON_TARGET_LENGTH,
  });
}