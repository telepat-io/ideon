import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'os';
import envPaths from 'env-paths';
import { listSeries, loadSeries } from '../config/seriesStore.js';
import { listGkpKeywordRecords, normalizeKeywordKey, type GkpKeywordRecord } from '../config/gkpStore.js';
import type { MetaJson } from '../types/meta.js';
import type { CoverageMap, CoverageEntry, CacheSummary, CacheKeywordRecord, ExhaustionMap, ExhaustionRecord } from '../types/plan.js';
import type { Series } from '../types/series.js';

const ideonPaths = envPaths('ideon', { suffix: '' });

export interface HydratedState {
  coverageMap: CoverageMap;
  cacheSummary: CacheSummary;
  exhaustionMap: ExhaustionMap;
  seriesKeywords: Map<string, string[]>;
  seriesMap: Map<string, Series>;
}

export async function hydrateState(options: {
  publicationSlug: string;
  seriesSlug?: string;
  countryCodes: string[];
  language: string;
  cacheTtlDays?: number;
}): Promise<HydratedState> {
  const [allSeries, allArticles, keywordRecords, exhaustionRecords] = await Promise.all([
    listSeries({ publicationSlug: options.publicationSlug }),
    loadArticlesForPublication(options.publicationSlug),
    listGkpKeywordRecords(),
    loadExhaustionRecords(),
  ]);

  const coverageMap = buildCoverageMap(allArticles, allSeries);
  const cacheSummary = buildCacheSummary(keywordRecords, options.cacheTtlDays ?? 30);
  const exhaustionMap = buildExhaustionMap(exhaustionRecords);
  const seriesKeywords = new Map<string, string[]>();
  const seriesMap = new Map<string, Series>();

  for (const s of allSeries) {
    seriesMap.set(s.slug, s);
    seriesKeywords.set(s.slug, s.defaults.keywords ?? []);
  }

  return {
    coverageMap,
    cacheSummary,
    exhaustionMap,
    seriesKeywords,
    seriesMap,
  };
}

interface ArticleForCoverage {
  title: string;
  series?: string;
  generatedAt?: string;
  keywords: string[];
}

async function loadArticlesForPublication(publicationSlug: string): Promise<ArticleForCoverage[]> {
  const ideonHome = process.env.IDEON_HOME || os.homedir();
  const markdownOutputDir = path.join(ideonHome, '.ideon', 'output');

  let dirEntries;
  try {
    dirEntries = await readdir(markdownOutputDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const articles: ArticleForCoverage[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;
    const generationDir = path.join(markdownOutputDir, entry.name);
    const metaJsonPath = path.join(generationDir, 'meta.json');

    try {
      const raw = await readFile(metaJsonPath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === 'object' && parsed !== null && 'publication' in parsed) {
        const meta = parsed as MetaJson;
        if (meta.publication === publicationSlug) {
          articles.push({
            title: meta.title,
            series: meta.series,
            generatedAt: meta.generatedAt,
            keywords: meta.keywords ?? [],
          });
        }
      }
    } catch {
      // Skip directories without valid meta.json
    }
  }

  return articles;
}

function buildCoverageMap(
  articles: ArticleForCoverage[],
  _series: Series[],
): CoverageMap {
  const coverageMap: CoverageMap = {};

  for (const article of articles) {
    const keywords = article.keywords ?? [];
    for (const kw of keywords) {
      const normalised = normalizeKeywordKey(kw);
      const existing = coverageMap[normalised];
      const ageMonths = article.generatedAt
        ? monthsSince(new Date(article.generatedAt))
        : 0;

      if (existing) {
        if (article.generatedAt && new Date(article.generatedAt) > new Date(existing.publishedDate)) {
          existing.publishedDate = article.generatedAt;
          existing.ageMonths = ageMonths;
        }
        if (article.series) {
          existing.seriesSlug = article.series;
        }
      } else {
        coverageMap[normalised] = {
          title: article.title,
          seriesSlug: article.series ?? '',
          publishedDate: article.generatedAt ?? '',
          ageMonths,
          keywords: article.keywords ?? [],
        };
      }
    }
  }

  return coverageMap;
}

function buildCacheSummary(
  records: GkpKeywordRecord[],
  ttlDays: number,
): CacheSummary {
  const summary: CacheSummary = {};
  const now = Date.now();

  for (const record of records) {
    const savedAt = new Date(record.savedAt).getTime();
    const ageDays = Math.floor((now - savedAt) / (1000 * 60 * 60 * 24));
    const stale = ageDays > ttlDays;

    summary[record.normalizedKeyword] = {
      ageDays,
      stale,
      avgMonthlySearches: record.avgMonthlySearches ?? null,
      competition: (record.competition as 'LOW' | 'MEDIUM' | 'HIGH') ?? null,
      highTopOfPageBidMicros: record.highTopOfPageBidMicros ?? null,
      competitionIndex: record.competitionIndex ?? null,
      sourceQueries: record.sourceQueries ?? [],
    };
  }

  return summary;
}

async function loadExhaustionRecords(): Promise<ExhaustionRecord[]> {
  const planningSessionsDir = path.join(ideonPaths.config, 'planning-sessions');
  try {
    const entries = await readdir(planningSessionsDir, { withFileTypes: true });
    const records: ExhaustionRecord[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      try {
        const raw = await readFile(path.join(planningSessionsDir, entry.name), 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.exhaustionRecords && Array.isArray(parsed.exhaustionRecords)) {
          records.push(...parsed.exhaustionRecords);
        }
      } catch {
        // Skip malformed files
      }
    }

    return records;
  } catch {
    return [];
  }
}

function buildExhaustionMap(records: ExhaustionRecord[]): ExhaustionMap {
  const map: ExhaustionMap = {};

  for (const record of records) {
    const fingerprint = record.seeds.slice().sort().join('|');
    map[fingerprint] = record;
  }

  return map;
}

function monthsSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
}

export function splitSeedsByCache(
  seedKeywords: string[],
  cacheSummary: CacheSummary,
): { freshSeeds: string[]; querySeeds: string[] } {
  const freshSeeds: string[] = [];
  const querySeeds: string[] = [];

  for (const seed of seedKeywords) {
    const normalised = normalizeKeywordKey(seed);
    const cached = cacheSummary[normalised];

    if (cached && !cached.stale && (cached.avgMonthlySearches !== null || cached.highTopOfPageBidMicros !== null)) {
      freshSeeds.push(seed);
    } else {
      querySeeds.push(seed);
    }
  }

  return { freshSeeds, querySeeds };
}

export async function loadSeriesKeywords(seriesSlug: string): Promise<string[]> {
  try {
    const series = await loadSeries(seriesSlug);
    return series.defaults.keywords ?? [];
  } catch {
    return [];
  }
}
