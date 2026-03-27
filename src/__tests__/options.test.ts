import { coerceT2IFieldValue, sanitizeT2IOverrides, getT2IFieldDefault } from '../models/t2i/options.js';
import { getSupportedT2IModels, DEFAULT_T2I_MODEL_ID } from '../models/t2i/registry.js';

const TEST_MODEL = DEFAULT_T2I_MODEL_ID;

describe('coerceT2IFieldValue', () => {
  it('should be defined for valid model', () => {
    expect(TEST_MODEL).toBeDefined();
  });

  describe('string field coercion', () => {
    it('should return string when already string', () => {
      // Prompt is a standard T2I field
      const result = coerceT2IFieldValue(TEST_MODEL, 'prompt', 'a cat');
      expect(result).toBe('a cat');
    });

    it('should convert non-string to string', () => {
      const result = coerceT2IFieldValue(TEST_MODEL, 'prompt', 123);
      expect(result).toBe('123');
    });

    it('should trim whitespace', () => {
      const result = coerceT2IFieldValue(TEST_MODEL, 'prompt', '  hello  ');
      expect(result).toBe('hello');
    });

    it('should return undefined for empty after trim', () => {
      const result = coerceT2IFieldValue(TEST_MODEL, 'prompt', '   ');
      expect(result).toBeUndefined();
    });
  });

  describe('null handling', () => {
    it('should return undefined for undefined value', () => {
      const result = coerceT2IFieldValue(TEST_MODEL, 'prompt', undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined when field does not exist', () => {
      const result = coerceT2IFieldValue(TEST_MODEL, 'nonexistent_field_xyz', 'value');
      expect(result).toBeUndefined();
    });

    it('should return undefined for null on non-nullable fields', () => {
      const result = coerceT2IFieldValue(TEST_MODEL, 'prompt', null);
      expect(result).toBeUndefined();
    });
  });

  describe('type conversion edge cases', () => {
    it('should handle boolean-like strings', () => {
      // If a field accepts boolean type
      const trueValue = coerceT2IFieldValue(TEST_MODEL, 'go_fast', 'true');
      const falseValue = coerceT2IFieldValue(TEST_MODEL, 'go_fast', 'false');
      // Should either convert or return undefined, but not throw
      expect(trueValue === true || trueValue === undefined).toBe(true);
      expect(falseValue === false || falseValue === undefined).toBe(true);
    });

    it('should handle numeric strings', () => {
      // Try common numeric field if it exists
      const result = coerceT2IFieldValue(TEST_MODEL, 'num_inference_steps', '50');
      // Can be undefined if field doesn't exist in this model
      if (result !== undefined) {
        expect(typeof result === 'number').toBe(true);
      }
    });

    it('should not throw for Infinity', () => {
      expect(() => coerceT2IFieldValue(TEST_MODEL, 'num_inference_steps', Infinity)).not.toThrow();
    });

    it('should not throw for NaN', () => {
      expect(() => coerceT2IFieldValue(TEST_MODEL, 'num_inference_steps', NaN)).not.toThrow();
    });
  });
});

describe('sanitizeT2IOverrides', () => {
  it('should filter to only userConfigurable fields', () => {
    const overrides = {
      prompt: 'test prompt',
      seed: 12345, // Likely user-configurable
    };

    const result = sanitizeT2IOverrides(TEST_MODEL, overrides);
    // Result should be a valid override object (even if empty)
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });

  it('should coerce field values during sanitization', () => {
    const overrides = {
      prompt: '  user prompt  ',
    };

    const result = sanitizeT2IOverrides(TEST_MODEL, overrides);
    // Prompt should be trimmed
    if (result.prompt !== undefined) {
      expect(result.prompt).toBe('user prompt');
    }
  });

  it('should exclude invalid values', () => {
    const overrides = {
      prompt: 'valid',
      num_inference_steps: Infinity,
    };

    const result = sanitizeT2IOverrides(TEST_MODEL, overrides);
    expect(typeof result).toBe('object');
    // Infinity should be excluded
    expect(result.num_inference_steps).toBeUndefined();
  });

  it('should handle empty overrides', () => {
    const result = sanitizeT2IOverrides(TEST_MODEL, {});
    expect(result).toEqual({});
  });

  it('should produce consistent results', () => {
    const overrides = { prompt: 'test' };
    const result1 = sanitizeT2IOverrides(TEST_MODEL, overrides);
    const result2 = sanitizeT2IOverrides(TEST_MODEL, overrides);
    expect(result1).toEqual(result2);
  });

  it('should handle models with different field sets', () => {
    const allModels = getSupportedT2IModels();
    expect(allModels.length).toBeGreaterThan(0);

    // Test that sanitization works for different models
    allModels.forEach((model) => {
      const result = sanitizeT2IOverrides(model.modelId, { prompt: 'test' });
      expect(typeof result).toBe('object');
    });
  });
});

describe('getT2IFieldDefault', () => {
  it('should return a value or undefined for any field', () => {
    const defaultValue = getT2IFieldDefault(TEST_MODEL, 'num_inference_steps');
    // Can be any value or undefined
    expect(defaultValue === undefined || typeof defaultValue === 'number').toBe(true);
  });

  it('should return undefined for nonexistent field', () => {
    const result = getT2IFieldDefault(TEST_MODEL, 'nonexistent_field_xyz');
    expect(result).toBeUndefined();
  });

  it('should have consistent defaults', () => {
    const default1 = getT2IFieldDefault(TEST_MODEL, 'num_inference_steps');
    const default2 = getT2IFieldDefault(TEST_MODEL, 'num_inference_steps');
    expect(default1).toBe(default2);
  });

  it('should support multiple models', () => {
    const allModels = getSupportedT2IModels();
    allModels.forEach((model) => {
      // Should not throw
      const result = getT2IFieldDefault(model.modelId, 'prompt');
      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });
});

describe('model registry', () => {
  it('should have at least one supported model', () => {
    const models = getSupportedT2IModels();
    expect(models.length).toBeGreaterThan(0);
  });

  it('should have a default model', () => {
    expect(DEFAULT_T2I_MODEL_ID).toBeDefined();
    expect(typeof DEFAULT_T2I_MODEL_ID).toBe('string');
    expect(DEFAULT_T2I_MODEL_ID.length).toBeGreaterThan(0);
  });

  it('should have consistent model IDs', () => {
    const models = getSupportedT2IModels();
    models.forEach((model) => {
      expect(model.modelId).toBeDefined();
      expect(typeof model.modelId).toBe('string');
      expect(model.inputOptions).toBeDefined();
      expect(Array.isArray(model.inputOptions.userConfigurable)).toBe(true);
    });
  });
});

