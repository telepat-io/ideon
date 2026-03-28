import { DEFAULT_T2I_MODEL_ID, getSupportedT2IModels, getT2IModel } from '../models/t2i/registry.js';

describe('t2i model registry', () => {
  it('returns all supported models', () => {
    const models = getSupportedT2IModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models.some((model) => model.modelId === DEFAULT_T2I_MODEL_ID)).toBe(true);
  });

  it('returns a model definition by id', () => {
    const model = getT2IModel(DEFAULT_T2I_MODEL_ID);

    expect(model.modelId).toBe(DEFAULT_T2I_MODEL_ID);
    expect(model.provider).toBe('replicate');
    expect(typeof model.displayName).toBe('string');
  });

  it('throws for unsupported model ids', () => {
    expect(() => getT2IModel('invalid/model')).toThrow('Unsupported T2I model: invalid/model');
  });
});
