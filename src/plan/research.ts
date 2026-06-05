import type { CachedGkpClient } from '../integrations/keywordplanner/cachedClient.js';
import type { KeywordCandidate, CacheSummary } from '../types/plan.js';
import { normalizeKeywordKey } from '../config/gkpStore.js';
import { generateLongTailVariants, DEFAULT_MODIFIERS } from './seeds.js';

export interface ResearchLoopParams {
  targetCandidates: number;
  maxQueryRounds: number;
  diminishingReturnsThreshold: number;
  maxBroadeningAttempts: number;
  highCpcSignalMicros: number;
  cacheTtlDays: number;
}

export const DEFAULT_RESEARCH_PARAMS: ResearchLoopParams = {
  targetCandidates: 30,
  maxQueryRounds: 6,
  diminishingReturnsThreshold: 3,
  maxBroadeningAttempts: 2,
  highCpcSignalMicros: 3_000_000,
  cacheTtlDays: 30,
};

export interface ResearchLoopResult {
  candidates: Map<string, KeywordCandidate>;
  queryRoundsCompleted: number;
  broadeningAttemptsUsed: number;
  cacheHits: number;
  apiCallsMade: number;
  lowVolumeMode: boolean;
  exhausted: boolean;
  exhaustedSeeds: string[];
  pivotSuggestions: string[];
}

export interface ResearchLoopState {
  candidates: Map<string, KeywordCandidate>;
  querySeeds: string[];
  queriedSeeds: Set<string>;
  queryRoundsCompleted: number;
  broadeningAttemptsUsed: number;
  consecutiveRoundsWithFewNew: number;
  cacheHits: number;
  apiCallsMade: number;
  exhaustedSeeds: string[];
}

export type ResearchEventHandler = (event: ResearchLoopEvent) => void;

export interface ResearchRoundEvent {
  type: 'round';
  round: number;
  newCandidates: number;
  totalCandidates: number;
  seedsQueried: number;
}

export interface ResearchCacheHitEvent {
  type: 'cache-hit';
  keyword: string;
}

export interface ResearchApiCallEvent {
  type: 'api-call';
  keyword: string;
}

export type ResearchLoopEvent = ResearchRoundEvent | ResearchCacheHitEvent | ResearchApiCallEvent;

function addCandidate(candidates: Map<string, KeywordCandidate>, candidate: KeywordCandidate): void {
  if (!candidates.has(candidate.normalised)) {
    candidates.set(candidate.normalised, candidate);
  }
}

function buildCandidateFromCache(
  keyword: string,
  normalised: string,
  cached: CacheSummary[string],
  sourceSeed: string,
): KeywordCandidate {
  return {
    keyword,
    normalised,
    avgMonthlySearches: cached.avgMonthlySearches,
    competition: cached.competition,
    competitionIndex: cached.competitionIndex,
    highTopOfPageBidMicros: cached.highTopOfPageBidMicros,
    fromCache: true,
    sourceSeed,
  };
}

function applyBroadening(
  state: ResearchLoopState,
  params: ResearchLoopParams,
): boolean {
  if (state.broadeningAttemptsUsed >= params.maxBroadeningAttempts) {
    return false;
  }
  state.broadeningAttemptsUsed++;
  const topCandidates = Array.from(state.candidates.values())
    .sort((a, b) => (b.highTopOfPageBidMicros ?? 0) - (a.highTopOfPageBidMicros ?? 0))
    .slice(0, 5);
  const broadSeeds = topCandidates.map((c) => c.keyword);
  state.querySeeds = generateBroadenedSeeds(broadSeeds, state.exhaustedSeeds);
  return state.querySeeds.length > 0;
}

function checkExhaustion(
  state: ResearchLoopState,
  params: ResearchLoopParams,
): { exhausted: boolean; lowVolumeMode: boolean } {
  if (state.querySeeds.length === 0 && state.candidates.size < params.targetCandidates) {
    const highCpcCandidates = Array.from(state.candidates.values()).filter(
      (c) => (c.highTopOfPageBidMicros ?? 0) >= params.highCpcSignalMicros,
    );
    const hasCompetition = Array.from(state.candidates.values()).some(
      (c) => (c.competitionIndex ?? 0) > 20,
    );

    if (highCpcCandidates.length > 0 || hasCompetition) {
      return { exhausted: false, lowVolumeMode: true };
    }

    state.exhaustedSeeds = Array.from(state.queriedSeeds);
    return { exhausted: true, lowVolumeMode: false };
  }
  return { exhausted: false, lowVolumeMode: false };
}

async function processCachedSeed(
  seed: string,
  normalised: string,
  cached: CacheSummary[string],
  state: ResearchLoopState,
  onEvent?: ResearchEventHandler,
): Promise<boolean> {
  if (!cached || cached.stale || (cached.avgMonthlySearches === null && cached.highTopOfPageBidMicros === null)) {
    return false;
  }
  const sourceSeed = state.queriedSeeds.size > 0 ? Array.from(state.queriedSeeds)[0] : seed;
  const candidate = buildCandidateFromCache(seed, normalised, cached, sourceSeed);
  addCandidate(state.candidates, candidate);
  onEvent?.({ type: 'cache-hit', keyword: seed });
  return true;
}

async function processApiSeed(
  gkpClient: CachedGkpClient,
  seed: string,
  countryCodes: string[],
  language: string,
  state: ResearchLoopState,
  onEvent?: ResearchEventHandler,
): Promise<number> {
  let newCandidates = 0;
  try {
    const result = await gkpClient.generateKeywordIdeas({
      seedKeywords: [seed],
      countryCodes,
      language,
    });

    onEvent?.({ type: 'api-call', keyword: seed });

    for (const idea of result.ideas) {
      const ideaNormalised = normalizeKeywordKey(idea.text);
      if (!state.candidates.has(ideaNormalised)) {
        const candidate: KeywordCandidate = {
          keyword: idea.text,
          normalised: ideaNormalised,
          avgMonthlySearches: idea.avgMonthlySearches ?? null,
          competition: idea.competition as 'LOW' | 'MEDIUM' | 'HIGH' | null,
          competitionIndex: idea.competitionIndex ?? null,
          highTopOfPageBidMicros: idea.highTopOfPageBidMicros ?? null,
          fromCache: false,
          sourceSeed: seed,
        };
        addCandidate(state.candidates, candidate);
        newCandidates++;

        if (result.ideas.length >= 10) {
          queueVariants(idea.text, state);
        }
      }
    }
  } catch {
    // Retry logic handled by caller
  }
  return newCandidates;
}

function queueVariants(text: string, state: ResearchLoopState): void {
  const variants = generateLongTailVariants(text, DEFAULT_MODIFIERS);
  for (const variant of variants) {
    if (!state.queriedSeeds.has(variant) && !state.querySeeds.includes(variant)) {
      state.querySeeds.push(variant);
    }
  }
}

export async function runResearchLoop(
  gkpClient: CachedGkpClient,
  seeds: string[],
  countryCodes: string[],
  language: string,
  params: ResearchLoopParams,
  cacheSummary: CacheSummary,
  onEvent?: ResearchEventHandler,
): Promise<ResearchLoopResult> {
  const state: ResearchLoopState = {
    candidates: new Map(),
    querySeeds: [...seeds],
    queriedSeeds: new Set(),
    queryRoundsCompleted: 0,
    broadeningAttemptsUsed: 0,
    consecutiveRoundsWithFewNew: 0,
    cacheHits: 0,
    apiCallsMade: 0,
    exhaustedSeeds: [],
  };

  let lowVolumeMode = false;
  let exhausted = false;
  const pivotSuggestions: string[] = [];

  while (!exhausted && state.queryRoundsCompleted < params.maxQueryRounds) {
    state.queryRoundsCompleted++;

    const seedsToQuery = state.querySeeds.filter((s) => !state.queriedSeeds.has(s));

    if (seedsToQuery.length === 0) {
      break;
    }

    const { newCandidates, cacheHitsThisRound, apiCallsThisRound } = await querySeedsRound(
      gkpClient,
      seedsToQuery,
      countryCodes,
      language,
      state,
      cacheSummary,
      onEvent,
    );

    state.cacheHits += cacheHitsThisRound;
    state.apiCallsMade += apiCallsThisRound;

    onEvent?.({
      type: 'round',
      round: state.queryRoundsCompleted,
      newCandidates,
      totalCandidates: state.candidates.size,
      seedsQueried: seedsToQuery.length,
    });

    state.querySeeds = [];
    for (const seed of seedsToQuery) {
      state.queriedSeeds.add(seed);
    }

    if (state.candidates.size >= params.targetCandidates) {
      break;
    }

    if (newCandidates < params.diminishingReturnsThreshold) {
      state.consecutiveRoundsWithFewNew++;
      if (state.consecutiveRoundsWithFewNew >= 2) {
        applyBroadening(state, params);
      }
    } else {
      state.consecutiveRoundsWithFewNew = 0;
    }

    const status = checkExhaustion(state, params);
    if (status.lowVolumeMode) {
      lowVolumeMode = true;
      break;
    }
    if (status.exhausted) {
      exhausted = true;
    }
  }

  return {
    candidates: state.candidates,
    queryRoundsCompleted: state.queryRoundsCompleted,
    broadeningAttemptsUsed: state.broadeningAttemptsUsed,
    cacheHits: state.cacheHits,
    apiCallsMade: state.apiCallsMade,
    lowVolumeMode,
    exhausted,
    exhaustedSeeds: state.exhaustedSeeds,
    pivotSuggestions,
  };
}

async function querySeedsRound(
  gkpClient: CachedGkpClient,
  seeds: string[],
  countryCodes: string[],
  language: string,
  state: ResearchLoopState,
  cacheSummary: CacheSummary,
  onEvent?: ResearchEventHandler,
): Promise<{ newCandidates: number; cacheHitsThisRound: number; apiCallsThisRound: number }> {
  let newCandidates = 0;
  let cacheHitsThisRound = 0;
  let apiCallsThisRound = 0;

  for (const seed of seeds) {
    const normalised = normalizeKeywordKey(seed);
    const cached = cacheSummary[normalised];

    if (await processCachedSeed(seed, normalised, cached, state, onEvent)) {
      cacheHitsThisRound++;
      newCandidates++;
    } else {
      const added = await processApiSeed(gkpClient, seed, countryCodes, language, state, onEvent);
      apiCallsThisRound++;
      newCandidates += added;
    }
  }

  return { newCandidates, cacheHitsThisRound, apiCallsThisRound };
}

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
