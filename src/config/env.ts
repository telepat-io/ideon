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
    openRouterApiKey: env.TELEPAT_OPENROUTER_KEY,
    replicateApiToken: env.TELEPAT_REPLICATE_TOKEN,
    disableKeytar: parseBoolean(env.TELEPAT_DISABLE_KEYTAR),
    model: env.IDEON_MODEL,
    temperature: parseNumber(env.IDEON_TEMPERATURE),
    maxTokens: parseNumber(env.IDEON_MAX_TOKENS),
    topP: parseNumber(env.IDEON_TOP_P),
    modelRequestTimeoutMs: parseNumber(env.IDEON_MODEL_REQUEST_TIMEOUT_MS),
    modelRequestMaxAttempts: parseNumber(env.IDEON_MODEL_REQUEST_MAX_ATTEMPTS),
    notificationsEnabled: parseBoolean(env.IDEON_NOTIFICATIONS_ENABLED),
    style: env.IDEON_STYLE,
    intent: env.IDEON_INTENT,
    targetLength: env.IDEON_TARGET_LENGTH,
  });
}