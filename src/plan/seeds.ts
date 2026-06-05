import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { AppSettings } from '../config/schema.js';
import type { SeedKeyword, SeedList, ExhaustionRecord } from '../types/plan.js';
import { buildSeedGenerationMessages, buildSeedBroadeningMessages } from '../llm/prompts/seedGeneration.js';
import { seedListSchema } from '../types/plan.js';
import { normalizeKeywordKey } from '../config/gkpStore.js';

export async function generateSeeds(
  client: OpenRouterClient,
  settings: AppSettings,
  input: {
    contentIdea: string;
    businessContext?: string;
    countryCodes: string[];
    language: string;
    coverageMapKeys: string[];
    cacheSummaryKeys: string[];
    exhaustionRecords: ExhaustionRecord[];
    seedKeywords: string[];
  },
): Promise<SeedKeyword[]> {
  const messages = buildSeedGenerationMessages({
    contentIdea: input.contentIdea,
    businessContext: input.businessContext,
    countryCodes: input.countryCodes,
    language: input.language,
    coverageMapKeys: input.coverageMapKeys,
    cacheSummaryKeys: input.cacheSummaryKeys,
    exhaustionRecords: input.exhaustionRecords,
    seedKeywords: input.seedKeywords,
  });

  const result = await client.requestStructured<SeedList>({
    schemaName: 'SeedList',
    schema: seedListSchema.shape,
    messages,
    settings,
    parse: seedListSchema.parse,
  });

  return result.seeds;
}

export async function broadenSeeds(
  client: OpenRouterClient,
  settings: AppSettings,
  exhaustedSeeds: string[],
  topCandidates: Array<{ keyword: string; highTopOfPageBidMicros: number | null }>,
): Promise<SeedKeyword[]> {
  const messages = buildSeedBroadeningMessages(exhaustedSeeds, topCandidates);

  const result = await client.requestStructured<SeedList>({
    schemaName: 'SeedList',
    schema: seedListSchema.shape,
    messages,
    settings,
    parse: seedListSchema.parse,
  });

  return result.seeds;
}

export function mergeSeeds(
  llmSeeds: SeedKeyword[],
  forcedSeeds: string[],
  freshFromCache: string[],
): string[] {
  const all = new Set<string>();

  for (const seed of forcedSeeds) {
    all.add(seed);
  }

  for (const seed of llmSeeds) {
    all.add(seed.keyword);
  }

  for (const seed of freshFromCache) {
    all.add(seed);
  }

  return Array.from(all);
}

export function deduplicateSeeds(seeds: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const seed of seeds) {
    const normalised = normalizeKeywordKey(seed);
    if (!seen.has(normalised)) {
      seen.add(normalised);
      result.push(seed);
    }
  }

  return result;
}

export function generateLongTailVariants(seed: string, modifiers: string[]): string[] {
  const variants: string[] = [];

  for (const modifier of modifiers) {
    variants.push(`${seed} ${modifier}`);
  }

  return variants;
}

export const DEFAULT_MODIFIERS = [
  'for SaaS',
  'for B2B',
  'best practices',
  'guide',
  'examples',
  'tips',
];
