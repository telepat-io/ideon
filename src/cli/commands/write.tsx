import React, { useEffect, useState } from 'react';
import { render, useApp } from 'ink';
import { createInterface } from 'node:readline/promises';
import { resolveRunInput } from '../../config/resolver.js';
import { ReportedError } from '../reportedError.js';
import { PipelinePresenter } from '../ui/pipelinePresenter.js';
import { createInitialStages, runPipelineShell } from '../../pipeline/runner.js';
import { renderPlainPipeline } from '../logging/plainRenderer.js';
import type { PipelineRunResult, StageViewModel } from '../../pipeline/events.js';
import { loadWriteSession, patchWriteSession } from '../../pipeline/sessionStore.js';

interface WriteCommandOptions {
  idea?: string;
  jobPath?: string;
  dryRun: boolean;
}

type WriteRunMode = 'fresh' | 'resume';

const USER_INTERRUPTED_MESSAGE = 'Write interrupted by user. Run `ideon write resume` to continue from the last checkpoint.';

function WriteApp({
  input,
  dryRun,
  runMode,
  onError,
}: {
  input: Awaited<ReturnType<typeof resolveRunInput>>;
  dryRun: boolean;
  runMode: WriteRunMode;
  onError: (error: Error) => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [stages, setStages] = useState<StageViewModel[]>(createInitialStages);
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const runResult = await runPipelineShell(input, {
          dryRun,
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
      } catch (error) {
        if (!mounted) {
          return;
        }

        const normalizedError = error instanceof Error ? error : new Error('Unknown pipeline error');
        setErrorMessage(normalizedError.message);
        onError(normalizedError);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dryRun, input, onError, runMode]);

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
  await runWritePipeline(input, options.dryRun, 'fresh');
}

export async function runWriteResumeCommand(): Promise<void> {
  const session = await loadWriteSession();
  if (!session) {
    throw new ReportedError('No resumable write session found in .ideon/write/state.json. Run ideon write <idea> first.');
  }

  if (session.status === 'completed') {
    throw new ReportedError('The last write session already completed. Run ideon write <idea> to start fresh.');
  }

  const resolved = await resolveRunInput({ idea: session.idea });
  const input = {
    ...resolved,
    job: session.job,
    config: {
      settings: session.settings,
      secrets: resolved.config.secrets,
    },
  };
  await runWritePipeline(input, session.dryRun, 'resume');
}

async function runWritePipeline(
  input: Awaited<ReturnType<typeof resolveRunInput>>,
  dryRun: boolean,
  runMode: WriteRunMode,
): Promise<void> {
  let interruptHandled = false;

  const handleSignal = (signal: NodeJS.Signals): void => {
    if (interruptHandled) {
      return;
    }

    interruptHandled = true;
    void (async () => {
      try {
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

    if (!process.stdout.isTTY) {
      await renderPlainPipeline(input, dryRun, runMode);
      return;
    }

    let commandError: Error | null = null;

    const app = render(
      <WriteApp
        input={input}
        dryRun={dryRun}
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
      throw new ReportedError(finalError.message);
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
  try {
    return await resolveRunInput({
      idea: options.idea,
      jobPath: options.jobPath,
    });
  } catch (error) {
    if (!shouldPromptForIdea(options, error)) {
      throw error;
    }

    const interactiveIdea = await promptForIdea();
    return await resolveRunInput({
      idea: interactiveIdea,
      jobPath: options.jobPath,
    });
  }
}

function shouldPromptForIdea(options: WriteCommandOptions, error: unknown): boolean {
  return !options.idea && process.stdout.isTTY && process.stdin.isTTY && isMissingIdeaError(error);
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
      const idea = (await readline.question('Enter article prompt: ')).trim();
      if (idea.length > 0) {
        return idea;
      }

      console.error('Prompt cannot be empty.');
    }
  } finally {
    readline.close();
  }
}