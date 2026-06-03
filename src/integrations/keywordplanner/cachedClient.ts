import {
  computeGkpFingerprint,
  isGkpQuerySnapshotFresh,
  loadGkpKeywordRecord,
  loadGkpQuerySnapshot,
  normalizeKeywordKey,
  saveGkpKeywordRecord,
  saveGkpQuerySnapshot,
  type GkpQueryMode,
} from '../../config/gkpStore.js';
import type { GkpClient } from './client.js';
import type {
  GenerateIdeasResponse,
  GetForecastDataResponse,
  GetHistoricalDataResponse,
  KeywordIdea,
  KeywordMetrics,
  GkpGenerateIdeasInput,
  GkpGetHistoricalDataInput,
  GkpGetForecastDataInput,
} from './models.js';

export interface CachedGkpClientOptions {
  client: GkpClient;
  publication?: string;
  series?: string;
}

export interface CachedGkpQueryOptions {
  refresh?: boolean;
}

export class CachedGkpClient {
  private readonly client: GkpClient;
  private readonly publication?: string;
  private readonly series?: string;

  constructor(options: CachedGkpClientOptions) {
    this.client = options.client;
    this.publication = options.publication;
    this.series = options.series;
  }

  private async cached<T>(
    fingerprint: string,
    mode: GkpQueryMode,
    fetcher: () => Promise<T>,
    extra: Record<string, unknown>,
  ): Promise<T> {
    const snapshot = await loadGkpQuerySnapshot(fingerprint);
    if (snapshot && isGkpQuerySnapshotFresh(snapshot)) {
      return snapshot.response as T;
    }

    const result = await fetcher();

    await saveGkpQuerySnapshot({
      fingerprint,
      mode,
      ttlDays: 30,
      publication: this.publication,
      series: this.series,
      ...extra,
      savedAt: new Date().toISOString(),
      response: result,
    });

    return result;
  }

  private async saveKeywordMetrics(
    keywords: Array<KeywordIdea | KeywordMetrics>,
    fingerprint: string,
    countryCodes?: string[],
    language?: string,
  ): Promise<void> {
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeKeywordKey(keyword.text);
      const existing = await loadGkpKeywordRecord(normalizedKeyword);
      const sourceQueries = Array.from(new Set([...(existing?.sourceQueries ?? []), fingerprint]));

      await saveGkpKeywordRecord({
        normalizedKeyword,
        keyword: keyword.text,
        savedAt: new Date().toISOString(),
        publication: this.publication,
        series: this.series,
        countryCodes,
        language,
        avgMonthlySearches: keyword.avgMonthlySearches,
        competition: keyword.competition,
        lowTopOfPageBidMicros: keyword.lowTopOfPageBidMicros,
        highTopOfPageBidMicros: keyword.highTopOfPageBidMicros,
        competitionIndex: keyword.competitionIndex,
        sourceQueries,
      });
    }
  }

  async generateKeywordIdeas(
    input: GkpGenerateIdeasInput,
    options?: CachedGkpQueryOptions,
  ): Promise<GenerateIdeasResponse> {
    if (options?.refresh) {
      const result = await this.client.generateKeywordIdeas(input);
      const fingerprint = computeGkpFingerprint({ mode: 'ideas', ...input });
      await saveGkpQuerySnapshot({
        fingerprint,
        mode: 'ideas',
        ttlDays: 30,
        publication: this.publication,
        series: this.series,
        keywords: input.seedKeywords,
        url: input.url,
        site: input.site,
        countryCodes: input.countryCodes,
        language: input.language,
        pageSize: input.pageSize,
        count: result.count,
        savedAt: new Date().toISOString(),
        response: result,
      });
      await this.saveKeywordMetrics(result.ideas, fingerprint, input.countryCodes, input.language);
      return result;
    }

    const fingerprint = computeGkpFingerprint({ mode: 'ideas', ...input });

    const result = await this.cached<GenerateIdeasResponse>(
      fingerprint,
      'ideas',
      () => this.client.generateKeywordIdeas(input),
      {
        keywords: input.seedKeywords,
        url: input.url,
        site: input.site,
        countryCodes: input.countryCodes,
        language: input.language,
        pageSize: input.pageSize,
      },
    );

    await this.saveKeywordMetrics(result.ideas, fingerprint, input.countryCodes, input.language);
    return result;
  }

  async getHistoricalMetrics(
    input: GkpGetHistoricalDataInput,
    options?: CachedGkpQueryOptions,
  ): Promise<GetHistoricalDataResponse> {
    if (options?.refresh) {
      const result = await this.client.getHistoricalMetrics(input);
      const fingerprint = computeGkpFingerprint({ mode: 'historical', ...input });
      await saveGkpQuerySnapshot({
        fingerprint,
        mode: 'historical',
        ttlDays: 30,
        publication: this.publication,
        series: this.series,
        keywords: input.keywords,
        countryCodes: input.countryCodes,
        language: input.language,
        includeCpc: input.includeAverageCpc,
        count: result.count,
        savedAt: new Date().toISOString(),
        response: result,
      });
      await this.saveKeywordMetrics(result.keywords, fingerprint, input.countryCodes, input.language);
      return result;
    }

    const fingerprint = computeGkpFingerprint({ mode: 'historical', ...input });

    const result = await this.cached<GetHistoricalDataResponse>(
      fingerprint,
      'historical',
      () => this.client.getHistoricalMetrics(input),
      {
        keywords: input.keywords,
        countryCodes: input.countryCodes,
        language: input.language,
        includeCpc: input.includeAverageCpc,
      },
    );

    await this.saveKeywordMetrics(result.keywords, fingerprint, input.countryCodes, input.language);
    return result;
  }

  async getForecastData(
    input: GkpGetForecastDataInput,
    options?: CachedGkpQueryOptions,
  ): Promise<GetForecastDataResponse> {
    if (options?.refresh) {
      const result = await this.client.getForecastData(input);
      const fingerprint = computeGkpFingerprint({ mode: 'forecast', ...input });
      await saveGkpQuerySnapshot({
        fingerprint,
        mode: 'forecast',
        ttlDays: 30,
        publication: this.publication,
        series: this.series,
        keywords: input.keywords,
        countryCodes: input.countryCodes,
        language: input.language,
        matchType: input.keywordMatchType,
        maxCpcBid: input.maxCpcBidMicros,
        startDate: input.startDate,
        endDate: input.endDate,
        savedAt: new Date().toISOString(),
        response: result,
      });
      return result;
    }

    const fingerprint = computeGkpFingerprint({ mode: 'forecast', ...input });

    return this.cached<GetForecastDataResponse>(
      fingerprint,
      'forecast',
      () => this.client.getForecastData(input),
      {
        keywords: input.keywords,
        countryCodes: input.countryCodes,
        language: input.language,
        matchType: input.keywordMatchType,
        maxCpcBid: input.maxCpcBidMicros,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    );
  }
}
