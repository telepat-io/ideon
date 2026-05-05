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

  // Last refreshed: 2026-05-05
  // Source: https://openrouter.ai/api/v1/models (per-token USD converted to per-1k-token USD)
  'anthropic/claude-3.5-sonnet': { input: 0.006, output: 0.03 },
  'deepseek/deepseek-chat': { input: 0.00032, output: 0.00089 },
  'deepseek/deepseek-v4-pro': { input: 0.000435, output: 0.00087 },
  'moonshotai/kimi-k2.5': { input: 0.00044, output: 0.002 },
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
