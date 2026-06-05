import React from 'react';
import { render } from 'ink';
import { ReportedError } from './reportedError.js';
import type { PlanExploreOptions, PlanExpandOptions } from './commands/plan.js';
import type { ExplorePlanInput, ExpandPlanInput } from '../types/plan.js';

interface ResolvedPlanExploreInput {
  input: ExplorePlanInput;
  canceled: boolean;
}

interface ResolvedPlanExpandInput {
  input: ExpandPlanInput;
  canceled: boolean;
}

export async function resolvePlanExploreInput(
  ideaArg: string | undefined,
  options: PlanExploreOptions,
): Promise<ResolvedPlanExploreInput> {
  const isInteractive = !options.nonInteractive && process.stdout.isTTY && process.stdin.isTTY;

  if (!options.publication) {
    if (!isInteractive) {
      throw new ReportedError('Missing required --publication for non-interactive plan explore.');
    }
  }

  if (!ideaArg && !isInteractive) {
    throw new ReportedError('Missing required [idea] argument for non-interactive plan explore.');
  }

  if (isInteractive && (!ideaArg || !options.publication)) {
    const result = await promptForPlanExploreInput({
      initialIdea: ideaArg ?? '',
      initialPublication: options.publication ?? '',
      initialContext: options.context ?? '',
      initialCountry: options.country ?? '',
      initialLanguage: options.language ?? '',
      initialSeriesCount: options.seriesCount?.toString() ?? '3',
      initialArticlesPerSeries: options.articlesPerSeries?.toString() ?? '5',
      initialSeedKeywords: options.seedKeywords ?? '',
      initialExcludeSeries: options.excludeSeries ?? '',
      initialContentType: options.contentType ?? 'article',
    });

    if (result.canceled) {
      return { input: {} as ExplorePlanInput, canceled: true };
    }

    return { input: result.input, canceled: false };
  }

  const { normalizeCountryCodes, normalizeLanguage } = await import('../config/marketLocale.js');
  const { loadPublication } = await import('../config/publicationStore.js');
  const { loadSavedSettings } = await import('../config/settingsFile.js');
  const { loadSecrets } = await import('../config/secretStore.js');

  const [savedSettings, secrets, publication] = await Promise.all([
    loadSavedSettings(),
    loadSecrets(),
    options.publication ? loadPublication(options.publication) : null,
  ]);

  const parseCommaSeparated = (value: string | undefined): string[] =>
    value ? value.split(',').map((k) => k.trim()).filter(Boolean) : [];

  const pubDefaults = publication?.defaults ?? {};
  const rawCountryCodes = options.country
    ? normalizeCountryCodes(parseCommaSeparated(options.country))
    : pubDefaults.countryCodes;
  const countryCodes: string[] = rawCountryCodes ?? ['US'];
  const rawLanguage = options.language
    ? normalizeLanguage(options.language)
    : pubDefaults.language;
  const language: string = rawLanguage ?? 'en';

  const planModel = options.model ?? savedSettings.planModel ?? 'deepseek/deepseek-v4-pro';
  const intentModel = options.intentModel ?? savedSettings.planIntentModel ?? 'deepseek/deepseek-v4-flash';

  const input: ExplorePlanInput = {
    mode: 'new-idea',
    contentIdea: ideaArg ?? '',
    publicationSlug: options.publication ?? '',
    businessContext: options.context,
    countryCodes,
    language,
    desiredSeriesCount: options.seriesCount,
    desiredArticlesPerSeries: options.articlesPerSeries,
    seedKeywords: parseCommaSeparated(options.seedKeywords),
    excludeSeries: parseCommaSeparated(options.excludeSeries),
    contentType: options.contentType ?? 'article',
    autoSave: options.autoSave ?? false,
    nonInteractive: options.nonInteractive ?? false,
    dryRun: options.dryRun ?? false,
    planModel,
    intentModel,
  };

  return { input, canceled: false };
}

export async function resolvePlanExpandInput(
  seriesSlugArg: string | undefined,
  options: PlanExpandOptions,
): Promise<ResolvedPlanExpandInput> {
  const isInteractive = !options.nonInteractive && process.stdout.isTTY && process.stdin.isTTY;

  if (!options.publication) {
    if (!isInteractive) {
      throw new ReportedError('Missing required --publication for non-interactive plan expand.');
    }
  }

  if (!seriesSlugArg && !isInteractive) {
    throw new ReportedError('Missing required [series-slug] argument for non-interactive plan expand.');
  }

  if (isInteractive && (!seriesSlugArg || !options.publication)) {
    const result = await promptForPlanExpandInput({
      initialSeriesSlug: seriesSlugArg ?? '',
      initialPublication: options.publication ?? '',
      initialCountry: options.country ?? '',
      initialLanguage: options.language ?? '',
      initialArticleCount: options.articleCount?.toString() ?? '5',
      initialSeedKeywords: options.seedKeywords ?? '',
      initialContentType: options.contentType ?? 'article',
    });

    if (result.canceled) {
      return { input: {} as ExpandPlanInput, canceled: true };
    }

    return { input: result.input, canceled: false };
  }

  const { normalizeCountryCodes, normalizeLanguage } = await import('../config/marketLocale.js');
  const { loadPublication } = await import('../config/publicationStore.js');
  const { loadSavedSettings } = await import('../config/settingsFile.js');
  const { loadSecrets } = await import('../config/secretStore.js');

  const [savedSettings, secrets, publication] = await Promise.all([
    loadSavedSettings(),
    loadSecrets(),
    options.publication ? loadPublication(options.publication) : null,
  ]);

  const parseCommaSeparated = (value: string | undefined): string[] =>
    value ? value.split(',').map((k) => k.trim()).filter(Boolean) : [];

  const pubDefaults = publication?.defaults ?? {};
  const rawCountryCodes = options.country
    ? normalizeCountryCodes(parseCommaSeparated(options.country))
    : pubDefaults.countryCodes;
  const countryCodes: string[] = rawCountryCodes ?? ['US'];
  const rawLanguage = options.language
    ? normalizeLanguage(options.language)
    : pubDefaults.language;
  const language: string = rawLanguage ?? 'en';

  const planModel = options.model ?? savedSettings.planModel ?? 'deepseek/deepseek-v4-pro';
  const intentModel = options.intentModel ?? savedSettings.planIntentModel ?? 'deepseek/deepseek-v4-flash';

  const input: ExpandPlanInput = {
    mode: 'expand-series',
    seriesSlug: seriesSlugArg ?? '',
    publicationSlug: options.publication ?? '',
    countryCodes,
    language,
    desiredArticleCount: options.articleCount,
    seedKeywords: parseCommaSeparated(options.seedKeywords),
    contentType: options.contentType ?? 'article',
    autoSave: options.autoSave ?? false,
    nonInteractive: options.nonInteractive ?? false,
    dryRun: options.dryRun ?? false,
    planModel,
    intentModel,
  };

  return { input, canceled: false };
}

async function promptForPlanExploreInput(params: {
  initialIdea: string;
  initialPublication: string;
  initialContext: string;
  initialCountry: string;
  initialLanguage: string;
  initialSeriesCount: string;
  initialArticlesPerSeries: string;
  initialSeedKeywords: string;
  initialExcludeSeries: string;
  initialContentType: string;
}): Promise<{ input: ExplorePlanInput; canceled: boolean }> {
  const { PlanInputFlow } = await import('./flows/planInputFlow.js');
  const { loadSavedSettings } = await import('../config/settingsFile.js');
  const { loadSecrets } = await import('../config/secretStore.js');

  const [savedSettings, secrets] = await Promise.all([
    loadSavedSettings(),
    loadSecrets(),
  ]);

  let flowResult: ReturnType<typeof buildExploreInput> | null = null;

  const React = (await import('react')).default;
  const app = render(
    React.createElement(PlanInputFlow, {
      mode: 'explore',
      initialPublication: params.initialPublication || undefined,
      onDone: (result) => {
        if (result && 'contentIdea' in result) {
          flowResult = buildExploreInput(result, savedSettings);
        }
      },
    }),
  );

  await app.waitUntilExit();
  process.stdout.write('\n');

  if (!flowResult) {
    return { input: {} as ExplorePlanInput, canceled: true };
  }

  return { input: flowResult, canceled: false };
}

async function promptForPlanExpandInput(params: {
  initialSeriesSlug: string;
  initialPublication: string;
  initialCountry: string;
  initialLanguage: string;
  initialArticleCount: string;
  initialSeedKeywords: string;
  initialContentType: string;
}): Promise<{ input: ExpandPlanInput; canceled: boolean }> {
  const { PlanInputFlow } = await import('./flows/planInputFlow.js');
  const { loadSavedSettings } = await import('../config/settingsFile.js');
  const { loadSecrets } = await import('../config/secretStore.js');

  const [savedSettings, secrets] = await Promise.all([
    loadSavedSettings(),
    loadSecrets(),
  ]);

  let flowResult: ReturnType<typeof buildExpandInput> | null = null;

  const React = (await import('react')).default;
  const app = render(
    React.createElement(PlanInputFlow, {
      mode: 'expand',
      initialPublication: params.initialPublication || undefined,
      initialSeries: params.initialSeriesSlug || undefined,
      onDone: (result) => {
        if (result && 'seriesSlug' in result) {
          flowResult = buildExpandInput(result, savedSettings);
        }
      },
    }),
  );

  await app.waitUntilExit();
  process.stdout.write('\n');

  if (!flowResult) {
    return { input: {} as ExpandPlanInput, canceled: true };
  }

  return { input: flowResult, canceled: false };
}

function buildExploreInput(
  result: {
    contentIdea: string;
    publication: string;
    businessContext: string;
    countryCodes: string;
    language: string;
    seriesCount: string;
    articlesPerSeries: string;
    seedKeywords: string;
    excludeSeries: string;
    contentType: string;
  },
  savedSettings: Record<string, unknown>,
): ExplorePlanInput {
  const { normalizeCountryCodes, normalizeLanguage } = require('../config/marketLocale.js');

  const parseCommaSeparated = (value: string): string[] =>
    value ? value.split(',').map((k) => k.trim()).filter(Boolean) : [];

  const rawCountryCodes = result.countryCodes
    ? normalizeCountryCodes(parseCommaSeparated(result.countryCodes))
    : ['US'];
  const rawLanguage = result.language
    ? normalizeLanguage(result.language)
    : 'en';

  return {
    mode: 'new-idea',
    contentIdea: result.contentIdea,
    publicationSlug: result.publication,
    businessContext: result.businessContext || undefined,
    countryCodes: rawCountryCodes,
    language: rawLanguage,
    desiredSeriesCount: Number.parseInt(result.seriesCount, 10) || undefined,
    desiredArticlesPerSeries: Number.parseInt(result.articlesPerSeries, 10) || undefined,
    seedKeywords: parseCommaSeparated(result.seedKeywords),
    excludeSeries: parseCommaSeparated(result.excludeSeries),
    contentType: result.contentType,
    autoSave: false,
    nonInteractive: false,
    dryRun: false,
    planModel: (savedSettings as Record<string, string>).planModel ?? 'deepseek/deepseek-v4-pro',
    intentModel: (savedSettings as Record<string, string>).planIntentModel ?? 'deepseek/deepseek-v4-flash',
  };
}

function buildExpandInput(
  result: {
    seriesSlug: string;
    publication: string;
    countryCodes: string;
    language: string;
    articleCount: string;
    seedKeywords: string;
    contentType: string;
  },
  savedSettings: Record<string, unknown>,
): ExpandPlanInput {
  const { normalizeCountryCodes, normalizeLanguage } = require('../config/marketLocale.js');

  const parseCommaSeparated = (value: string): string[] =>
    value ? value.split(',').map((k) => k.trim()).filter(Boolean) : [];

  const rawCountryCodes = result.countryCodes
    ? normalizeCountryCodes(parseCommaSeparated(result.countryCodes))
    : ['US'];
  const rawLanguage = result.language
    ? normalizeLanguage(result.language)
    : 'en';

  return {
    mode: 'expand-series',
    seriesSlug: result.seriesSlug,
    publicationSlug: result.publication,
    countryCodes: rawCountryCodes,
    language: rawLanguage,
    desiredArticleCount: Number.parseInt(result.articleCount, 10) || undefined,
    seedKeywords: parseCommaSeparated(result.seedKeywords),
    contentType: result.contentType,
    autoSave: false,
    nonInteractive: false,
    dryRun: false,
    planModel: (savedSettings as Record<string, string>).planModel ?? 'deepseek/deepseek-v4-pro',
    intentModel: (savedSettings as Record<string, string>).planIntentModel ?? 'deepseek/deepseek-v4-flash',
  };
}
