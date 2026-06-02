import { createInterface } from 'node:readline/promises';
import { resolveRunInput, type ContentTargetInput } from '../config/resolver.js';
import { appSettingsSchema } from '../config/schema.js';
import { ReportedError } from './reportedError.js';
import { parsePrimaryAndSecondarySpecs } from './commands/writeTargetSpecs.js';
import type { ContentCommandOptions } from './contentOptions.js';

export interface ResolvedWriteInput {
  config: Awaited<ReturnType<typeof resolveRunInput>>['config'];
  idea: string;
  targetAudienceHint?: string;
  job: Awaited<ReturnType<typeof resolveRunInput>>['job'];
  publication: Awaited<ReturnType<typeof resolveRunInput>>['publication'];
  series: Awaited<ReturnType<typeof resolveRunInput>>['series'];
  keywords?: string[];
}

export async function resolveWriteInput(
  options: ContentCommandOptions,
  { noInteractive = false }: { noInteractive?: boolean } = {},
): Promise<ResolvedWriteInput> {
  const parsedTargets = parsePrimaryAndSecondarySpecs({
    primarySpec: options.primarySpec,
    secondarySpecs: options.secondarySpecs,
  });

  const parsedKeywords = options.keywords
    ? options.keywords.split(',').map((kw) => kw.trim()).filter((kw) => kw.length > 0)
    : undefined;

  try {
    const resolved = await resolveRunInput({
      idea: options.idea,
      audience: options.audience,
      jobPath: options.jobPath,
      publication: options.publication,
      series: options.series,
      style: options.style,
      intent: options.intent,
      targetLength: options.length,
      contentTargets: parsedTargets,
      keywords: parsedKeywords,
    });

    if (!process.stdout.isTTY && !process.stdin.isTTY && !parsedTargets && !resolved.job?.settings?.contentTargets) {
      throw new ReportedError('Missing required --primary <content-type=1> for non-interactive runs.');
    }

    return await applyInteractiveWriteOptionsIfNeeded(resolved, options, parsedTargets, noInteractive);
  } catch (error) {
    if (!noInteractive && !options.idea && process.stdout.isTTY && process.stdin.isTTY && isMissingIdeaError(error)) {
      const interactiveIdea = await promptForIdea();
      const resolved = await resolveRunInput({
        idea: interactiveIdea,
        audience: options.audience,
        jobPath: options.jobPath,
        publication: options.publication,
        series: options.series,
        style: options.style,
        intent: options.intent,
        targetLength: options.length,
        contentTargets: parsedTargets,
        keywords: parsedKeywords,
      });

      return await applyInteractiveWriteOptionsIfNeeded(resolved, { ...options, idea: interactiveIdea }, parsedTargets, noInteractive);
    }

    throw error;
  }
}

async function applyInteractiveWriteOptionsIfNeeded(
  resolved: Awaited<ReturnType<typeof resolveRunInput>>,
  options: ContentCommandOptions,
  parsedTargets: ContentTargetInput[] | undefined,
  noInteractive: boolean,
): Promise<ResolvedWriteInput> {
  const seriesProvided = Boolean(options.series ?? resolved.job?.series);
  const styleProvided = Boolean(options.style ?? resolved.job?.settings?.style);
  const intentProvided = Boolean(options.intent);
  const lengthProvided = Boolean(options.length ?? resolved.job?.settings?.targetLength);
  const providedTargets = (parsedTargets && parsedTargets.length > 0)
    ? parsedTargets
    : (resolved.job?.settings?.contentTargets ?? resolved.config.settings.contentTargets);
  const targetsProvided = Boolean((parsedTargets && parsedTargets.length > 0) || resolved.job?.settings?.contentTargets?.length);

  if (noInteractive && (!styleProvided || !intentProvided || !targetsProvided || !lengthProvided)) {
    const missingFlags = [
      !styleProvided ? '--style <style>' : null,
      !intentProvided ? '--intent <intent>' : null,
      !targetsProvided ? '--primary <content-type=1>' : null,
      !lengthProvided ? '--length <size>' : null,
    ].filter((value): value is string => Boolean(value));

    throw new ReportedError(
      `Missing required options for --no-interactive mode: ${missingFlags.join(', ')}.`,
    );
  }

  if (!process.stdout.isTTY || !process.stdin.isTTY || noInteractive) {
    return resolved;
  }

  if (seriesProvided && styleProvided && intentProvided && targetsProvided && lengthProvided) {
    return resolved;
  }

  const prompted = await promptForMissingWriteOptions({
    askSeries: !seriesProvided,
    askStyle: !styleProvided,
    askIntent: !intentProvided,
    askTargets: !targetsProvided,
    askLength: !lengthProvided,
    style: resolved.config.settings.style,
    targetLength: resolved.config.settings.targetLength,
    intent: resolved.config.settings.intent,
    targets: providedTargets,
  });

  let resolvedSeries = resolved.series;
  if (prompted.series && !resolved.series) {
    const { loadSeries } = await import('../config/seriesStore.js');
    resolvedSeries = await loadSeries(prompted.series).catch(() => null);
  }

  return {
    ...resolved,
    series: resolvedSeries,
    config: {
      ...resolved.config,
      settings: appSettingsSchema.parse({
        ...resolved.config.settings,
        ...(prompted.style ? { style: prompted.style } : {}),
        ...(prompted.intent ? { intent: prompted.intent } : {}),
        ...(prompted.targetLength ? { targetLength: prompted.targetLength } : {}),
        ...(prompted.contentTargets ? { contentTargets: prompted.contentTargets } : {}),
      }),
    },
  };
}

function isMissingIdeaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.startsWith('No idea provided.');
}

async function promptForIdea(): Promise<string> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const idea = (await readline.question('Enter primary content prompt: ')).trim();
      if (idea.length > 0) {
        return idea;
      }

      console.error('Prompt cannot be empty.');
    }
  } finally {
    readline.close();
  }
}

async function promptForMissingWriteOptions(params: {
  askSeries: boolean;
  askStyle: boolean;
  askIntent: boolean;
  askTargets: boolean;
  askLength: boolean;
  style: string;
  intent: string;
  targetLength: number;
  targets: ContentTargetInput[];
}): Promise<{ series?: string; style?: string; intent?: string; targetLength?: string; contentTargets?: ContentTargetInput[] }> {
  const { contentIntentValues, resolveTargetLengthAlias, writingStyleValues } = await import('../config/schema.js');
  const React = (await import('react')).default;
  const { render } = await import('ink');
  const { WriteOptionsFlow } = await import('./flows/writeOptionsFlow.js');

  let flowResult: { series?: string; style?: string; intent?: string; targetLength?: string; contentTargets?: ContentTargetInput[] } | null = null;

  const app = render(
    React.createElement(WriteOptionsFlow, {
      askSeries: params.askSeries,
      askStyle: params.askStyle,
      askIntent: params.askIntent,
      askTargets: params.askTargets,
      askLength: params.askLength,
      initialStyle: (writingStyleValues as readonly string[]).includes(params.style)
        ? params.style
        : 'professional',
      initialIntent: (contentIntentValues as readonly string[]).includes(params.intent)
        ? params.intent
        : 'tutorial',
      initialTargetLength: resolveTargetLengthAlias(params.targetLength),
      initialTargets: params.targets,
      onDone: (result: { series?: string; style?: string; intent?: string; targetLength?: string; contentTargets?: ContentTargetInput[] } | null) => {
        flowResult = result;
      },
    }),
  );

  await app.waitUntilExit();
  process.stdout.write('\n');

  if (!flowResult) {
    throw new ReportedError('Write cancelled.');
  }

  return flowResult;
}
