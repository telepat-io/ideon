import { describe, it, expect } from '@jest/globals';
import { mergeSeeds, deduplicateSeeds, generateLongTailVariants, DEFAULT_MODIFIERS } from '../plan/seeds.js';
import type { SeedKeyword } from '../types/plan.js';

describe('mergeSeeds', () => {
  it('merges forced seeds, LLM seeds, and fresh cache seeds', () => {
    const llmSeeds: SeedKeyword[] = [
      { keyword: 'llm-seed-1', rationale: 'test', scope: 'head', estimatedIntent: 'informational' },
      { keyword: 'llm-seed-2', rationale: 'test', scope: 'long-tail', estimatedIntent: 'commercial' },
    ];
    const forcedSeeds = ['forced-seed-1'];
    const freshFromCache = ['cache-seed-1'];

    const result = mergeSeeds(llmSeeds, forcedSeeds, freshFromCache);

    expect(result).toContain('forced-seed-1');
    expect(result).toContain('llm-seed-1');
    expect(result).toContain('llm-seed-2');
    expect(result).toContain('cache-seed-1');
    expect(result.length).toBe(4);
  });

  it('deduplicates across sources', () => {
    const llmSeeds: SeedKeyword[] = [
      { keyword: 'duplicate-seed', rationale: 'test', scope: 'head', estimatedIntent: 'informational' },
    ];
    const forcedSeeds = ['duplicate-seed'];
    const freshFromCache = ['duplicate-seed'];

    const result = mergeSeeds(llmSeeds, forcedSeeds, freshFromCache);

    expect(result).toEqual(['duplicate-seed']);
  });

  it('handles empty inputs', () => {
    const result = mergeSeeds([], [], []);
    expect(result).toEqual([]);
  });

  it('preserves order: forced first, then LLM, then cache', () => {
    const llmSeeds: SeedKeyword[] = [
      { keyword: 'llm-1', rationale: 'test', scope: 'head', estimatedIntent: 'informational' },
    ];
    const forcedSeeds = ['forced-1'];
    const freshFromCache = ['cache-1'];

    const result = mergeSeeds(llmSeeds, forcedSeeds, freshFromCache);

    expect(result[0]).toBe('forced-1');
    expect(result[1]).toBe('llm-1');
    expect(result[2]).toBe('cache-1');
  });
});

describe('deduplicateSeeds', () => {
  it('removes exact duplicates', () => {
    const seeds = ['keyword-1', 'keyword-2', 'keyword-1'];
    const result = deduplicateSeeds(seeds);
    expect(result).toEqual(['keyword-1', 'keyword-2']);
  });

  it('removes case-insensitive duplicates', () => {
    const seeds = ['Keyword-One', 'keyword-one', 'KEYWORD-ONE'];
    const result = deduplicateSeeds(seeds);
    expect(result).toEqual(['Keyword-One']);
  });

  it('normalizes whitespace and special characters', () => {
    const seeds = ['test keyword', 'test-keyword', 'test  keyword'];
    const result = deduplicateSeeds(seeds);
    expect(result).toEqual(['test keyword']);
  });

  it('preserves first occurrence of duplicates', () => {
    const seeds = ['first', 'second', 'first', 'third', 'second'];
    const result = deduplicateSeeds(seeds);
    expect(result).toEqual(['first', 'second', 'third']);
  });

  it('handles empty array', () => {
    const result = deduplicateSeeds([]);
    expect(result).toEqual([]);
  });

  it('handles single element', () => {
    const result = deduplicateSeeds(['only-one']);
    expect(result).toEqual(['only-one']);
  });
});

describe('generateLongTailVariants', () => {
  it('generates variants with each modifier', () => {
    const seed = 'content marketing';
    const modifiers = ['for SaaS', 'guide'];
    const result = generateLongTailVariants(seed, modifiers);

    expect(result).toEqual(['content marketing for SaaS', 'content marketing guide']);
  });

  it('returns empty array for empty modifiers', () => {
    const result = generateLongTailVariants('seed', []);
    expect(result).toEqual([]);
  });

  it('handles empty seed', () => {
    const result = generateLongTailVariants('', ['modifier']);
    expect(result).toEqual([' modifier']);
  });
});

describe('DEFAULT_MODIFIERS', () => {
  it('contains expected modifiers', () => {
    expect(DEFAULT_MODIFIERS).toContain('for SaaS');
    expect(DEFAULT_MODIFIERS).toContain('for B2B');
    expect(DEFAULT_MODIFIERS).toContain('best practices');
    expect(DEFAULT_MODIFIERS).toContain('guide');
    expect(DEFAULT_MODIFIERS).toContain('examples');
    expect(DEFAULT_MODIFIERS).toContain('tips');
  });

  it('has exactly 6 modifiers', () => {
    expect(DEFAULT_MODIFIERS.length).toBe(6);
  });
});
