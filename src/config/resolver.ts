import { readFile } from 'node:fs/promises';
import { readEnvSettings } from './env.js';
import { loadSavedSettings } from './settingsFile.js';
import { loadSecrets } from './secretStore.js';
import { loadAuthor } from './authorStore.js';
import { loadPublication } from './publicationStore.js';
import { loadSeries } from './seriesStore.js';
import {
  appSettingsSchema,
  contentIntentValues,
  contentTargetRoleValues,
  contentTypeValues,
  jobInputSchema,
  writingStyleValues,
  type JobInput,
  type ResolvedConfig,
  type TargetLength,
} from './schema.js';
import { normalizeCountryCodes, normalizeLanguage } from './marketLocale.js';
import type { Author } from '../types/author.js';
import type { Publication } from '../types/publication.js';
import type { Series } from '../types/series.js';

export interface ContentTargetInput {
  contentType: (typeof contentTypeValues)[number] | string;
  role: (typeof contentTargetRoleValues)[number] | string;
  count: number;
}

export interface ResolveConfigInput {
  idea?: string;
  audience?: string;
  jobPath?: string;
  publication?: string;
  series?: string;
  author?: string;
  experienceNotes?: string;
  style?: (typeof writingStyleValues)[number] | string;
  intent?: (typeof contentIntentValues)[number] | string;
  contentTargets?: ContentTargetInput[];
  targetLength?: TargetLength | string;
  countryCodes?: string[];
  language?: string;
  keywords?: string[];
}

export interface ResolvedRunInput {
  config: ResolvedConfig;
  idea: string;
  targetAudienceHint?: string;
  job: JobInput | null;
  publication: Publication | null;
  series: Series | null;
  author: Author | null;
  experienceNotes?: string;
  countryCodes?: string[];
  language?: string;
  keywords?: string[];
}

export async function resolveRunInput(input: ResolveConfigInput): Promise<ResolvedRunInput> {
  const envSettings = readEnvSettings();
  const [savedSettings, secrets] = await Promise.all([
    loadSavedSettings(),
    loadSecrets({ disableKeytar: envSettings.disableKeytar }),
  ]);
  const job = input.jobPath ? await loadJobInput(input.jobPath) : null;

  assertNoLegacyXMode(savedSettings.contentTargets, 'saved settings contentTargets');
  assertNoLegacyXMode(job?.settings?.contentTargets, 'job settings contentTargets');
  assertNoLegacyXMode(input.contentTargets, 'CLI contentTargets');
  assertExactlyOnePrimary(input.contentTargets, 'CLI contentTargets');

  const seriesSlug = input.series ?? job?.series;
  const series = seriesSlug ? await loadSeries(seriesSlug) : null;

  // If series has a publication reference and user didn't explicitly pass --publication, use it
  const publicationSlug = input.publication ?? series?.publication ?? job?.publication ?? savedSettings.defaultPublication;
  const publication = publicationSlug ? await loadPublication(publicationSlug) : null;
  const pubDefaults = publication?.defaults ?? {};
  const seriesDefaults = series?.defaults ?? {};

  // Track whether a value was explicitly provided by env or higher precedence,
  // so series defaults can fill in when publication didn't.
  const hasStyleOverride = !!input.style || !!envSettings.style;
  const hasIntentOverride = !!input.intent || !!envSettings.intent;
  const hasLengthOverride = !!input.targetLength || !!envSettings.targetLength;
  const hasContentTargetsOverride = !!input.contentTargets;
  const hasModelOverride = !!envSettings.model;
  const hasModelSettingsOverride = envSettings.temperature !== undefined || envSettings.maxTokens !== undefined || envSettings.topP !== undefined;

  const mergedSettings = appSettingsSchema.parse({
    ...savedSettings,
    ...(job?.settings ?? {}),
    ...(envSettings.model ? { model: envSettings.model } : {}),
    ...(envSettings.modelRequestTimeoutMs !== undefined
      ? { modelRequestTimeoutMs: envSettings.modelRequestTimeoutMs }
      : {}),
    ...(envSettings.modelRequestMaxAttempts !== undefined
      ? { modelRequestMaxAttempts: envSettings.modelRequestMaxAttempts }
      : {}),
    ...(envSettings.notificationsEnabled !== undefined
      ? {
          notifications: {
            ...savedSettings.notifications,
            ...(job?.settings?.notifications ?? {}),
            enabled: envSettings.notificationsEnabled,
          },
        }
      : {}),
    ...(envSettings.temperature !== undefined || envSettings.maxTokens !== undefined || envSettings.topP !== undefined
      ? {
          modelSettings: {
            ...savedSettings.modelSettings,
            ...(job?.settings?.modelSettings ?? {}),
            ...(envSettings.temperature !== undefined ? { temperature: envSettings.temperature } : {}),
            ...(envSettings.maxTokens !== undefined ? { maxTokens: envSettings.maxTokens } : {}),
            ...(envSettings.topP !== undefined ? { topP: envSettings.topP } : {}),
          },
        }
      : {}),
    ...(envSettings.style ? { style: envSettings.style } : {}),
    ...(envSettings.intent ? { intent: envSettings.intent } : {}),
    ...(envSettings.targetLength ? { targetLength: envSettings.targetLength } : {}),
    // Publication defaults (applied when no higher-precedence override exists)
    ...(pubDefaults.style && !hasStyleOverride ? { style: pubDefaults.style } : {}),
    ...(pubDefaults.intent && !hasIntentOverride ? { intent: pubDefaults.intent } : {}),
    ...(pubDefaults.targetLength && !hasLengthOverride ? { targetLength: pubDefaults.targetLength } : {}),
    ...(pubDefaults.contentTargets && !hasContentTargetsOverride ? { contentTargets: pubDefaults.contentTargets } : {}),
    ...(pubDefaults.model && !hasModelOverride ? { model: pubDefaults.model } : {}),
    ...((pubDefaults.temperature !== undefined || pubDefaults.maxTokens !== undefined || pubDefaults.topP !== undefined)
      && !hasModelSettingsOverride
      ? {
          modelSettings: {
            ...savedSettings.modelSettings,
            ...(job?.settings?.modelSettings ?? {}),
            ...(pubDefaults.temperature !== undefined ? { temperature: pubDefaults.temperature } : {}),
            ...(pubDefaults.maxTokens !== undefined ? { maxTokens: pubDefaults.maxTokens } : {}),
            ...(pubDefaults.topP !== undefined ? { topP: pubDefaults.topP } : {}),
          },
        }
      : {}),
    // Series defaults (override publication, applied after publication, before CLI flags)
    ...(seriesDefaults.style && !hasStyleOverride ? { style: seriesDefaults.style } : {}),
    ...(seriesDefaults.intent && !hasIntentOverride ? { intent: seriesDefaults.intent } : {}),
    ...(seriesDefaults.targetLength && !hasLengthOverride ? { targetLength: seriesDefaults.targetLength } : {}),
    ...(seriesDefaults.contentTargets && !hasContentTargetsOverride ? { contentTargets: seriesDefaults.contentTargets } : {}),
    ...(seriesDefaults.model && !hasModelOverride ? { model: seriesDefaults.model } : {}),
    ...((seriesDefaults.temperature !== undefined || seriesDefaults.maxTokens !== undefined || seriesDefaults.topP !== undefined)
      && !hasModelSettingsOverride
      ? {
          modelSettings: {
            ...savedSettings.modelSettings,
            ...(job?.settings?.modelSettings ?? {}),
            ...(pubDefaults.temperature !== undefined ? { temperature: pubDefaults.temperature } : {}),
            ...(pubDefaults.maxTokens !== undefined ? { maxTokens: pubDefaults.maxTokens } : {}),
            ...(pubDefaults.topP !== undefined ? { topP: pubDefaults.topP } : {}),
            ...(seriesDefaults.temperature !== undefined ? { temperature: seriesDefaults.temperature } : {}),
            ...(seriesDefaults.maxTokens !== undefined ? { maxTokens: seriesDefaults.maxTokens } : {}),
            ...(seriesDefaults.topP !== undefined ? { topP: seriesDefaults.topP } : {}),
          },
        }
      : {}),
    // CLI flags (highest precedence)
    ...(input.style ? { style: input.style } : {}),
    ...(input.intent ? { intent: input.intent } : {}),
    ...(input.targetLength ? { targetLength: input.targetLength } : {}),
    ...(input.contentTargets ? { contentTargets: input.contentTargets } : {}),
  });

  const idea = input.idea ?? job?.idea ?? job?.prompt;
  if (!idea) {
    throw new Error('No idea provided. Pass an argument to `ideon write` or use --job with an idea in the JSON file.');
  }

  const targetAudienceHint = normalizeOptionalText(input.audience)
    ?? normalizeOptionalText(seriesDefaults.targetAudienceHint)
    ?? normalizeOptionalText(pubDefaults.targetAudienceHint)
    ?? normalizeOptionalText(job?.targetAudience);

  const mergedKeywords = mergeKeywords(
    seriesDefaults.keywords,
    job?.keywords,
    input.keywords,
  );

  const mergedCountryCodes = normalizeCountryCodes(input.countryCodes)
    ?? normalizeCountryCodes(job?.countryCodes)
    ?? normalizeCountryCodes(seriesDefaults.countryCodes)
    ?? normalizeCountryCodes(pubDefaults.countryCodes);

  const mergedLanguage = normalizeLanguage(input.language)
    ?? normalizeLanguage(job?.language)
    ?? normalizeLanguage(seriesDefaults.language)
    ?? normalizeLanguage(pubDefaults.language);

  const authorSlug = normalizeOptionalText(input.author)
    ?? normalizeOptionalText(job?.author)
    ?? normalizeOptionalText(seriesDefaults.defaultAuthor)
    ?? normalizeOptionalText(pubDefaults.defaultAuthor);

  const author = authorSlug ? await loadAuthor(authorSlug) : null;

  const mergedExperienceNotes = mergeExperienceNotes(
    seriesDefaults.experienceNotes,
    job?.experienceNotes,
    input.experienceNotes,
  );

  return {
    config: {
      settings: mergedSettings,
      secrets: {
        openRouterApiKey: envSettings.openRouterApiKey ?? secrets.openRouterApiKey,
        replicateApiToken: envSettings.replicateApiToken ?? secrets.replicateApiToken,
        googleAdsDeveloperToken: envSettings.googleAdsDeveloperToken ?? secrets.googleAdsDeveloperToken,
        googleAdsClientId: envSettings.googleAdsClientId ?? secrets.googleAdsClientId,
        googleAdsClientSecret: envSettings.googleAdsClientSecret ?? secrets.googleAdsClientSecret,
        googleAdsRefreshToken: envSettings.googleAdsRefreshToken ?? secrets.googleAdsRefreshToken,
        googleAdsCustomerId: envSettings.googleAdsCustomerId ?? secrets.googleAdsCustomerId,
        googleAdsLoginCustomerId: envSettings.googleAdsLoginCustomerId ?? secrets.googleAdsLoginCustomerId,
      },
    },
    idea,
    targetAudienceHint,
    job,
    publication,
    series,
    author,
    experienceNotes: mergedExperienceNotes,
    countryCodes: mergedCountryCodes,
    language: mergedLanguage,
    keywords: mergedKeywords,
  };
}

function mergeExperienceNotes(
  ...sources: Array<string | undefined>
): string | undefined {
  const parts = sources
    .map((source) => source?.trim())
    .filter((source): source is string => Boolean(source && source.length > 0));

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function assertExactlyOnePrimary(contentTargets: ContentTargetInput[] | undefined, sourceLabel: string): void {
  if (!contentTargets || contentTargets.length === 0) {
    return;
  }

  const primaryCount = contentTargets.filter((target) => target.role === 'primary').length;
  if (primaryCount !== 1) {
    throw new Error(`${sourceLabel} must include exactly one primary target.`);
  }
}

async function loadJobInput(jobPath: string): Promise<JobInput> {
  const raw = await readFile(jobPath, 'utf8');
  const parsed = JSON.parse(raw) as {
    settings?: {
      contentTargets?: Array<{ contentType?: unknown; count?: unknown; xMode?: unknown }>;
    };
  };

  assertNoLegacyXMode(parsed.settings?.contentTargets, 'job settings contentTargets');
  return jobInputSchema.parse(parsed);
}

function assertNoLegacyXMode(
  contentTargets: Array<{ contentType?: unknown; count?: unknown; xMode?: unknown }> | undefined,
  sourceLabel: string,
): void {
  if (!contentTargets) {
    return;
  }

  const hasLegacyXMode = contentTargets.some((target) => typeof target.xMode === 'string' && target.xMode.length > 0);
  if (!hasLegacyXMode) {
    return;
  }

  throw new Error(
    `Unsupported legacy xMode in ${sourceLabel}. Split X outputs into explicit types by using \"x-post\" for single posts and \"x-thread\" for threaded posts.`,
  );
}

function mergeKeywords(
  ...sources: Array<string[] | undefined>
): string[] | undefined {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const source of sources) {
    if (!source) continue;
    for (const kw of source) {
      const normalized = kw.trim().toLowerCase();
      if (normalized.length > 0 && !seen.has(normalized)) {
        seen.add(normalized);
        merged.push(kw.trim());
      }
    }
  }

  return merged.length > 0 ? merged : undefined;
}