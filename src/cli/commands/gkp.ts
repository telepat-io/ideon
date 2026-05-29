import { ReportedError } from '../reportedError.js';
import { readEnvSettings } from '../../config/env.js';
import { loadSecrets } from '../../config/secretStore.js';
import { GkpClient, type GkpClientOptions } from '../../integrations/keywordplanner/client.js';
import {
  type KeywordIdea,
  type KeywordMetrics,
  type KeywordForecastMetrics,
  type GenerateIdeasResponse,
  type GetHistoricalDataResponse,
  type GetForecastDataResponse,
} from '../../integrations/keywordplanner/models.js';

export interface GkpCommandDependencies {
  log: (message: string) => void;
  readEnvSettings: typeof readEnvSettings;
  loadSecrets: typeof loadSecrets;
  GkpClientFactory: (options: GkpClientOptions) => GkpClient;
}

function createDefaultDependencies(): GkpCommandDependencies {
  return {
    log: (message: string) => console.log(message),
    readEnvSettings,
    loadSecrets,
    GkpClientFactory: (options) => new GkpClient(options),
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
  if (result.keywords.length === 0) {
    return 'No forecast data found.';
  }

  const header = 'Keyword'.padEnd(32) + 'Match'.padStart(8) + 'Impr.'.padStart(10) + 'Clicks'.padStart(10) + 'Cost'.padStart(12) + 'CTR'.padStart(8);
  const divider = '─'.repeat(header.length);

  const rows = result.keywords.map((kw) => {
    const text = kw.text.length > 30 ? kw.text.slice(0, 27) + '...' : kw.text;
    return (
      text.padEnd(32) +
      kw.matchType.padStart(8) +
      kw.impressions.toLocaleString().padStart(10) +
      kw.clicks.toLocaleString().padStart(10) +
      microsToDollars(kw.costMicros).padStart(12) +
      `${(kw.ctr * 100).toFixed(1)}%`.padStart(8)
    );
  });

  return ['', 'Forecast', divider, header, divider, ...rows, divider, `Total: ${result.count} keyword${result.count === 1 ? '' : 's'}`, ''].join('\n');
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

  try {
    const result = await client.generateKeywordIdeas({
      seedKeywords: seedKeywords || undefined,
      url,
      site,
      countryCodes,
      language: options.language,
      pageSize: options.pageSize,
    });

    if (options.json) {
      deps.log(JSON.stringify(result, null, 2));
    } else {
      deps.log(formatIdeasTTY(result));
    }
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

  try {
    const result = await client.getHistoricalMetrics({
      keywords,
      countryCodes,
      language: options.language,
      includeAverageCpc: options.includeCpc,
    });

    if (options.json) {
      deps.log(JSON.stringify(result, null, 2));
    } else {
      deps.log(formatHistoricalTTY(result));
    }
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

  try {
    const result = await client.getForecastData({
      keywords,
      keywordMatchType: options.matchType,
      maxCpcBidMicros: options.maxCpcBid,
      countryCodes,
      language: options.language,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    if (options.json) {
      deps.log(JSON.stringify(result, null, 2));
    } else {
      deps.log(formatForecastTTY(result));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new ReportedError(`Failed to get forecast data:\n${message}`);
  }
}
