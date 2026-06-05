import { z } from 'zod';

export const planModeValues = ['new-idea', 'expand-series'] as const;
export type PlanMode = (typeof planModeValues)[number];

export const intentTypeValues = ['informational', 'commercial', 'transactional'] as const;
export type IntentType = (typeof intentTypeValues)[number];

export const funnelStageValues = ['top', 'middle', 'bottom'] as const;
export type FunnelStage = (typeof funnelStageValues)[number];

export const keywordScopeValues = ['head', 'long-tail'] as const;
export type KeywordScope = (typeof keywordScopeValues)[number];

export const articleFormatValues = [
  'guide',
  'listicle',
  'comparison',
  'case-study',
  'tutorial',
  'opinion',
] as const;
export type ArticleFormat = (typeof articleFormatValues)[number];

export const articlePriorityValues = ['high', 'medium', 'low'] as const;
export type ArticlePriority = (typeof articlePriorityValues)[number];

export const articleQueueTypeValues = ['new', 'refresh'] as const;
export type ArticleQueueType = (typeof articleQueueTypeValues)[number];

export const seedKeywordSchema = z.object({
  keyword: z.string().min(1),
  rationale: z.string(),
  scope: z.enum(keywordScopeValues),
  estimatedIntent: z.enum(intentTypeValues),
});
export type SeedKeyword = z.infer<typeof seedKeywordSchema>;

export const seedListSchema = z.object({
  seeds: z.array(seedKeywordSchema),
});
export type SeedList = z.infer<typeof seedListSchema>;

export const keywordCandidateSchema = z.object({
  keyword: z.string().min(1),
  normalised: z.string().min(1),
  avgMonthlySearches: z.number().int().min(0).nullable(),
  competition: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable(),
  competitionIndex: z.number().int().min(0).max(100).nullable(),
  highTopOfPageBidMicros: z.number().int().min(0).nullable(),
  fromCache: z.boolean(),
  sourceSeed: z.string(),
  intentScore: z.number().int().min(1).max(5).optional(),
  intentType: z.enum(intentTypeValues).optional(),
  kobScore: z.number().optional(),
  volumeScore: z.number().optional(),
  difficultyScore: z.number().optional(),
});
export type KeywordCandidate = z.infer<typeof keywordCandidateSchema>;

export const intentClassificationSchema = z.object({
  keyword: z.string().min(1),
  intentType: z.enum(intentTypeValues),
  intentScore: z.number().int().min(1).max(5),
  reasoning: z.string(),
});
export type IntentClassification = z.infer<typeof intentClassificationSchema>;

export const intentClassificationsSchema = z.object({
  classifications: z.array(intentClassificationSchema),
});
export type IntentClassifications = z.infer<typeof intentClassificationsSchema>;

export const articlePlanSchema = z.object({
  title: z.string().min(1),
  primaryKeyword: z.string().min(1),
  secondaryKeywords: z.array(z.string().min(1)),
  intentType: z.enum(intentTypeValues),
  funnelStage: z.enum(funnelStageValues),
  contentAngle: z.string(),
  format: z.enum(articleFormatValues),
  isPillar: z.boolean(),
  priority: z.enum(articlePriorityValues),
  confidenceNote: z.string().optional(),
  refreshCandidate: z.string().nullable(),
});
export type ArticlePlan = z.infer<typeof articlePlanSchema>;

export const articlePlansSchema = z.object({
  articles: z.array(articlePlanSchema),
});
export type ArticlePlans = z.infer<typeof articlePlansSchema>;

export const clusterSchema = z.object({
  seriesName: z.string().min(1),
  pillarKeyword: z.string().min(1),
  funnelStage: z.enum(funnelStageValues),
  supportingKeywords: z.array(z.string().min(1)),
  clusterRationale: z.string(),
  coverageGapNote: z.string(),
});
export type Cluster = z.infer<typeof clusterSchema>;

export const clustersSchema = z.object({
  clusters: z.array(clusterSchema),
});
export type Clusters = z.infer<typeof clustersSchema>;

export interface CoverageEntry {
  title: string;
  seriesSlug: string;
  publishedDate: string;
  ageMonths: number;
  keywords: string[];
}

export type CoverageMap = Record<string, CoverageEntry>;

export interface CacheKeywordRecord {
  ageDays: number;
  stale: boolean;
  avgMonthlySearches: number | null;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  highTopOfPageBidMicros: number | null;
  competitionIndex: number | null;
  sourceQueries: string[];
}

export type CacheSummary = Record<string, CacheKeywordRecord>;

export interface ExhaustionRecord {
  seeds: string[];
  exhaustedAt: string;
  pivotSuggestions: string[];
}

export type ExhaustionMap = Record<string, ExhaustionRecord>;

export interface PlannedSeries {
  name: string;
  pillarKeyword: string;
  funnelStage: FunnelStage;
  clusterRationale: string;
  coverageGapNote: string;
  articles: PlannedArticle[];
}

export interface PlannedArticle {
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intentType: IntentType;
  funnelStage: FunnelStage;
  contentAngle: string;
  format: ArticleFormat;
  isPillar: boolean;
  priority: ArticlePriority;
  confidenceNote?: string;
  refreshCandidate: string | null;
  type: ArticleQueueType;
  refreshTarget?: string;
}

export interface ResearchStats {
  queryRoundsCompleted: number;
  candidatesEvaluated: number;
  candidatesPassed: number;
  cacheHits: number;
  apiCallsMade: number;
}

export interface DiscardedCandidate {
  keyword: string;
  kobScore: number;
  reason: string;
}

export interface Plan {
  mode: PlanMode;
  lowVolumeMode: boolean;
  researchStats: ResearchStats;
  series: PlannedSeries[];
  articles: PlannedArticle[];
  publishingTimeline?: string;
  discardedCandidates: DiscardedCandidate[];
}

export interface PlanInputBase {
  mode: PlanMode;
  publicationSlug: string;
  countryCodes: string[];
  language: string;
  contentType: string;
  autoSave: boolean;
  nonInteractive: boolean;
  dryRun: boolean;
  planModel: string;
  intentModel: string;
  seedKeywords: string[];
}

export interface ExplorePlanInput extends PlanInputBase {
  mode: 'new-idea';
  contentIdea: string;
  businessContext?: string;
  desiredSeriesCount?: number;
  desiredArticlesPerSeries?: number;
  excludeSeries: string[];
}

export interface ExpandPlanInput extends PlanInputBase {
  mode: 'expand-series';
  seriesSlug: string;
  desiredArticleCount?: number;
}

export type PlanInput = ExplorePlanInput | ExpandPlanInput;

export type PlanStage =
  | 'hydrate'
  | 'seeds'
  | 'research'
  | 'score'
  | 'cluster'
  | 'plan-articles'
  | 'persist';

export interface PlanStageEvent {
  stage: PlanStage;
  progress?: string;
}

export interface PlanResearchEvent {
  type: 'research-round';
  round: number;
  totalRounds: number;
  candidatesSoFar: number;
  seedsQueried: number;
}

export interface PlanLowVolumeEvent {
  type: 'low-volume';
}

export interface PlanExhaustionEvent {
  type: 'exhaustion';
  pivotSuggestions: string[];
  candidatesFound: number;
}

export type PlanEvent =
  | PlanStageEvent
  | PlanResearchEvent
  | PlanLowVolumeEvent
  | PlanExhaustionEvent;

export interface PlanningSession {
  version: 1;
  runAt: string;
  mode: PlanMode;
  contentIdea?: string;
  seriesSlug?: string;
  targetMarket: {
    countryCodes: string[];
    language: string;
  };
  researchStats: ResearchStats;
  acceptedSeries: string[];
  acceptedArticles: string[];
  discardedCandidates: DiscardedCandidate[];
  exhaustionRecords: ExhaustionRecord[];
  lowVolumeMode: boolean;
}
