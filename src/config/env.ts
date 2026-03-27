import { envSettingsSchema, type EnvSettings } from './schema.js';

function parseNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readEnvSettings(env: NodeJS.ProcessEnv = process.env): EnvSettings {
  return envSettingsSchema.parse({
    openRouterApiKey: env.IDEON_OPENROUTER_API_KEY,
    replicateApiToken: env.IDEON_REPLICATE_API_TOKEN,
    model: env.IDEON_MODEL,
    temperature: parseNumber(env.IDEON_TEMPERATURE),
    maxTokens: parseNumber(env.IDEON_MAX_TOKENS),
    topP: parseNumber(env.IDEON_TOP_P),
    modelRequestTimeoutMs: parseNumber(env.IDEON_MODEL_REQUEST_TIMEOUT_MS),
    markdownOutputDir: env.IDEON_MARKDOWN_OUTPUT_DIR,
    assetOutputDir: env.IDEON_ASSET_OUTPUT_DIR,
  });
}