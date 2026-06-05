import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';
import type { QueueEntry } from '../types/queue.js';
import type { Series } from '../types/series.js';
import type { PlannedSeries, PlannedArticle, ResearchStats, PlanMode, DiscardedCandidate, ExhaustionRecord, ArticleQueueType, ArticleFormat } from '../types/plan.js';
import { saveSeries } from '../config/seriesStore.js';
import { saveQueueEntry, generateQueueId } from '../config/queueStore.js';
import { defaultAppSettings, contentIntentValues, contentTypeValues } from '../config/schema.js';

const ideonPaths = envPaths('ideon', { suffix: '' });
const planningSessionsDir = path.join(ideonPaths.config, 'planning-sessions');

const FORMAT_TO_INTENT: Record<ArticleFormat, typeof contentIntentValues[number]> = {
  guide: 'how-to-guide',
  listicle: 'listicle',
  comparison: 'deep-dive-analysis',
  'case-study': 'case-study',
  tutorial: 'tutorial',
  opinion: 'opinion-piece',
};

export interface PersistenceInput {
  mode: PlanMode;
  contentIdea?: string;
  seriesSlug?: string;
  publicationSlug: string;
  targetMarket: {
    countryCodes: string[];
    language: string;
  };
  researchStats: ResearchStats;
  lowVolumeMode: boolean;
  acceptedSeries: PlannedSeries[];
  acceptedArticles: PlannedArticle[];
  discardedCandidates: DiscardedCandidate[];
  exhaustionRecords: ExhaustionRecord[];
  contentType: string;
}

export async function createSeriesFromCluster(
  cluster: PlannedSeries,
  publicationSlug: string,
): Promise<Series> {
  const slug = cluster.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const series: Series = {
    name: cluster.name,
    slug,
    topic: `${cluster.clusterRationale} | Gap: ${cluster.coverageGapNote}`,
    publication: publicationSlug,
    editorialPolicy: {
      tone: '',
      forbiddenTopics: [],
      disclosureRequirements: [],
      audienceRestrictions: [],
      notes: '',
    },
    defaults: {
      keywords: [cluster.pillarKeyword, ...cluster.articles.map((a) => a.primaryKeyword)],
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
    },
  };

  await saveSeries(series);
  return series;
}

export function buildQueueEntry(
  article: PlannedArticle,
  series: Series,
  publicationSlug: string,
  contentType: string,
): QueueEntry {
  const idea = `Write a ${article.format} about ${article.primaryKeyword}. Angle: ${article.contentAngle}. Target: ${article.funnelStage} funnel.`;

  return {
    id: generateQueueId(),
    status: 'pending',
    idea,
    settings: {
      ...defaultAppSettings,
      style: 'professional',
      intent: FORMAT_TO_INTENT[article.format],
      contentTargets: [{ contentType: contentType as typeof contentTypeValues[number], role: 'primary', count: 1 }],
    },
    job: null,
    publication: null,
    series,
    addedAt: new Date().toISOString(),
    type: article.type as ArticleQueueType,
    refreshTarget: article.refreshTarget,
  };
}

export async function persistPlan(input: PersistenceInput): Promise<void> {
  const createdSeries: Series[] = [];

  for (const cluster of input.acceptedSeries) {
    const series = await createSeriesFromCluster(cluster, input.publicationSlug);
    createdSeries.push(series);
  }

  for (const article of input.acceptedArticles) {
    let seriesSlug = '';
    for (const cluster of input.acceptedSeries) {
      const matchingArticle = cluster.articles.find((a) => a.title === article.title);
      if (matchingArticle) {
        const series = createdSeries.find((s) => s.name === cluster.name);
        if (series) {
          seriesSlug = series.slug;
          break;
        }
      }
    }

    const seriesForArticle = createdSeries.find((s) => s.slug === seriesSlug);
    if (!seriesForArticle) continue;

    const entry = buildQueueEntry(article, seriesForArticle, input.publicationSlug, input.contentType);
    await saveQueueEntry(entry);
  }

  await writePlanningSession(input);
}

async function writePlanningSession(input: PersistenceInput): Promise<void> {
  await mkdir(planningSessionsDir, { recursive: true });

  const slug = (input.contentIdea ?? input.seriesSlug ?? 'plan')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${slug}.json`;
  const filePath = path.join(planningSessionsDir, filename);

  const session = {
    version: 1 as const,
    runAt: new Date().toISOString(),
    mode: input.mode,
    contentIdea: input.contentIdea,
    seriesSlug: input.seriesSlug,
    targetMarket: input.targetMarket,
    researchStats: input.researchStats,
    acceptedSeries: input.acceptedSeries.map((s) => s.name),
    acceptedArticles: input.acceptedArticles.map((a) => a.title),
    discardedCandidates: input.discardedCandidates,
    exhaustionRecords: input.exhaustionRecords,
    lowVolumeMode: input.lowVolumeMode,
  };

  await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}
