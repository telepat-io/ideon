import { describe, it, expect } from '@jest/globals';
import { buildSeedGenerationMessages, buildSeedBroadeningMessages } from '../llm/prompts/seedGeneration.js';

describe('buildSeedGenerationMessages', () => {
  it('returns system and user messages', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Content marketing for SaaS',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes content idea in user message', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(messages[1].content).toContain('Content idea: Test idea');
  });

  it('includes business context when provided', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      businessContext: 'B2B SaaS company',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(messages[1].content).toContain('Business context: B2B SaaS company');
  });

  it('shows "not provided" when business context is missing', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(messages[1].content).toContain('Business context: not provided');
  });

  it('includes target market and language', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      countryCodes: ['US', 'GB'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(messages[1].content).toContain('Target market: US, GB');
    expect(messages[1].content).toContain('language: en');
  });

  it('includes coverage map keys when present', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: ['keyword1', 'keyword2', 'keyword3'],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(messages[1].content).toContain('Already covered keywords');
    expect(messages[1].content).toContain('keyword1');
    expect(messages[1].content).toContain('keyword2');
  });

  it('includes cache summary keys when present', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: ['cached1', 'cached2'],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(messages[1].content).toContain('Previously searched seeds');
    expect(messages[1].content).toContain('cached1');
  });

  it('includes exhaustion records when present', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [
        {
          seeds: ['seed1', 'seed2'],
          exhaustedAt: '2024-01-01',
          pivotSuggestions: ['pivot1'],
        },
      ],
      seedKeywords: [],
    });

    expect(messages[1].content).toContain('Known exhausted seed sets');
    expect(messages[1].content).toContain('seed1, seed2');
    expect(messages[1].content).toContain('2024-01-01');
  });

  it('includes user-enforced seeds when present', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: ['enforced1', 'enforced2'],
    });

    expect(messages[1].content).toContain('User-enforced seeds');
    expect(messages[1].content).toContain('enforced1');
    expect(messages[1].content).toContain('enforced2');
  });

  it('shows "none" when no user-enforced seeds', () => {
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(messages[1].content).toContain('User-enforced seeds (always include these): none');
  });

  it('truncates long coverage map keys', () => {
    const longKeys = Array(100).fill('very-long-keyword').join(', ');
    const messages = buildSeedGenerationMessages({
      contentIdea: 'Test idea',
      countryCodes: ['US'],
      language: 'en',
      coverageMapKeys: [longKeys],
      cacheSummaryKeys: [],
      exhaustionRecords: [],
      seedKeywords: [],
    });

    expect(messages[1].content).toContain('...');
  });
});

describe('buildSeedBroadeningMessages', () => {
  it('returns system and user messages', () => {
    const messages = buildSeedBroadeningMessages(
      ['exhausted1'],
      [],
    );

    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes exhausted seeds', () => {
    const messages = buildSeedBroadeningMessages(
      ['seed1', 'seed2'],
      [],
    );

    expect(messages[1].content).toContain('seed1, seed2');
    expect(messages[1].content).toContain('exhausted');
  });

  it('includes top candidates with CPC info', () => {
    const messages = buildSeedBroadeningMessages(
      ['exhausted'],
      [
        { keyword: 'high-cpc', highTopOfPageBidMicros: 5000000 },
        { keyword: 'low-cpc', highTopOfPageBidMicros: 1000000 },
      ],
    );

    expect(messages[1].content).toContain('Best candidates found so far');
    expect(messages[1].content).toContain('high-cpc');
    expect(messages[1].content).toContain('$5.00');
  });

  it('handles null CPC values', () => {
    const messages = buildSeedBroadeningMessages(
      ['exhausted'],
      [
        { keyword: 'no-cpc', highTopOfPageBidMicros: null },
      ],
    );

    expect(messages[1].content).toContain('no-cpc');
    expect(messages[1].content).toContain('N/A');
  });

  it('limits top candidates to 5', () => {
    const topCandidates = Array(10).fill(null).map((_, i) => ({
      keyword: `candidate-${i}`,
      highTopOfPageBidMicros: 1000000,
    }));

    const messages = buildSeedBroadeningMessages(
      ['exhausted'],
      topCandidates,
    );

    expect(messages[1].content).toContain('candidate-0');
    expect(messages[1].content).toContain('candidate-4');
    expect(messages[1].content).not.toContain('candidate-5');
  });

  it('instructs not to repeat exhausted seeds', () => {
    const messages = buildSeedBroadeningMessages(
      ['exhausted'],
      [],
    );

    expect(messages[1].content).toContain('Do not repeat exhausted seeds');
  });
});
