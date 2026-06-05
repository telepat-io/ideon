import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { AppSettings } from '../config/schema.js';
import type { Cluster, PlannedArticle, ArticlePlans, CoverageEntry } from '../types/plan.js';
import { articlePlansSchema } from '../types/plan.js';
import { buildArticlePlanningMessages } from '../llm/prompts/articlePlanning.js';

export interface ArticlePlanningParams {
  desiredArticlesPerSeries: number;
}

export async function planArticlesForCluster(
  client: OpenRouterClient,
  settings: AppSettings,
  input: {
    cluster: Cluster;
    desiredArticlesPerSeries: number;
    targetMarket: {
      countryCodes: string[];
      language: string;
    };
    existingArticles: Array<{ title: string; keywords: string[] }>;
    coverageOverlap: CoverageEntry[];
  },
): Promise<PlannedArticle[]> {
  const messages = buildArticlePlanningMessages({
    seriesName: input.cluster.seriesName,
    pillarKeyword: input.cluster.pillarKeyword,
    supportingKeywords: input.cluster.supportingKeywords,
    funnelStage: input.cluster.funnelStage,
    desiredArticlesPerSeries: input.desiredArticlesPerSeries,
    targetMarket: input.targetMarket,
    existingArticles: input.existingArticles,
    coverageOverlap: input.coverageOverlap,
    isPillar: true,
  });

  const result = await client.requestStructured<ArticlePlans>({
    schemaName: 'ArticlePlans',
    schema: articlePlansSchema.shape,
    messages,
    settings,
    parse: articlePlansSchema.parse,
  });

  return result.articles.map((a) => ({
    ...a,
    type: a.refreshCandidate ? 'refresh' : 'new',
    refreshTarget: a.refreshCandidate ?? undefined,
  }));
}

export async function planArticlesForSeries(
  client: OpenRouterClient,
  settings: AppSettings,
  input: {
    seriesName: string;
    pillarKeyword: string;
    supportingKeywords: string[];
    funnelStage: 'top' | 'middle' | 'bottom';
    desiredArticleCount: number;
    targetMarket: {
      countryCodes: string[];
      language: string;
    };
    existingArticles: Array<{ title: string; keywords: string[] }>;
    coverageOverlap: CoverageEntry[];
  },
): Promise<PlannedArticle[]> {
  const messages = buildArticlePlanningMessages({
    seriesName: input.seriesName,
    pillarKeyword: input.pillarKeyword,
    supportingKeywords: input.supportingKeywords,
    funnelStage: input.funnelStage,
    desiredArticlesPerSeries: input.desiredArticleCount,
    targetMarket: input.targetMarket,
    existingArticles: input.existingArticles,
    coverageOverlap: input.coverageOverlap,
    isPillar: false,
  });

  const result = await client.requestStructured<ArticlePlans>({
    schemaName: 'ArticlePlans',
    schema: articlePlansSchema.shape,
    messages,
    settings,
    parse: articlePlansSchema.parse,
  });

  return result.articles.map((a) => ({
    ...a,
    type: a.refreshCandidate ? 'refresh' : 'new',
    refreshTarget: a.refreshCandidate ?? undefined,
  }));
}
