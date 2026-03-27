import { getT2IModel } from '../models/t2i/registry.js';
import type { CostSource } from './events.js';

export interface RetryStats {
  attempts: number;
  retries: number;
  retryBackoffMs: number;
}

export interface LlmUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  providerTotalCostUsd: number | null;
}

export interface LlmCallMetrics extends RetryStats {
  durationMs: number;
  modelId: string;
  usage: LlmUsage;
}

export interface CostEstimate {
  usd: number | null;
  source: CostSource;
}

const LLM_USD_PER_1K_TOKENS: Readonly<Record<string, { input: number; output: number }>> = {
  // AUTO-GENERATED:OPENROUTER_PRICING_START

  // Last refreshed: 2026-03-27
  // Source: https://openrouter.ai/api/v1/models (per-token USD converted to per-1k-token USD)
  'anthropic/claude-3.5-sonnet': { input: 0.006, output: 0.03 },
  'deepseek/deepseek-chat': { input: 0.00032, output: 0.00089 },
  'moonshotai/kimi-k2.5': { input: 0.00045, output: 0.0022 },
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
// AUTO-GENERATED:OPENROUTER_PRICING_END
};

export function estimateLlmCostUsd(modelId: string, usage: LlmUsage): CostEstimate {
  if (usage.providerTotalCostUsd !== null) {
    return { usd: usage.providerTotalCostUsd, source: 'provider' };
  }

  const pricing = LLM_USD_PER_1K_TOKENS[modelId];
  if (!pricing) {
    return { usd: null, source: 'unavailable' };
  }

  const promptTokens = usage.promptTokens ?? 0;
  const completionTokens = usage.completionTokens ?? 0;
  const usd = (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
  return { usd, source: 'estimated' };
}

export function estimateImageCostUsd(modelId: string, input: Record<string, unknown>, imageCount: number): CostEstimate {
  const model = getT2IModel(modelId);
  const pricingRules = 'pricingRules' in model ? model.pricingRules : undefined;
  if (!pricingRules) {
    return { usd: null, source: 'unavailable' };
  }

  if (pricingRules.basis === 'output_image_count' && 'usdPerImage' in pricingRules && typeof pricingRules.usdPerImage === 'number') {
    return {
      usd: pricingRules.usdPerImage * imageCount,
      source: 'estimated',
    };
  }

  if (pricingRules.basis === 'output_image_resolution' && 'tiers' in pricingRules && Array.isArray(pricingRules.tiers)) {
    const resolution = typeof input.resolution === 'string' ? input.resolution : 'fallback';
    const tiers = pricingRules.tiers as Array<{ resolution: string; usdPerImage: number }>;
    const tier = tiers.find((entry) => entry.resolution === resolution)
      ?? tiers.find((entry) => entry.resolution === 'fallback');
    if (tier?.usdPerImage !== undefined) {
      return {
        usd: tier.usdPerImage * imageCount,
        source: 'estimated',
      };
    }
  }

  if (pricingRules.basis === 'output_image_megapixels' && 'tiers' in pricingRules && Array.isArray(pricingRules.tiers)) {
    const megapixels = resolveMegapixels(input);
    const tiers = pricingRules.tiers as Array<{ maxMegapixels: number; usdPerImage: number }>;
    const tier = tiers.find((entry) => megapixels <= entry.maxMegapixels);
    if (tier?.usdPerImage !== undefined) {
      return {
        usd: tier.usdPerImage * imageCount,
        source: 'estimated',
      };
    }
  }

  return { usd: null, source: 'unavailable' };
}

function resolveMegapixels(input: Record<string, unknown>): number {
  const explicit = toNumber(input.megapixels);
  if (explicit !== null) {
    return explicit;
  }

  const width = toNumber(input.width);
  const height = toNumber(input.height);
  if (width !== null && height !== null && width > 0 && height > 0) {
    return (width * height) / 1_000_000;
  }

  return 1;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function sumKnownCosts(values: Array<number | null>): CostEstimate {
  const known = values.filter((value): value is number => typeof value === 'number');
  if (known.length !== values.length) {
    return { usd: null, source: 'unavailable' };
  }

  return {
    usd: known.reduce((total, value) => total + value, 0),
    source: 'estimated',
  };
}
