import type { Command } from 'commander';
import { GkpClient } from '../../integrations/keywordplanner/client.js';
import { OpenRouterClient } from '../../llm/openRouterClient.js';
import { loadSavedSettings } from '../../config/settingsFile.js';
import { loadSecrets } from '../../config/secretStore.js';
import { normalizeCountryCodes, normalizeLanguage } from '../../config/marketLocale.js';
import { loadPublication } from '../../config/publicationStore.js';
import { runPlan, type PlanEventHandler } from '../../plan/pipeline.js';
import { formatPlanOutput, formatNoResultsOutput } from '../../plan/output.js';
import type { ExplorePlanInput, ExpandPlanInput, PlanEvent, Plan } from '../../types/plan.js';
import { resolvePlanExploreInput, resolvePlanExpandInput } from '../planInputResolver.js';
import { showPlanReview } from '../planReviewFlow.js';

export interface PlanExploreOptions {
  idea?: string;
  publication?: string;
  context?: string;
  country?: string;
  language?: string;
  seriesCount?: number;
  articlesPerSeries?: number;
  seedKeywords?: string;
  excludeSeries?: string;
  contentType?: string;
  model?: string;
  intentModel?: string;
  autoSave?: boolean;
  nonInteractive?: boolean;
  dryRun?: boolean;
}

export interface PlanExpandOptions {
  seriesSlug?: string;
  publication?: string;
  country?: string;
  language?: string;
  articleCount?: number;
  seedKeywords?: string;
  contentType?: string;
  model?: string;
  intentModel?: string;
  autoSave?: boolean;
  nonInteractive?: boolean;
  dryRun?: boolean;
}

export function registerPlanCommands(program: Command): void {
  const planCommand = program
    .command('plan')
    .description('Plan content series and articles using keyword research.');

  planCommand
    .command('explore')
    .description('Research a new content idea and generate series and article plans.')
    .argument('[idea]', 'Content idea to research')
    .option('-p, --publication <slug>', 'Publication slug (required)')
    .option('--context <text>', 'Business context or ICP description')
    .option('--country <codes>', 'Comma-separated ISO country codes (overrides publication default)')
    .option('--language <code>', 'ISO 639-1 language code (overrides publication default)')
    .option('--series-count <n>', 'Target number of series (default: 2-4)', (v) => Number.parseInt(v, 10))
    .option('--articles-per-series <n>', 'Target articles per series (default: 4-8)', (v) => Number.parseInt(v, 10))
    .option('--seed-keywords <keywords>', 'Comma-separated seed keywords to always include')
    .option('--exclude-series <slugs>', 'Comma-separated series slugs to avoid duplicating')
    .option('--content-type <type>', 'Content type for queue entries (default: article)', 'article')
    .option('--model <model>', 'Model for strong reasoning calls')
    .option('--intent-model <model>', 'Model for intent classification')
    .option('--auto-save', 'Skip approval gates and save automatically', false)
    .option('--non-interactive', 'Agent mode: plain text output to stdout', false)
    .option('--dry-run', 'Run research but skip all writes', false)
    .action(async (ideaArg: string | undefined, options: PlanExploreOptions) => {
      await runPlanExplore({ idea: ideaArg, ...options });
    });

  planCommand
    .command('expand')
    .description('Expand an existing series with new article ideas.')
    .argument('[series-slug]', 'Series slug to expand')
    .option('-p, --publication <slug>', 'Publication slug (required)')
    .option('--country <codes>', 'Comma-separated ISO country codes (overrides publication default)')
    .option('--language <code>', 'ISO 639-1 language code (overrides publication default)')
    .option('--article-count <n>', 'Target new articles to plan (default: 4-6)', (v) => Number.parseInt(v, 10))
    .option('--seed-keywords <keywords>', 'Comma-separated additional seed keywords')
    .option('--content-type <type>', 'Content type for queue entries (default: article)', 'article')
    .option('--model <model>', 'Model for strong reasoning calls')
    .option('--intent-model <model>', 'Model for intent classification')
    .option('--auto-save', 'Skip approval gates and save automatically', false)
    .option('--non-interactive', 'Agent mode: plain text output to stdout', false)
    .option('--dry-run', 'Run research but skip all writes', false)
    .action(async (seriesSlugArg: string | undefined, options: PlanExpandOptions) => {
      await runPlanExpand({ seriesSlug: seriesSlugArg, ...options });
    });
}

function parseCommaSeparated(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value.split(',').map((k) => k.trim()).filter(Boolean);
}

async function resolvePlanSettings(options: {
  publication?: string;
  country?: string;
  language?: string;
  model?: string;
  intentModel?: string;
}) {
  const [savedSettings] = await Promise.all([
    loadSavedSettings(),
    loadSecrets(),
  ]);

  const publication = options.publication
    ? await loadPublication(options.publication)
    : null;

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

  return {
    planModel,
    intentModel,
    countryCodes,
    language,
    publication,
  };
}

async function runPlanExplore(options: PlanExploreOptions): Promise<void> {
  const resolved = await resolvePlanExploreInput(options.idea, options);

  if (resolved.canceled) {
    console.log('Plan explore canceled.');
    return;
  }

  const input = resolved.input;

  const plan = await executePlan(input);

  if (!plan || (plan.articles.length === 0 && plan.series.length === 0)) {
    return;
  }

  if (!input.autoSave && !input.nonInteractive) {
    const approved = await showPlanReview(plan, input.publicationSlug);
    if (!approved) {
      console.log('Plan review: not saved.');
      return;
    }
  }
}

async function runPlanExpand(options: PlanExpandOptions): Promise<void> {
  const resolved = await resolvePlanExpandInput(options.seriesSlug, options);

  if (resolved.canceled) {
    console.log('Plan expand canceled.');
    return;
  }

  const input = resolved.input;

  const plan = await executePlan(input);

  if (!plan || (plan.articles.length === 0 && plan.series.length === 0)) {
    return;
  }

  if (!input.autoSave && !input.nonInteractive) {
    const approved = await showPlanReview(plan, input.publicationSlug);
    if (!approved) {
      console.log('Plan review: not saved.');
      return;
    }
  }
}

async function executePlan(input: ExplorePlanInput | ExpandPlanInput): Promise<Plan> {
  const [savedSettings, secrets] = await Promise.all([
    loadSavedSettings(),
    loadSecrets(),
  ]);

  if (!secrets.openRouterApiKey) {
    console.error('Error: OpenRouter API key not configured. Set it via: ideon config set openRouterApiKey <key>');
    process.exit(1);
  }

  if (!secrets.googleAdsDeveloperToken) {
    console.error('Error: Google Ads developer token not configured. Run: ideon gads login');
    process.exit(1);
  }

  const llmClient = new OpenRouterClient(secrets.openRouterApiKey);
  const gkpClient = new GkpClient({
    developerToken: secrets.googleAdsDeveloperToken,
    clientId: secrets.googleAdsClientId || '',
    clientSecret: secrets.googleAdsClientSecret || '',
    refreshToken: secrets.googleAdsRefreshToken || '',
    customerId: secrets.googleAdsCustomerId || '',
    loginCustomerId: secrets.googleAdsLoginCustomerId ?? undefined,
  });

  const appSettings = {
    ...savedSettings,
    model: input.planModel,
  };

  let lastPlan: Plan | null = null;

  const onEvent: PlanEventHandler = (event: PlanEvent) => {
    if ('stage' in event) {
      if (process.stderr.isTTY) {
        process.stderr.write(`\r${event.stage}...\n`);
      } else {
        process.stderr.write(`${event.stage}\n`);
      }
    }
  };

  const onResearchEvent = (event: { type: string; round?: number; totalCandidates?: number }) => {
    if (event.type === 'round') {
      if (process.stderr.isTTY) {
        process.stderr.write(`\rResearch round ${event.round}: ${event.totalCandidates} candidates...`);
      } else {
        process.stderr.write(`research round ${event.round}: ${event.totalCandidates} candidates\n`);
      }
    }
  };

  try {
    lastPlan = await runPlan({
      input,
      llmClient,
      gkpClient,
      appSettings,
      onEvent,
      onResearchEvent,
    });
  } catch (error) {
    console.error('Plan pipeline failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (input.nonInteractive) {
    if (lastPlan.articles.length === 0 && lastPlan.series.length === 0) {
      const output = formatNoResultsOutput(
        input.mode,
        input.publicationSlug,
        [],
        lastPlan.researchStats.candidatesEvaluated,
      );
      console.log(output);
      process.exit(2);
    }

    const output = formatPlanOutput(lastPlan, input.publicationSlug);
    console.log(output);
    process.exit(0);
  }

  if (lastPlan.articles.length === 0 && lastPlan.series.length === 0) {
    console.log('No results found.');
    process.exit(2);
  }

  return lastPlan;
}
