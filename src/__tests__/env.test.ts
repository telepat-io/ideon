import { readEnvSettings } from '../config/env.js';

describe('readEnvSettings', () => {
  it('returns empty parsed settings when env is empty', () => {
    const result = readEnvSettings({});

    expect(result).toEqual({});
  });

  it('parses numeric values from env strings', () => {
    const result = readEnvSettings({
      IDEON_TEMPERATURE: '0.9',
      IDEON_MAX_TOKENS: '2048',
      IDEON_TOP_P: '0.6',
      IDEON_MODEL_REQUEST_TIMEOUT_MS: '12345',
    });

    expect(result.temperature).toBe(0.9);
    expect(result.maxTokens).toBe(2048);
    expect(result.topP).toBe(0.6);
    expect(result.modelRequestTimeoutMs).toBe(12345);
  });

  it('drops non-finite numeric values', () => {
    const result = readEnvSettings({
      IDEON_TEMPERATURE: 'Infinity',
      IDEON_TOP_P: 'abc',
      IDEON_MAX_TOKENS: '',
    });

    expect(result.temperature).toBeUndefined();
    expect(result.topP).toBeUndefined();
    expect(result.maxTokens).toBeUndefined();
  });

  it('parses zero and negative numbers before schema validation', () => {
    expect(() =>
      readEnvSettings({
        IDEON_TEMPERATURE: '0',
        IDEON_TOP_P: '0',
      }),
    ).not.toThrow();

    expect(() =>
      readEnvSettings({
        IDEON_MODEL_REQUEST_TIMEOUT_MS: '-1',
      }),
    ).toThrow();
  });

  it('reads string settings from custom env objects', () => {
    const result = readEnvSettings({
      IDEON_OPENROUTER_API_KEY: 'openrouter-key',
      IDEON_REPLICATE_API_TOKEN: 'replicate-token',
      IDEON_MODEL: 'moonshotai/kimi-k2.5',
      IDEON_NOTIFICATIONS_ENABLED: 'true',
      IDEON_MARKDOWN_OUTPUT_DIR: '/tmp/out',
      IDEON_ASSET_OUTPUT_DIR: '/tmp/out/assets',
      IDEON_STYLE: 'technical',
      IDEON_TARGET_LENGTH: 'large',
    });

    expect(result).toMatchObject({
      openRouterApiKey: 'openrouter-key',
      replicateApiToken: 'replicate-token',
      model: 'moonshotai/kimi-k2.5',
      notificationsEnabled: true,
      markdownOutputDir: '/tmp/out',
      assetOutputDir: '/tmp/out/assets',
      style: 'technical',
      targetLength: 'large',
    });
  });

  it('parses notifications boolean values and drops invalid values', () => {
    const enabledResult = readEnvSettings({
      IDEON_NOTIFICATIONS_ENABLED: 'TRUE',
    });
    const disabledResult = readEnvSettings({
      IDEON_NOTIFICATIONS_ENABLED: 'false',
    });
    const invalidResult = readEnvSettings({
      IDEON_NOTIFICATIONS_ENABLED: 'yes',
    });

    expect(enabledResult.notificationsEnabled).toBe(true);
    expect(disabledResult.notificationsEnabled).toBe(false);
    expect(invalidResult.notificationsEnabled).toBeUndefined();
  });
});
