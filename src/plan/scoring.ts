import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { AppSettings } from '../config/schema.js';
import type { KeywordCandidate, IntentClassifications } from '../types/plan.js';
import { intentClassificationsSchema } from '../types/plan.js';
import { buildIntentClassificationMessages } from '../llm/prompts/intentClassification.js';

export interface ScoringParams {
  lowVolumeMode: boolean;
}

export const DEFAULT_SCORING_PARAMS: ScoringParams = {
  lowVolumeMode: false,
};

export interface ScoringResult {
  shortlist: KeywordCandidate[];
  discarded: Array<{ keyword: string; kobScore: number; reason: string }>;
}

export function computeKobScore(candidate: KeywordCandidate): number {
  const vs = volumeScore(candidate.avgMonthlySearches);
  const is = candidate.intentScore ?? 1;
  const ds = difficultyScore(candidate.competitionIndex, candidate.competition);

  candidate.volumeScore = vs;
  candidate.difficultyScore = ds;
  candidate.kobScore = (vs * is) / ds;

  return candidate.kobScore;
}

function volumeScore(avgMonthlySearches: number | null): number {
  if (avgMonthlySearches === null) return 1;
  if (avgMonthlySearches < 10) return 1;
  if (avgMonthlySearches < 100) return 2;
  if (avgMonthlySearches < 500) return 3;
  if (avgMonthlySearches < 2000) return 4;
  return 5;
}

function difficultyScore(competitionIndex: number | null, competition: 'LOW' | 'MEDIUM' | 'HIGH' | null): number {
  if (competitionIndex !== null) {
    if (competitionIndex < 33) return 1;
    if (competitionIndex < 66) return 2;
    return 3;
  }
  if (competition === 'LOW') return 1;
  if (competition === 'MEDIUM') return 2;
  return 3;
}

export async function classifyIntent(
  client: OpenRouterClient,
  settings: AppSettings,
  candidates: KeywordCandidate[],
): Promise<void> {
  const toClassify = candidates.filter((c) => c.intentType === undefined);

  if (toClassify.length === 0) return;

  const chunks = chunkArray(toClassify, 50);

  for (const chunk of chunks) {
    const messages = buildIntentClassificationMessages(
      chunk.map((c) => ({
        keyword: c.keyword,
        avgMonthlySearches: c.avgMonthlySearches,
        competition: c.competition,
        highTopOfPageBidMicros: c.highTopOfPageBidMicros,
      })),
    );

    const result = await client.requestStructured<IntentClassifications>({
      schemaName: 'IntentClassifications',
      schema: intentClassificationsSchema.shape,
      messages,
      settings,
      parse: intentClassificationsSchema.parse,
    });

    for (const classification of result.classifications) {
      const normalised = normalizeKeywordKey(classification.keyword);
      const candidate = chunk.find((c) => normalizeKeywordKey(c.keyword) === normalised);
      if (candidate) {
        candidate.intentType = classification.intentType as KeywordCandidate['intentType'];
        candidate.intentScore = classification.intentScore;
      }
    }
  }
}

export function scoreAndFilter(candidates: KeywordCandidate[], params: ScoringParams): ScoringResult {
  const discarded: Array<{ keyword: string; kobScore: number; reason: string }> = [];
  const shortlist: KeywordCandidate[] = [];

  const threshold = params.lowVolumeMode ? 1 : 2;

  for (const candidate of candidates) {
    const kobScore = candidate.kobScore ?? computeKobScore(candidate);

    const allZero =
      kobScore < 2 &&
      candidate.avgMonthlySearches === null &&
      (candidate.intentScore ?? 1) <= 2;

    if (allZero && kobScore < threshold) {
      discarded.push({
        keyword: candidate.keyword,
        kobScore,
        reason: 'low KOB score, no volume signal, low intent',
      });
    } else if (kobScore < threshold) {
      discarded.push({
        keyword: candidate.keyword,
        kobScore,
        reason: `KOB score ${kobScore.toFixed(2)} below threshold ${threshold}`,
      });
    } else {
      shortlist.push(candidate);
    }
  }

  return { shortlist, discarded };
}

function normalizeKeywordKey(keyword: string): string {
  return keyword
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-keyword';
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
