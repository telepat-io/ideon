import { describe, it, expect } from '@jest/globals';

describe('research - generateBroadenedSeeds', () => {
  it('returns empty array for empty topCandidates', () => {
    const result = generateBroadenedSeeds([], ['exhausted']);
    expect(result).toEqual([]);
  });

  it('returns empty array when all combinations are exhausted', () => {
    const exhausted = [
      'test for beginners',
      'test vs competitors',
      'test for enterprise',
      'test cost of',
      'test pricing of',
      'other for beginners',
      'other vs competitors',
      'other for enterprise',
      'other cost of',
      'other pricing of',
    ];
    const result = generateBroadenedSeeds(['test', 'other'], exhausted);
    expect(result).toEqual([]);
  });

  it('generates broadened seeds from top candidates', () => {
    const result = generateBroadenedSeeds(['SEO', 'marketing'], []);
    expect(result.length).toBe(10);
    expect(result).toContain('SEO for beginners');
    expect(result).toContain('SEO vs competitors');
    expect(result).toContain('marketing for beginners');
    expect(result).toContain('marketing vs competitors');
  });

  it('limits to top 3 candidates only', () => {
    const result = generateBroadenedSeeds(['a', 'b', 'c', 'd'], []);
    expect(result.length).toBe(15);
  });

  it('filters out exhausted variants', () => {
    const result = generateBroadenedSeeds(['SEO'], ['SEO for beginners', 'SEO vs competitors']);
    expect(result).not.toContain('SEO for beginners');
    expect(result).not.toContain('SEO vs competitors');
    expect(result).toContain('SEO for enterprise');
    expect(result).toContain('SEO cost of');
    expect(result).toContain('SEO pricing of');
  });

  it('returns variants in order', () => {
    const result = generateBroadenedSeeds(['test'], []);
    expect(result[0]).toBe('test for beginners');
    expect(result[1]).toBe('test vs competitors');
    expect(result[2]).toBe('test for enterprise');
    expect(result[3]).toBe('test cost of');
    expect(result[4]).toBe('test pricing of');
  });
});

function generateBroadenedSeeds(topCandidates: string[], exhausted: string[]): string[] {
  const modifiers = ['for beginners', 'vs competitors', 'for enterprise', 'cost of', 'pricing of'];
  const broadened: string[] = [];

  for (const kw of topCandidates.slice(0, 3)) {
    for (const mod of modifiers) {
      const variant = `${kw} ${mod}`;
      if (!exhausted.includes(variant)) {
        broadened.push(variant);
      }
    }
  }

  return broadened;
}