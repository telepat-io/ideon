import React, { useEffect, useState } from 'react';
import { render, useApp } from 'ink';
import { createInterface } from 'node:readline/promises';
import { resolveRunInput, type ContentTargetInput } from '../../config/resolver.js';
import { appSettingsSchema, resolveTargetLengthAlias, targetLengthValues, writingStyleValues } from '../../config/schema.js';
import { ReportedError } from '../reportedError.js';
import { PipelinePresenter } from '../ui/pipelinePresenter.js';
import { createInitialStages, runPipelineShell } from '../../pipeline/runner.js';
import { renderPlainPipeline } from '../logging/plainRenderer.js';
import type { PipelineRunResult, StageViewModel } from '../../pipeline/events.js';
import { loadWriteSession, patchWriteSession } from '../../pipeline/sessionStore.js';
import { WriteOptionsFlow } from '../flows/writeOptionsFlow.js';
import { parsePrimaryAndSecondarySpecs } from './writeTargetSpecs.js';
import { withWriteResumeHint } from './writeErrorHint.js';
import {
  notifyWriteCanceled,
  notifyWriteFailed,
  notifyWriteStarted,
  notifyWriteSucceeded,
} from '../notifications/osNotifier.js';

interface WriteCommandOptions {
  idea?: string;
  audience?: string;
  jobPath?: string;
  primarySpec?: string;
  secondarySpecs?: string[];
  style?: string;
  length?: string;
  noInteractive: boolean;
  dryRun: boolean;
  enrichLinks: boolean;
}

type WriteRunMode = 'fresh' | 'resume';

const USER_INTERRUPTED_MESSAGE = 'Write interrupted by user. Run `ideon write resume` to continue from the last checkpoint.';

function WriteApp({
  input,
  dryRun,
  enrichLinks,
  runMode,
  onError,
}: {
  input: Awaited<ReturnType<typeof resolveRunInput>>;
  dryRun: boolean;
  enrichLinks: boolean;
  runMode: WriteRunMode;
  onError: (error: Error) => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [stages, setStages] = useState<StageViewModel[]>(() =>
    createInitialStages({
      isArticlePrimary: input.config.settings.contentTargets.some((target) => target.role === 'primary' && target.contentType === 'article'),
    }),
  );
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        await notifyWriteStarted({
          enabled: input.config.settings.notifications.enabled,
          idea: input.idea,
          runMode,
        });

        const runResult = await runPipelineShell(input, {
          dryRun,
          enrichLinks,
          runMode,
          onUpdate(nextStages) {
            if (mounted) {
              setStages(nextStages);
            }
          },
        });

        if (!mounted) {
          return;
        }

        setResult(runResult);
        await notifyWriteSucceeded({
          enabled: input.config.settings.notifications.enabled,
          title: runResult.artifact.title,
          slug: runResult.artifact.slug,
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        const normalizedError = error instanceof Error ? error : new Error('Unknown pipeline error');
        const messageWithResumeHint = withWriteResumeHint(normalizedError.message);
        setErrorMessage(messageWithResumeHint);
        onError(new Error(messageWithResumeHint));
        await notifyWriteFailed({
          enabled: input.config.settings.notifications.enabled,
          message: messageWithResumeHint,
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dryRun, enrichLinks, input, onError, runMode]);

  useEffect(() => {
    if (!result && !errorMessage) {
      return;
    }

    const exitTimer = setTimeout(() => {
      exit();
    }, 250);

    return () => {
      clearTimeout(exitTimer);
    };
  }, [errorMessage, exit, result]);

  return <PipelinePresenter prompt={input.idea} stages={stages} result={result} errorMessage={errorMessage} />;
}

export async function runWriteCommand(options: WriteCommandOptions): Promise<void> {
  const input = await resolveInputWithInteractiveIdeaFallback(options);
  await runWritePipeline(input, options.dryRun, options.enrichLinks, 'fresh', options.noInteractive);
}

export async function runWriteResumeCommand(options: { noInteractive?: boolean; enrichLinks?: boolean } = {}): Promise<void> {
  const session = await loadWriteSession();
  if (!session) {
    throw new ReportedError('No resumable write session found in .ideon/write/state.json. Run ideon write <idea> first.');
  }

  if (session.status === 'completed') {
    throw new ReportedError('The last write session already completed. Run ideon write <idea> to start fresh.');
  }

  const resolved = await resolveRunInput({
    idea: session.idea,
    audience: session.targetAudienceHint ?? undefined,
  });
  const input = {
    ...resolved,
    job: session.job,
    config: {
      settings: session.settings,
      secrets: resolved.config.secrets,
    },
  };
  await runWritePipeline(input, session.dryRun, options.enrichLinks ?? false, 'resume', options.noInteractive ?? false);
}

async function runWritePipeline(
  input: Awaited<ReturnType<typeof resolveRunInput>>,
  dryRun: boolean,
  enrichLinks: boolean,
  runMode: WriteRunMode,
  noInteractive: boolean,
): Promise<void> {
  let interruptHandled = false;

  const handleSignal = (signal: NodeJS.Signals): void => {
    if (interruptHandled) {
      return;
    }

    interruptHandled = true;
    void (async () => {
      try {
        await notifyWriteCanceled({
          enabled: input.config.settings.notifications.enabled,
          signal,
        });
        await recordInterruptedWrite(signal);
      } finally {
        cleanupSignalHandlers();
        process.exit(130);
      }
    })();
  };

  const onSigint = (): void => {
    handleSignal('SIGINT');
  };

  const onSigterm = (): void => {
    handleSignal('SIGTERM');
  };

  const cleanupSignalHandlers = (): void => {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
  };

  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);

  try {

    if (noInteractive || !process.stdout.isTTY) {
      await renderPlainPipeline(input, dryRun, enrichLinks, runMode);
      return;
    }

    let commandError: Error | null = null;

    const app = render(
      <WriteApp
        input={input}
        dryRun={dryRun}
        enrichLinks={enrichLinks}
        runMode={runMode}
        onError={(error) => {
          commandError = error;
        }}
      />,
    );
    await app.waitUntilExit();
    process.stdout.write('\n');
    const finalError = commandError as Error | null;

    if (finalError) {
      throw new ReportedError(withWriteResumeHint(finalError.message));
    }
  } finally {
    cleanupSignalHandlers();
  }
}

async function recordInterruptedWrite(signal: NodeJS.Signals): Promise<void> {
  const session = await loadWriteSession();
  if (!session || session.status === 'completed') {
    return;
  }

  await patchWriteSession({
    status: 'failed',
    errorMessage: `${USER_INTERRUPTED_MESSAGE} (${signal})`,
  });
}

async function resolveInputWithInteractiveIdeaFallback(options: WriteCommandOptions) {
  const parsedTargets = parsePrimaryAndSecondarySpecs({
    primarySpec: options.primarySpec,
    secondarySpecs: options.secondarySpecs,
  });

  try {
    const resolved = await resolveRunInput({
      idea: options.idea,
      audience: options.audience,
      jobPath: options.jobPath,
      style: options.style,
      targetLength: options.length,
      contentTargets: parsedTargets,
    });

    if (!process.stdout.isTTY && !process.stdin.isTTY && !parsedTargets && !resolved.job?.settings?.contentTargets) {
      throw new ReportedError('Missing required --primary <content-type=1> for non-interactive runs.');
    }

    return await applyInteractiveWriteOptionsIfNeeded(resolved, options, parsedTargets);
  } catch (error) {
    if (!shouldPromptForIdea(options, error)) {
      throw error;
    }

    const interactiveIdea = await promptForIdea();
    const resolved = await resolveRunInput({
      idea: interactiveIdea,
      audience: options.audience,
      jobPath: options.jobPath,
      style: options.style,
      targetLength: options.length,
      contentTargets: parsedTargets,
    });

    return await applyInteractiveWriteOptionsIfNeeded(resolved, { ...options, idea: interactiveIdea }, parsedTargets);
  }
}

async function applyInteractiveWriteOptionsIfNeeded(
  resolved: Awaited<ReturnType<typeof resolveRunInput>>,
  options: WriteCommandOptions,
  parsedTargets: ContentTargetInput[] | undefined,
): Promise<Awaited<ReturnType<typeof resolveRunInput>>> {
  const styleProvided = Boolean(options.style ?? resolved.job?.settings?.style);
  const lengthProvided = Boolean(options.length ?? resolved.job?.settings?.targetLength);
  const providedTargets = (parsedTargets && parsedTargets.length > 0)
    ? parsedTargets
    : (resolved.job?.settings?.contentTargets ?? resolved.config.settings.contentTargets);
  const targetsProvided = Boolean((parsedTargets && parsedTargets.length > 0) || resolved.job?.settings?.contentTargets?.length);

  if (options.noInteractive && (!styleProvided || !targetsProvided || !lengthProvided)) {
    const missingFlags = [
      !styleProvided ? '--style <style>' : null,
      !targetsProvided ? '--primary <content-type=1>' : null,
      !lengthProvided ? '--length <size>' : null,
    ].filter((value): value is string => Boolean(value));

    throw new ReportedError(
      `Missing required options for --no-interactive mode: ${missingFlags.join(', ')}.`,
    );
  }

  if (!process.stdout.isTTY || !process.stdin.isTTY || options.noInteractive) {
    return resolved;
  }

  if (styleProvided && targetsProvided && lengthProvided) {
    return resolved;
  }

  const prompted = await promptForMissingWriteOptions({
    askStyle: !styleProvided,
    askTargets: !targetsProvided,
    askLength: !lengthProvided,
    style: resolved.config.settings.style,
    targetLength: resolved.config.settings.targetLength,
    targets: providedTargets,
  });

  return {
    ...resolved,
    config: {
      ...resolved.config,
      settings: appSettingsSchema.parse({
        ...resolved.config.settings,
        ...(prompted.style ? { style: prompted.style } : {}),
        ...(prompted.targetLength ? { targetLength: prompted.targetLength } : {}),
        ...(prompted.contentTargets ? { contentTargets: prompted.contentTargets } : {}),
      }),
    },
  };
}

async function promptForMissingWriteOptions(params: {
  askStyle: boolean;
  askTargets: boolean;
  askLength: boolean;
  style: string;
  targetLength: number;
  targets: ContentTargetInput[];
}): Promise<{ style?: string; targetLength?: string; contentTargets?: ContentTargetInput[] }> {
  let flowResult: { style?: string; targetLength?: string; contentTargets?: ContentTargetInput[] } | null = null;

  const app = render(
    React.createElement(WriteOptionsFlow, {
      askStyle: params.askStyle,
      askTargets: params.askTargets,
      askLength: params.askLength,
      initialStyle: (writingStyleValues as readonly string[]).includes(params.style)
        ? params.style
        : 'professional',
      initialTargetLength: resolveTargetLengthAlias(params.targetLength),
      initialTargets: params.targets,
      onDone: (result: { style?: string; targetLength?: string; contentTargets?: ContentTargetInput[] } | null) => {
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

function shouldPromptForIdea(options: WriteCommandOptions, error: unknown): boolean {
  return !options.noInteractive && !options.idea && process.stdout.isTTY && process.stdin.isTTY && isMissingIdeaError(error);
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