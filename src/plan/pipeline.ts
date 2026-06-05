import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { AppSettings } from '../config/schema.js';
import type { GkpClient } from '../integrations/keywordplanner/client.js';
import type {
  Plan,
  PlanInput,
  ExplorePlanInput,
  ExpandPlanInput,
  PlanStage,
  PlanEvent,
  KeywordCandidate,
  PlannedSeries,
  PlannedArticle,
  ResearchStats,
  DiscardedCandidate,
  CoverageEntry,
} from '../types/plan.js';
import { CachedGkpClient } from '../integrations/keywordplanner/cachedClient.js';
import { hydrateState, splitSeedsByCache, loadSeriesKeywords } from './state.js';
import { generateSeeds, mergeSeeds, deduplicateSeeds } from './seeds.js';
import { runResearchLoop, DEFAULT_RESEARCH_PARAMS, type ResearchLoopEvent } from './research.js';
import { computeKobScore, classifyIntent, scoreAndFilter, DEFAULT_SCORING_PARAMS } from './scoring.js';
import { formClusters } from './clustering.js';
import { planArticlesForCluster, planArticlesForSeries } from './articles.js';
import { persistPlan } from './persistence.js';

export type PlanEventHandler = (event: PlanEvent) => void;

export interface RunPlanOptions {
  input: PlanInput;
  llmClient: OpenRouterClient;
  gkpClient: GkpClient;
  appSettings: AppSettings;
  onEvent?: PlanEventHandler;
  onResearchEvent?: (event: ResearchLoopEvent) => void;
}

export async function runPlan(options: RunPlanOptions): Promise<Plan> {
  const { input, llmClient, gkpClient, appSettings, onEvent, onResearchEvent } = options;

  onEvent?.({ stage: 'hydrate' });

  const cachedGkp = new CachedGkpClient({
    client: gkpClient,
    publication: input.publicationSlug,
  });

  const state = await hydrateState({
    publicationSlug: input.publicationSlug,
    seriesSlug: input.mode === 'expand-series' ? (input as ExpandPlanInput).seriesSlug : undefined,
    countryCodes: input.countryCodes,
    language: input.language,
  });

  let allSeeds: string[] = [];
  const coverageMapKeys = Object.keys(state.coverageMap);
  const cacheSummaryKeys = Object.keys(state.cacheSummary);

  if (input.mode === 'expand-series') {
    const expandInput = input as ExpandPlanInput;
    const seriesKeywords = await loadSeriesKeywords(expandInput.seriesSlug);
    allSeeds = [...seriesKeywords, ...input.seedKeywords];
  } else {
    onEvent?.({ stage: 'seeds' });

    const exploreInput = input as ExplorePlanInput;
    const exhaustionRecords = Object.values(state.exhaustionMap);

    const llmSeeds = await generateSeeds(llmClient, appSettings, {
      contentIdea: exploreInput.contentIdea,
      businessContext: exploreInput.businessContext,
      countryCodes: input.countryCodes,
      language: input.language,
      coverageMapKeys,
      cacheSummaryKeys,
      exhaustionRecords,
      seedKeywords: input.seedKeywords,
    });

    const { freshSeeds, querySeeds } = splitSeedsByCache(
      [...input.seedKeywords, ...llmSeeds.map((s) => s.keyword)],
      state.cacheSummary,
    );

    allSeeds = mergeSeeds(llmSeeds, input.seedKeywords, freshSeeds);
    allSeeds = deduplicateSeeds(allSeeds);
  }

  onEvent?.({ stage: 'research' });

  const researchResult = await runResearchLoop(
    cachedGkp,
    allSeeds,
    input.countryCodes,
    input.language,
    DEFAULT_RESEARCH_PARAMS,
    state.cacheSummary,
    onResearchEvent,
  );

  if (researchResult.exhausted && researchResult.candidates.size === 0) {
    return {
      mode: input.mode,
      lowVolumeMode: false,
      researchStats: {
        queryRoundsCompleted: researchResult.queryRoundsCompleted,
        candidatesEvaluated: 0,
        candidatesPassed: 0,
        cacheHits: researchResult.cacheHits,
        apiCallsMade: researchResult.apiCallsMade,
      },
      series: [],
      articles: [],
      discardedCandidates: [],
    };
  }

  onEvent?.({ stage: 'score' });

  const candidatesArray = Array.from(researchResult.candidates.values());

  await classifyIntent(llmClient, { ...appSettings, model: input.intentModel }, candidatesArray);

  for (const candidate of candidatesArray) {
    computeKobScore(candidate);
  }

  const scoringParams = {
    ...DEFAULT_SCORING_PARAMS,
    lowVolumeMode: researchResult.lowVolumeMode,
  };

  const { shortlist, discarded } = scoreAndFilter(candidatesArray, scoringParams);

  let plannedSeries: PlannedSeries[] = [];
  let plannedArticles: PlannedArticle[] = [];

  if (input.mode === 'new-idea') {
    onEvent?.({ stage: 'cluster' });

    const exploreInput = input as ExplorePlanInput;
    const clusters = await formClusters(llmClient, appSettings, {
      shortlist,
      coverageMapKeys,
      excludeSeries: exploreInput.excludeSeries,
      desiredSeriesCount: exploreInput.desiredSeriesCount ?? 3,
      countryCodes: input.countryCodes,
      language: input.language,
    });

    onEvent?.({ stage: 'plan-articles' });

    for (const cluster of clusters) {
      const coverageOverlap = shortlist
        .filter((c) => cluster.supportingKeywords.includes(c.keyword))
        .map((c) => state.coverageMap[c.normalised])
        .filter((e): e is CoverageEntry => e !== undefined);

      const existingArticles = Object.values(state.coverageMap)
        .filter((e) => e.seriesSlug === cluster.seriesName)
        .map((e) => ({ title: e.title, keywords: [] }));

      const articles = await planArticlesForCluster(llmClient, appSettings, {
        cluster,
        desiredArticlesPerSeries: exploreInput.desiredArticlesPerSeries ?? 5,
        targetMarket: { countryCodes: input.countryCodes, language: input.language },
        existingArticles,
        coverageOverlap,
      });

      plannedSeries.push({
        name: cluster.seriesName,
        pillarKeyword: cluster.pillarKeyword,
        funnelStage: cluster.funnelStage,
        clusterRationale: cluster.clusterRationale,
        coverageGapNote: cluster.coverageGapNote,
        articles,
      });
    }

    plannedArticles = plannedSeries.flatMap((s) => s.articles);
  } else {
    onEvent?.({ stage: 'plan-articles' });

    const expandInput = input as ExpandPlanInput;
    const series = state.seriesMap.get(expandInput.seriesSlug);

    if (series) {
      const seriesKeywords = series.defaults.keywords ?? [];
      const coverageOverlap = shortlist
        .filter((c) => seriesKeywords.includes(c.keyword))
        .map((c) => state.coverageMap[c.normalised])
        .filter((e): e is CoverageEntry => e !== undefined);

      const existingArticles = Object.values(state.coverageMap)
        .filter((e) => e.seriesSlug === expandInput.seriesSlug)
        .map((e) => ({ title: e.title, keywords: [] }));

      plannedArticles = await planArticlesForSeries(llmClient, appSettings, {
        seriesName: series.name,
        pillarKeyword: seriesKeywords[0] ?? '',
        supportingKeywords: seriesKeywords,
        funnelStage: 'middle',
        desiredArticleCount: expandInput.desiredArticleCount ?? 5,
        targetMarket: { countryCodes: input.countryCodes, language: input.language },
        existingArticles,
        coverageOverlap,
      });

      plannedSeries = [{
        name: series.name,
        pillarKeyword: seriesKeywords[0] ?? '',
        funnelStage: 'middle',
        clusterRationale: series.topic ?? '',
        coverageGapNote: '',
        articles: plannedArticles,
      }];
    }
  }

  const discardedCandidates: DiscardedCandidate[] = discarded.map((d) => ({
    keyword: d.keyword,
    kobScore: d.kobScore,
    reason: d.reason,
  }));

  const researchStats: ResearchStats = {
    queryRoundsCompleted: researchResult.queryRoundsCompleted,
    candidatesEvaluated: researchResult.candidates.size,
    candidatesPassed: shortlist.length,
    cacheHits: researchResult.cacheHits,
    apiCallsMade: researchResult.apiCallsMade,
  };

  onEvent?.({ stage: 'persist' });

  await persistPlan({
    mode: input.mode,
    contentIdea: input.mode === 'new-idea' ? (input as ExplorePlanInput).contentIdea : undefined,
    seriesSlug: input.mode === 'expand-series' ? (input as ExpandPlanInput).seriesSlug : undefined,
    publicationSlug: input.publicationSlug,
    targetMarket: { countryCodes: input.countryCodes, language: input.language },
    researchStats,
    lowVolumeMode: researchResult.lowVolumeMode,
    acceptedSeries: plannedSeries,
    acceptedArticles: plannedArticles,
    discardedCandidates,
    exhaustionRecords: [],
    contentType: input.contentType,
  });

  return {
    mode: input.mode,
    lowVolumeMode: researchResult.lowVolumeMode,
    researchStats,
    series: plannedSeries,
    articles: plannedArticles,
    discardedCandidates,
  };
}