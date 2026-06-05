import { describe, it, expect } from '@jest/globals';
import { DEFAULT_MODIFIERS, generateLongTailVariants } from '../plan/seeds.js';

describe('seeds - generateLongTailVariants detailed', () => {
  it('generates variants with all default modifiers', () => {
    const seed = 'content marketing';
    const result = generateLongTailVariants(seed, DEFAULT_MODIFIERS);

    expect(result).toHaveLength(6);
    expect(result).toContain('content marketing for SaaS');
    expect(result).toContain('content marketing for B2B');
    expect(result).toContain('content marketing best practices');
    expect(result).toContain('content marketing guide');
    expect(result).toContain('content marketing examples');
    expect(result).toContain('content marketing tips');
  });

  it('handles seed with special characters', () => {
    const seed = 'C++ programming';
    const result = generateLongTailVariants(seed, ['for beginners']);

    expect(result).toEqual(['C++ programming for beginners']);
  });

  it('handles empty modifier array', () => {
    const result = generateLongTailVariants('seed', []);
    expect(result).toEqual([]);
  });
});

describe('seeds - DEFAULT_MODIFIERS', () => {
  it('contains exactly 6 modifiers', () => {
    expect(DEFAULT_MODIFIERS).toHaveLength(6);
  });

  it('all modifiers are non-empty strings', () => {
    for (const modifier of DEFAULT_MODIFIERS) {
      expect(typeof modifier).toBe('string');
      expect(modifier.length).toBeGreaterThan(0);
    }
  });
});
