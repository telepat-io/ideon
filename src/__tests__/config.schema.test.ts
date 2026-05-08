import { jest } from '@jest/globals';

jest.unstable_mockModule('../images/limnModelCatalog.js', () => ({
  DEFAULT_LIMN_MODEL_ID: 'flux',
  isKnownLimnFamily: (family: string) => family === 'flux',
  isKnownReplicateModelId: (replicateModelId: string) => replicateModelId === 'flux-123',
  resolveFamilyFromReplicateModelId: (replicateModelId: string) => replicateModelId === 'flux-123' ? 'flux' : null,
  isReplicateModelIdForFamily: (family: string, replicateModelId: string) => family === 'flux' && replicateModelId === 'flux-123',
}));

const {
  appSettingsSchema,
  envSettingsSchema,
  resolveTargetLengthAlias,
  resolveDefaultMaxLinks,
  resolveDefaultInlineImageCount,
} = await import('../config/schema.js');

describe('config schema utilities', () => {
  describe('resolveTargetLengthAlias', () => {
    it('maps small target lengths to small', () => {
      expect(resolveTargetLengthAlias(100)).toBe('small');
      expect(resolveTargetLengthAlias(700)).toBe('small');
    });

    it('maps medium target lengths to medium', () => {
      expect(resolveTargetLengthAlias(701)).toBe('medium');
      expect(resolveTargetLengthAlias(1150)).toBe('medium');
    });

    it('maps large target lengths to large', () => {
      expect(resolveTargetLengthAlias(1151)).toBe('large');
      expect(resolveTargetLengthAlias(5000)).toBe('large');
    });

    it('falls back to medium for invalid values', () => {
      expect(resolveTargetLengthAlias(NaN)).toBe('medium');
      expect(resolveTargetLengthAlias(-1)).toBe('medium');
    });
  });

  describe('envSettingsSchema targetLength parsing', () => {
    it('parses numeric targetLength strings', () => {
      expect(envSettingsSchema.parse({ targetLength: '1250' }).targetLength).toBe(1250);
      expect(envSettingsSchema.parse({ targetLength: '700' }).targetLength).toBe(700);
    });

    it('parses alias targetLength strings', () => {
      expect(envSettingsSchema.parse({ targetLength: 'small' }).targetLength).toBe(500);
      expect(envSettingsSchema.parse({ targetLength: 'LARGE' }).targetLength).toBe(1400);
    });

    it('parses numeric targetLength values', () => {
      expect(envSettingsSchema.parse({ targetLength: 1250 }).targetLength).toBe(1250);
      expect(envSettingsSchema.parse({ targetLength: 600 }).targetLength).toBe(600);
    });

    it('rejects invalid targetLength values', () => {
      expect(() => envSettingsSchema.parse({ targetLength: 'not-a-number' })).toThrow();
      expect(() => envSettingsSchema.parse({ targetLength: '' })).toThrow();
      expect(() => envSettingsSchema.parse({ targetLength: 0 })).toThrow();
      expect(() => envSettingsSchema.parse({ targetLength: -1 })).toThrow();
    });
  });

  describe('appSettingsSchema t2i normalization', () => {
    it('falls back to default LIMN model for unknown ids', () => {
      const parsed = appSettingsSchema.parse({ t2i: { modelId: 'unknown', replicateModelId: 'unknown' } });
      expect(parsed.t2i.modelId).toBe('flux');
      expect(parsed.t2i.replicateModelId).toBeUndefined();
    });

    it('accepts a minimal t2i settings object', () => {
      const parsed = appSettingsSchema.parse({ t2i: {} });
      expect(parsed.t2i.modelId).toBe('flux');
      expect(parsed.t2i.replicateModelId).toBeUndefined();
    });

    it('keeps a valid replicateModelId for a known family', () => {
      const parsed = appSettingsSchema.parse({ t2i: { modelId: 'flux', replicateModelId: 'flux-123' } });
      expect(parsed.t2i.modelId).toBe('flux');
      expect(parsed.t2i.replicateModelId).toBe('flux-123');
    });

    it('drops an invalid replicateModelId for a known family', () => {
      const parsed = appSettingsSchema.parse({ t2i: { modelId: 'flux', replicateModelId: 'invalid' } });
      expect(parsed.t2i.modelId).toBe('flux');
      expect(parsed.t2i.replicateModelId).toBeUndefined();
    });

    it('resolves a known replicate model id into a family', () => {
      const parsed = appSettingsSchema.parse({ t2i: { modelId: 'flux-123' } });
      expect(parsed.t2i.modelId).toBe('flux');
      expect(parsed.t2i.replicateModelId).toBe('flux-123');
    });

    it('resolves a known replicateModelId field into a family', () => {
      const parsed = appSettingsSchema.parse({ t2i: { replicateModelId: 'flux-123' } });
      expect(parsed.t2i.modelId).toBe('flux');
      expect(parsed.t2i.replicateModelId).toBe('flux-123');
    });

    it('rejects invalid contentTargets without a primary role', () => {
      expect(() => appSettingsSchema.parse({ contentTargets: [{ contentType: 'article', role: 'secondary', count: 1 }] })).toThrow(
        /contentTargets must include exactly one primary target\./,
      );
    });
  });

  describe('resolveDefaultMaxLinks', () => {
    it('returns 5 for small word counts', () => {
      expect(resolveDefaultMaxLinks(300)).toBe(5);
      expect(resolveDefaultMaxLinks(700)).toBe(5);
    });

    it('returns 8 for medium word counts', () => {
      expect(resolveDefaultMaxLinks(900)).toBe(8);
      expect(resolveDefaultMaxLinks(1150)).toBe(8);
    });

    it('returns 12 for large word counts', () => {
      expect(resolveDefaultMaxLinks(1400)).toBe(12);
      expect(resolveDefaultMaxLinks(2000)).toBe(12);
    });
  });

  describe('resolveDefaultInlineImageCount', () => {
    it('returns 0-1 for small word counts', () => {
      expect(resolveDefaultInlineImageCount(300)).toEqual({ min: 0, max: 1 });
      expect(resolveDefaultInlineImageCount(700)).toEqual({ min: 0, max: 1 });
    });

    it('returns 1-2 for medium word counts', () => {
      expect(resolveDefaultInlineImageCount(701)).toEqual({ min: 1, max: 2 });
      expect(resolveDefaultInlineImageCount(1150)).toEqual({ min: 1, max: 2 });
    });

    it('returns 2-4 for large word counts', () => {
      expect(resolveDefaultInlineImageCount(1151)).toEqual({ min: 2, max: 4 });
      expect(resolveDefaultInlineImageCount(2000)).toEqual({ min: 2, max: 4 });
    });

    it('falls back to medium for invalid word counts', () => {
      expect(resolveDefaultInlineImageCount(Number.NaN)).toEqual({ min: 1, max: 2 });
      expect(resolveDefaultInlineImageCount(0)).toEqual({ min: 1, max: 2 });
    });
  });
});
