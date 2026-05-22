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
      TELEPAT_OPENROUTER_KEY: 'openrouter-key',
      TELEPAT_REPLICATE_TOKEN: 'replicate-token',
      IDEON_MODEL: 'deepseek/deepseek-v4-pro',
      IDEON_NOTIFICATIONS_ENABLED: 'true',
      IDEON_STYLE: 'technical',
      IDEON_INTENT: 'tutorial',
      IDEON_TARGET_LENGTH: 'large',
    });

    expect(result).toMatchObject({
      openRouterApiKey: 'openrouter-key',
      replicateApiToken: 'replicate-token',
      model: 'deepseek/deepseek-v4-pro',
      notificationsEnabled: true,
      style: 'technical',
      intent: 'tutorial',
      targetLength: 1400,
    });
  });

  it('accepts numeric word count from IDEON_TARGET_LENGTH', () => {
    const result = readEnvSettings({
      IDEON_TARGET_LENGTH: '1250',
    });

    expect(result.targetLength).toBe(1250);
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

  it('reads IDEON_MODEL_REQUEST_MAX_ATTEMPTS from env', () => {
    const result = readEnvSettings({
      IDEON_MODEL_REQUEST_MAX_ATTEMPTS: '6',
    });

    expect(result.modelRequestMaxAttempts).toBe(6);
  });

  it('falls back to process.env when no argument is provided', () => {
    const original = process.env.IDEON_MODEL;
    process.env.IDEON_MODEL = 'env-default-model';
    try {
      const result = readEnvSettings();
      expect(result.model).toBe('env-default-model');
    } finally {
      if (original === undefined) {
        delete process.env.IDEON_MODEL;
      } else {
        process.env.IDEON_MODEL = original;
      }
    }
  });

  it('parses TELEPAT_DISABLE_KEYTAR as a boolean', () => {
    const enabledResult = readEnvSettings({
      TELEPAT_DISABLE_KEYTAR: 'true',
    });
    const disabledResult = readEnvSettings({
      TELEPAT_DISABLE_KEYTAR: 'FALSE',
    });
    const invalidResult = readEnvSettings({
      TELEPAT_DISABLE_KEYTAR: 'sometimes',
    });

    expect(enabledResult.disableKeytar).toBe(true);
    expect(disabledResult.disableKeytar).toBe(false);
    expect(invalidResult.disableKeytar).toBeUndefined();
  });
});
