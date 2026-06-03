import { ReportedError } from '../reportedError.js';
import { readEnvSettings } from '../../config/env.js';
import { loadSecrets } from '../../config/secretStore.js';
import {
  isGkpQuerySnapshotFresh,
  listGkpQuerySnapshots,
  type GkpQuerySnapshot,
} from '../../config/gkpStore.js';
import { GkpClient, type GkpClientOptions } from '../../integrations/keywordplanner/client.js';
import { CachedGkpClient } from '../../integrations/keywordplanner/cachedClient.js';
import {
  type GenerateIdeasResponse,
  type GetHistoricalDataResponse,
  type GetForecastDataResponse,
} from '../../integrations/keywordplanner/models.js';

export interface GkpCommandDependencies {
  log: (message: string) => void;
  readEnvSettings: typeof readEnvSettings;
  loadSecrets: typeof loadSecrets;
  GkpClientFactory: (options: GkpClientOptions) => GkpClient;
  isGkpQuerySnapshotFresh: typeof isGkpQuerySnapshotFresh;
  listGkpQuerySnapshots: typeof listGkpQuerySnapshots;
}

function createDefaultDependencies(): GkpCommandDependencies {
  return {
    log: (message: string) => console.log(message),
    readEnvSettings,
    loadSecrets,
    GkpClientFactory: (options) => new GkpClient(options),
    isGkpQuerySnapshotFresh,
    listGkpQuerySnapshots,
  };
}

function parseCommaSeparated(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value.split(',').map((s) => s.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

async function createClient(deps: GkpCommandDependencies): Promise<GkpClient> {
  const envSettings = deps.readEnvSettings();
  const secrets = await deps.loadSecrets({ disableKeytar: envSettings.disableKeytar });

  const devToken = envSettings.googleAdsDeveloperToken ?? secrets.googleAdsDeveloperToken;
  const clientId = envSettings.googleAdsClientId ?? secrets.googleAdsClientId;
  const clientSecret = envSettings.googleAdsClientSecret ?? secrets.googleAdsClientSecret;
  const refreshToken = envSettings.googleAdsRefreshToken ?? secrets.googleAdsRefreshToken;
  const customerId = envSettings.googleAdsCustomerId ?? secrets.googleAdsCustomerId;
  const loginCustomerId = envSettings.googleAdsLoginCustomerId ?? secrets.googleAdsLoginCustomerId;

  const missing: string[] = [];
  if (!devToken) missing.push('googleAdsDeveloperToken');
  if (!clientId) missing.push('googleAdsClientId');
  if (!clientSecret) missing.push('googleAdsClientSecret');
  if (!refreshToken) missing.push('googleAdsRefreshToken');
  if (!customerId) missing.push('googleAdsCustomerId');

  if (missing.length > 0) {
    const setCommands = missing.map((k) => `ideon config set ${k} <value>`).join('\n  ');
    throw new ReportedError(
      `Missing required Google Ads credentials:\n  ${missing.join(', ')}\n\nSet them via:\n  ${setCommands}\n\nOr run \`ideon gads login\` for guided setup.`,
    );
  }

  return deps.GkpClientFactory({
    developerToken: devToken!,
    clientId: clientId!,
    clientSecret: clientSecret!,
    refreshToken: refreshToken!,
    customerId: customerId!,
    loginCustomerId: loginCustomerId || undefined,
  });
}

function microsToDollars(micros: number): string {
  const dollars = micros / 1_000_000;
  return `$${dollars.toFixed(2)}`;
}

function truncate(value: string, width: number): string {
  if (value.length <= width) {
    return value;
  }
  return `${value.slice(0, Math.max(0, width - 3))}...`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) {
    return isoDate;
  }
  return date.toISOString().slice(0, 10);
}

function buildQueryLabel(snapshot: Pick<GkpQuerySnapshot, 'keywords' | 'url' | 'site'>): string {
  if (snapshot.keywords && snapshot.keywords.length > 0) {
    return snapshot.keywords.join(', ');
  }
  if (snapshot.url) {
    return snapshot.url;
  }
  if (snapshot.site) {
    return snapshot.site;
  }
  return '-';
}

function emitResult<T>(deps: GkpCommandDependencies, options: { json?: boolean }, result: T, formatter: (result: T) => string): void {
  if (options.json) {
    deps.log(JSON.stringify(result, null, 2));
    return;
  }

  deps.log(formatter(result));
}

function formatIdeasTTY(result: GenerateIdeasResponse): string {
  if (result.ideas.length === 0) {
    return 'No keyword ideas found.';
  }

  const header = 'Keyword'.padEnd(40) + 'Searches'.padStart(14) + 'Competition'.padStart(14) + 'Low Bid'.padStart(12) + 'High Bid'.padStart(12);
  const divider = '─'.repeat(header.length);

  const rows = result.ideas.map((idea) => {
    const text = idea.text.length > 38 ? idea.text.slice(0, 35) + '...' : idea.text;
    return (
      text.padEnd(40) +
      idea.avgMonthlySearches.toLocaleString().padStart(14) +
      idea.competition.padStart(14) +
      microsToDollars(idea.lowTopOfPageBidMicros).padStart(12) +
      microsToDollars(idea.highTopOfPageBidMicros).padStart(12)
    );
  });

  return ['', 'Keyword Ideas', divider, header, divider, ...rows, divider, `Total: ${result.count} keyword${result.count === 1 ? '' : 's'}`, ''].join('\n');
}

function formatHistoricalTTY(result: GetHistoricalDataResponse): string {
  if (result.keywords.length === 0) {
    return 'No historical data found.';
  }

  const header = 'Keyword'.padEnd(40) + 'Avg Monthly'.padStart(14) + 'Competition'.padStart(14) + 'Low Bid'.padStart(12) + 'High Bid'.padStart(12);
  const divider = '─'.repeat(header.length);

  const rows = result.keywords.map((kw) => {
    const text = kw.text.length > 38 ? kw.text.slice(0, 35) + '...' : kw.text;
    return (
      text.padEnd(40) +
      kw.avgMonthlySearches.toLocaleString().padStart(14) +
      kw.competition.padStart(14) +
      microsToDollars(kw.lowTopOfPageBidMicros).padStart(12) +
      microsToDollars(kw.highTopOfPageBidMicros).padStart(12)
    );
  });

  return ['', 'Historical Metrics', divider, header, divider, ...rows, divider, `Total: ${result.count} keyword${result.count === 1 ? '' : 's'}`, ''].join('\n');
}

function formatForecastTTY(result: GetForecastDataResponse): string {
  const m = result.campaignForecastMetrics;
  const divider = '─'.repeat(50);

  return [
    '',
    'Campaign Forecast',
    divider,
    `  Clicks:        ${m.clicks.toFixed(1)}`,
    `  Cost:          ${microsToDollars(m.costMicros)}`,
    `  Avg CPC:       ${microsToDollars(m.averageCpcMicros)}`,
    `  Conversions:   ${m.conversions.toFixed(1)}`,
    `  Avg CPA:       ${microsToDollars(m.averageCpaMicros)}`,
    divider,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Ideas command
// ---------------------------------------------------------------------------

export interface GkpIdeasOptions {
  keywords?: string;
  url?: string;
  site?: string;
  country?: string;
  language?: string;
  pageSize?: number;
  publication?: string;
  series?: string;
  refresh?: boolean;
  json?: boolean;
}

export async function runGkpIdeasCommand(
  options: GkpIdeasOptions,
  dependencies: Partial<GkpCommandDependencies> = {},
): Promise<void> {
  const deps = { ...createDefaultDependencies(), ...dependencies };

  const seedKeywords = parseCommaSeparated(options.keywords);
  const url = options.url || undefined;
  const site = options.site || undefined;
  const countryCodes = parseCommaSeparated(options.country);

  if (!seedKeywords && !url) {
    throw new ReportedError('At least one of --keywords or --url is required.');
  }

  const client = await createClient(deps);
  const cachedClient = new CachedGkpClient({
    client,
    publication: options.publication,
    series: options.series,
  });

  try {
    const result = await cachedClient.generateKeywordIdeas({
      seedKeywords: seedKeywords || undefined,
      url,
      site,
      countryCodes,
      language: options.language,
      pageSize: options.pageSize,
    }, { refresh: options.refresh });

    emitResult(deps, options, result, formatIdeasTTY);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new ReportedError(`Failed to generate keyword ideas:\n${message}`);
  }
}

// ---------------------------------------------------------------------------
// Historical command
// ---------------------------------------------------------------------------

export interface GkpHistoricalOptions {
  keywords?: string;
  country?: string;
  language?: string;
  includeCpc?: boolean;
  publication?: string;
  series?: string;
  refresh?: boolean;
  json?: boolean;
}

export async function runGkpHistoricalCommand(
  options: GkpHistoricalOptions,
  dependencies: Partial<GkpCommandDependencies> = {},
): Promise<void> {
  const deps = { ...createDefaultDependencies(), ...dependencies };

  const keywords = parseCommaSeparated(options.keywords);
  if (!keywords || keywords.length === 0) {
    throw new ReportedError('--keywords is required.');
  }

  const countryCodes = parseCommaSeparated(options.country);
  const client = await createClient(deps);
  const cachedClient = new CachedGkpClient({
    client,
    publication: options.publication,
    series: options.series,
  });

  try {
    const result = await cachedClient.getHistoricalMetrics({
      keywords,
      countryCodes,
      language: options.language,
      includeAverageCpc: options.includeCpc,
    }, { refresh: options.refresh });

    emitResult(deps, options, result, formatHistoricalTTY);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new ReportedError(`Failed to get historical data:\n${message}`);
  }
}

// ---------------------------------------------------------------------------
// Forecast command
// ---------------------------------------------------------------------------

export interface GkpForecastOptions {
  keywords?: string;
  matchType?: string;
  maxCpcBid?: number;
  country?: string;
  language?: string;
  startDate?: string;
  endDate?: string;
  publication?: string;
  series?: string;
  refresh?: boolean;
  json?: boolean;
}

export async function runGkpForecastCommand(
  options: GkpForecastOptions,
  dependencies: Partial<GkpCommandDependencies> = {},
): Promise<void> {
  const deps = { ...createDefaultDependencies(), ...dependencies };

  const keywords = parseCommaSeparated(options.keywords);
  if (!keywords || keywords.length === 0) {
    throw new ReportedError('--keywords is required.');
  }

  const countryCodes = parseCommaSeparated(options.country);
  const client = await createClient(deps);
  const cachedClient = new CachedGkpClient({
    client,
    publication: options.publication,
    series: options.series,
  });

  try {
    const result = await cachedClient.getForecastData({
      keywords,
      keywordMatchType: options.matchType,
      maxCpcBidMicros: options.maxCpcBid,
      countryCodes,
      language: options.language,
      startDate: options.startDate,
      endDate: options.endDate,
    }, { refresh: options.refresh });

    emitResult(deps, options, result, formatForecastTTY);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new ReportedError(`Failed to get forecast data:\n${message}`);
  }
}

export interface GkpListOptions {
  publication?: string;
  series?: string;
  search?: string;
  fresh?: boolean;
  stale?: boolean;
  json: boolean;
  verbose: boolean;
}

export async function runGkpListCommand(
  options: GkpListOptions,
  dependencies: Partial<GkpCommandDependencies> = {},
): Promise<void> {
  const deps = { ...createDefaultDependencies(), ...dependencies };

  if (options.fresh && options.stale) {
    throw new ReportedError('Choose only one of --fresh or --stale.');
  }

  const snapshots = await deps.listGkpQuerySnapshots({
    publication: options.publication,
    series: options.series,
    search: options.search,
    freshOnly: options.fresh,
    staleOnly: options.stale,
  });

  const output = snapshots.map((snapshot) => ({
    fingerprint: snapshot.fingerprint,
    mode: snapshot.mode,
    query: buildQueryLabel(snapshot),
    publication: snapshot.publication,
    series: snapshot.series,
    count: snapshot.count,
    savedAt: snapshot.savedAt,
    ttlDays: snapshot.ttlDays,
    fresh: deps.isGkpQuerySnapshotFresh(snapshot),
    countryCodes: snapshot.countryCodes,
    language: snapshot.language,
    matchType: snapshot.matchType,
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
  }));

  if (options.json) {
    deps.log(JSON.stringify(output, null, 2));
    return;
  }

  if (output.length === 0) {
    deps.log('No cached GKP queries found. Run `ideon gkp ideas`, `historical`, or `forecast` first.');
    return;
  }

  if (options.verbose) {
    for (const entry of output) {
      deps.log(`\n  ${entry.fingerprint}`);
      deps.log(`    Mode: ${entry.mode}`);
      deps.log(`    Query: ${entry.query}`);
      deps.log(`    Fresh: ${entry.fresh ? 'yes' : 'no'}`);
      deps.log(`    Count: ${entry.count}`);
      deps.log(`    Saved: ${entry.savedAt}`);
      if (entry.publication) deps.log(`    Publication: ${entry.publication}`);
      if (entry.series) deps.log(`    Series: ${entry.series}`);
      if (entry.language) deps.log(`    Language: ${entry.language}`);
      if (entry.countryCodes && entry.countryCodes.length > 0) deps.log(`    Countries: ${entry.countryCodes.join(', ')}`);
      if (entry.matchType) deps.log(`    Match Type: ${entry.matchType}`);
      if (entry.startDate || entry.endDate) deps.log(`    Window: ${entry.startDate ?? '-'} -> ${entry.endDate ?? '-'}`);
    }
    return;
  }

  const modeWidth = Math.max(8, ...output.map((entry) => entry.mode.length));
  const queryWidth = Math.max(10, ...output.map((entry) => truncate(entry.query, 36).length));
  const publicationWidth = Math.max(11, ...output.map((entry) => (entry.publication ?? '-').length));
  const seriesWidth = Math.max(6, ...output.map((entry) => (entry.series ?? '-').length));

  deps.log(
    '  '
    + 'Mode'.padEnd(modeWidth) + '  '
    + 'Query'.padEnd(queryWidth) + '  '
    + 'Publication'.padEnd(publicationWidth) + '  '
    + 'Series'.padEnd(seriesWidth) + '  '
    + 'Count'.padStart(5) + '  '
    + 'Fresh'.padEnd(5) + '  '
    + 'Saved',
  );

  deps.log('  ' + '-'.repeat(modeWidth + queryWidth + publicationWidth + seriesWidth + 28));

  for (const entry of output) {
    deps.log(
      '  '
      + entry.mode.padEnd(modeWidth) + '  '
      + truncate(entry.query, 36).padEnd(queryWidth) + '  '
      + (entry.publication ?? '-').padEnd(publicationWidth) + '  '
      + (entry.series ?? '-').padEnd(seriesWidth) + '  '
      + String(entry.count).padStart(5) + '  '
      + (entry.fresh ? 'yes' : 'no').padEnd(5) + '  '
      + formatDate(entry.savedAt),
    );
  }
}
