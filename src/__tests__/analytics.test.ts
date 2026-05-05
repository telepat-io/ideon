import { estimateLlmCostUsd, sumKnownCosts } from '../pipeline/analytics.js';

describe('estimateLlmCostUsd', () => {
  it('uses provider cost when available', () => {
    const result = estimateLlmCostUsd('deepseek/deepseek-v4-pro', {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      providerTotalCostUsd: 0.42,
    });

    expect(result).toEqual({ usd: 0.42, source: 'provider' });
  });

  it('estimates from known model pricing', () => {
    const result = estimateLlmCostUsd('deepseek/deepseek-v4-pro', {
      promptTokens: 1000,
      completionTokens: 1000,
      totalTokens: 2000,
      providerTotalCostUsd: null,
    });

    expect(result.source).toBe('estimated');
    expect(result.usd).toBeCloseTo(0.001305, 8);
  });

  it('coalesces null token counts to zero', () => {
    const result = estimateLlmCostUsd('deepseek/deepseek-v4-pro', {
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      providerTotalCostUsd: null,
    });

    expect(result).toEqual({ usd: 0, source: 'estimated' });
  });

  it('returns unavailable for unknown model ids', () => {
    const result = estimateLlmCostUsd('unknown/model', {
      promptTokens: 100,
      completionTokens: 100,
      totalTokens: 200,
      providerTotalCostUsd: null,
    });

    expect(result).toEqual({ usd: null, source: 'unavailable' });
  });
});

describe('sumKnownCosts', () => {
  it('sums all known costs', () => {
    const result = sumKnownCosts([0.1, 0.2, 0.3]);

    expect(result.source).toBe('estimated');
    expect(result.usd).toBeCloseTo(0.6, 8);
  });

  it('returns unavailable if any cost is unknown', () => {
    const result = sumKnownCosts([0.1, null, 0.3]);

    expect(result).toEqual({ usd: null, source: 'unavailable' });
  });
});
