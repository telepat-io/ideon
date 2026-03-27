import React, { useEffect, useState } from 'react';
import { render, useApp } from 'ink';
import { resolveRunInput } from '../../config/resolver.js';
import { ReportedError } from '../reportedError.js';
import { PipelinePresenter } from '../ui/pipelinePresenter.js';
import { createInitialStages, runPipelineShell } from '../../pipeline/runner.js';
import { renderPlainPipeline } from '../logging/plainRenderer.js';
import type { PipelineRunResult, StageViewModel } from '../../pipeline/events.js';

interface WriteCommandOptions {
  idea?: string;
  jobPath?: string;
  dryRun: boolean;
}

function WriteApp({
  input,
  dryRun,
  onError,
}: {
  input: Awaited<ReturnType<typeof resolveRunInput>>;
  dryRun: boolean;
  onError: (error: Error) => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [stages, setStages] = useState<StageViewModel[]>(createInitialStages);
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let exitTimer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      try {
        const runResult = await runPipelineShell(input, {
          dryRun,
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
        exitTimer = setTimeout(() => {
          exit();
        }, 120);
      } catch (error) {
        if (!mounted) {
          return;
        }

        const normalizedError = error instanceof Error ? error : new Error('Unknown pipeline error');
        setErrorMessage(normalizedError.message);
        onError(normalizedError);
        exitTimer = setTimeout(() => {
          exit();
        }, 250);
      }
    })();

    return () => {
      mounted = false;
      if (exitTimer) {
        clearTimeout(exitTimer);
      }
    };
  }, [dryRun, exit, input, onError]);

  return <PipelinePresenter prompt={input.idea} stages={stages} result={result} errorMessage={errorMessage} />;
}

export async function runWriteCommand(options: WriteCommandOptions): Promise<void> {
  const input = await resolveRunInput({
    idea: options.idea,
    jobPath: options.jobPath,
  });

  if (!process.stdout.isTTY) {
    await renderPlainPipeline(input, options.dryRun);
    return;
  }

  let commandError: Error | null = null;

  const app = render(
    <WriteApp
      input={input}
      dryRun={options.dryRun}
      onError={(error) => {
        commandError = error;
      }}
    />,
  );
  await app.waitUntilExit();
  const finalError = commandError as Error | null;

  if (finalError) {
    throw new ReportedError(finalError.message);
  }
}