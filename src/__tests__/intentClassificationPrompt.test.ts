import { describe, it, expect } from '@jest/globals';
import { buildIntentClassificationMessages } from '../llm/prompts/intentClassification.js';

describe('buildIntentClassificationMessages', () => {
  it('returns system and user messages', () => {
    const messages = buildIntentClassificationMessages([]);

    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes system instruction about CPC', () => {
    const messages = buildIntentClassificationMessages([]);

    expect(messages[0].content).toContain('CPC');
    expect(messages[0].content).toContain('highTopOfPageBidMicros');
  });

  it('includes keyword details in user message', () => {
    const messages = buildIntentClassificationMessages([
      {
        keyword: 'test keyword',
        avgMonthlySearches: 100,
        competition: 'LOW',
        highTopOfPageBidMicros: 1000000,
      },
    ]);

    expect(messages[1].content).toContain('test keyword');
    expect(messages[1].content).toContain('100');
    expect(messages[1].content).toContain('LOW');
    expect(messages[1].content).toContain('1000000');
  });

  it('handles null values with dash placeholder', () => {
    const messages = buildIntentClassificationMessages([
      {
        keyword: 'test',
        avgMonthlySearches: null,
        competition: null,
        highTopOfPageBidMicros: null,
      },
    ]);

    expect(messages[1].content).toContain('dash');
    expect(messages[1].content).toContain('N/A');
  });

  it('includes intent classification instructions', () => {
    const messages = buildIntentClassificationMessages([]);

    expect(messages[1].content).toContain('intentType');
    expect(messages[1].content).toContain('informational');
    expect(messages[1].content).toContain('commercial');
    expect(messages[1].content).toContain('transactional');
    expect(messages[1].content).toContain('intentScore');
  });

  it('includes CPC threshold guidance', () => {
    const messages = buildIntentClassificationMessages([]);

    expect(messages[1].content).toContain('$3');
    expect(messages[1].content).toContain('push intentScore up');
  });

  it('includes JSON response format instruction', () => {
    const messages = buildIntentClassificationMessages([]);

    expect(messages[1].content).toContain('Respond only in JSON');
    expect(messages[1].content).toContain('classifications');
  });

  it('handles multiple keywords', () => {
    const messages = buildIntentClassificationMessages([
      { keyword: 'kw1', avgMonthlySearches: 100, competition: 'LOW', highTopOfPageBidMicros: 1000000 },
      { keyword: 'kw2', avgMonthlySearches: 200, competition: 'MEDIUM', highTopOfPageBidMicros: 2000000 },
      { keyword: 'kw3', avgMonthlySearches: 300, competition: 'HIGH', highTopOfPageBidMicros: 3000000 },
    ]);

    expect(messages[1].content).toContain('kw1');
    expect(messages[1].content).toContain('kw2');
    expect(messages[1].content).toContain('kw3');
  });
});
