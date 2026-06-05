import { describe, it, expect } from '@jest/globals';
import { appSettingsSchema, resolveTargetLengthAlias, contentIntentValues, contentTypeValues, writingStyleValues, targetLengthValues } from '../config/schema.js';

describe('schema - appSettingsSchema edge cases', () => {
  it('validates minimal settings', () => {
    const result = appSettingsSchema.safeParse({
      model: 'test-model',
      style: 'professional',
      intent: 'tutorial',
      targetLength: 1500,
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      notifications: { enabled: false },
    });

    expect(result.success).toBe(true);
  });

  it('validates planModel setting', () => {
    const result = appSettingsSchema.safeParse({
      model: 'test-model',
      style: 'professional',
      intent: 'tutorial',
      targetLength: 1500,
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      notifications: { enabled: false },
      planModel: 'deepseek/deepseek-v4-pro',
    });

    expect(result.success).toBe(true);
  });

  it('validates planIntentModel setting', () => {
    const result = appSettingsSchema.safeParse({
      model: 'test-model',
      style: 'professional',
      intent: 'tutorial',
      targetLength: 1500,
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      notifications: { enabled: false },
      planIntentModel: 'deepseek/deepseek-v4-flash',
    });

    expect(result.success).toBe(true);
  });

  it('validates both plan models together', () => {
    const result = appSettingsSchema.safeParse({
      model: 'test-model',
      style: 'professional',
      intent: 'tutorial',
      targetLength: 1500,
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      notifications: { enabled: false },
      planModel: 'deepseek/deepseek-v4-pro',
      planIntentModel: 'deepseek/deepseek-v4-flash',
    });

    expect(result.success).toBe(true);
  });
});

describe('schema - resolveTargetLengthAlias', () => {
  it('returns medium for non-finite values', () => {
    expect(resolveTargetLengthAlias(NaN)).toBe('medium');
    expect(resolveTargetLengthAlias(0)).toBe('medium');
    expect(resolveTargetLengthAlias(-1)).toBe('medium');
  });

  it('returns small for word count <= 700', () => {
    expect(resolveTargetLengthAlias(100)).toBe('small');
    expect(resolveTargetLengthAlias(500)).toBe('small');
    expect(resolveTargetLengthAlias(700)).toBe('small');
  });

  it('returns medium for word count 701-1150', () => {
    expect(resolveTargetLengthAlias(701)).toBe('medium');
    expect(resolveTargetLengthAlias(1000)).toBe('medium');
    expect(resolveTargetLengthAlias(1150)).toBe('medium');
  });

  it('returns large for word count > 1150', () => {
    expect(resolveTargetLengthAlias(1151)).toBe('large');
    expect(resolveTargetLengthAlias(2000)).toBe('large');
    expect(resolveTargetLengthAlias(5000)).toBe('large');
  });
});

describe('schema - contentIntentValues', () => {
  it('contains expected intents', () => {
    expect(contentIntentValues).toContain('how-to-guide');
    expect(contentIntentValues).toContain('listicle');
    expect(contentIntentValues).toContain('deep-dive-analysis');
    expect(contentIntentValues).toContain('case-study');
    expect(contentIntentValues).toContain('tutorial');
    expect(contentIntentValues).toContain('opinion-piece');
  });
});

describe('schema - contentTypeValues', () => {
  it('contains expected content types', () => {
    expect(contentTypeValues).toContain('article');
    expect(contentTypeValues).toContain('blog-post');
    expect(contentTypeValues).toContain('newsletter');
  });
});

describe('schema - writingStyleValues', () => {
  it('contains expected styles', () => {
    expect(writingStyleValues).toContain('professional');
    expect(writingStyleValues).toContain('conversational');
    expect(writingStyleValues).toContain('authoritative');
  });
});

describe('schema - targetLengthValues', () => {
  it('contains expected lengths', () => {
    expect(targetLengthValues).toContain('small');
    expect(targetLengthValues).toContain('medium');
    expect(targetLengthValues).toContain('large');
  });
});
