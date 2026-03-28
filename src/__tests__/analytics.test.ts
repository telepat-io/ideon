import { estimateImageCostUsd, estimateLlmCostUsd, sumKnownCosts } from '../pipeline/analytics.js';

describe('estimateLlmCostUsd', () => {
  it('uses provider cost when available', () => {
    const result = estimateLlmCostUsd('moonshotai/kimi-k2.5', {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      providerTotalCostUsd: 0.42,
    });

    expect(result).toEqual({ usd: 0.42, source: 'provider' });
  });

  it('estimates from known model pricing', () => {
    const result = estimateLlmCostUsd('moonshotai/kimi-k2.5', {
      promptTokens: 1000,
      completionTokens: 1000,
      totalTokens: 2000,
      providerTotalCostUsd: null,
    });

    expect(result.source).toBe('estimated');
    expect(result.usd).toBeCloseTo(0.00265, 8);
  });

  it('coalesces null token counts to zero', () => {
    const result = estimateLlmCostUsd('moonshotai/kimi-k2.5', {
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

describe('estimateImageCostUsd', () => {
  it('estimates output_image_count pricing', () => {
    const result = estimateImageCostUsd('bytedance/seedream-4', {}, 2);

    expect(result).toEqual({ usd: 0.06, source: 'estimated' });
  });

  it('estimates output_image_resolution pricing from requested resolution', () => {
    const result = estimateImageCostUsd('google/nano-banana-pro', { resolution: '4K' }, 2);

    expect(result).toEqual({ usd: 0.6, source: 'estimated' });
  });

  it('falls back to resolution fallback tier when resolution is missing/unknown', () => {
    const missingResolution = estimateImageCostUsd('google/nano-banana-pro', {}, 2);
    const unknownResolution = estimateImageCostUsd('google/nano-banana-pro', { resolution: '8K' }, 2);

    expect(missingResolution).toEqual({ usd: 0.07, source: 'estimated' });
    expect(unknownResolution).toEqual({ usd: 0.07, source: 'estimated' });
  });

  it('estimates megapixel pricing from explicit megapixels value', () => {
    const result = estimateImageCostUsd('prunaai/z-image-turbo', { megapixels: '0.5' }, 3);

    expect(result).toEqual({ usd: 0.0075, source: 'estimated' });
  });

  it('estimates megapixel pricing from width and height values', () => {
    const result = estimateImageCostUsd('prunaai/z-image-turbo', { width: '1024', height: '768' }, 2);

    expect(result).toEqual({ usd: 0.01, source: 'estimated' });
  });

  it('uses default megapixels when dimensions are invalid', () => {
    const result = estimateImageCostUsd('prunaai/z-image-turbo', { width: 0, height: 'bad' }, 1);

    expect(result).toEqual({ usd: 0.005, source: 'estimated' });
  });

  it('returns unavailable when megapixels are above all pricing tiers', () => {
    const result = estimateImageCostUsd('prunaai/z-image-turbo', { megapixels: 9 }, 1);

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
