import React, { useEffect, useState } from 'react';
import { render, useApp } from 'ink';
import { resolveRunInput } from '../../config/resolver.js';
import { appSettingsSchema } from '../../config/schema.js';
import { ReportedError } from '../reportedError.js';
import { runOutputCommand } from './export.js';
import { PipelinePresenter } from '../ui/pipelinePresenter.js';
import { createInitialStages, runPipelineShell } from '../../pipeline/runner.js';
import { renderPlainPipeline } from '../logging/plainRenderer.js';
import type { PipelineRunResult, StageViewModel } from '../../pipeline/events.js';
import { loadWriteSession, patchWriteSession } from '../../pipeline/sessionStore.js';
import { withWriteResumeHint } from './writeErrorHint.js';
import { resolveWriteInput } from '../writeInputResolver.js';
import type { ContentCommandOptions } from '../contentOptions.js';
import {
  claimNextPendingEntry,
  deleteClaimedEntry,
  revertClaimedEntry,
} from '../../config/queueStore.js';
import {
  notifyWriteCanceled,
  notifyWriteFailed,
  notifyWriteStarted,
  notifyWriteSucceeded,
} from '../notifications/osNotifier.js';

interface WriteCommandOptions extends ContentCommandOptions {
  noInteractive: boolean;
  dryRun: boolean;
  noSeoCheck: boolean;
  seoCheckMode?: 'errors-only' | 'strict';
  seoCheckMaxTurns?: number;
  enrichLinks: boolean;
  links?: string[];
  unlinks?: string[];
  maxLinks?: number;
  maxImages?: number;
  exportPath?: string;
  fromQueue?: boolean;
}

type WriteRunMode = 'fresh' | 'resume';

const USER_INTERRUPTED_MESSAGE = 'Write interrupted by user. Run `ideon write resume` to continue from the last checkpoint.';

function WriteApp({
  input,
  dryRun,
  enrichLinks,
  noSeoCheck,
  seoCheckMode,
  seoCheckMaxTurns,
  forceSeoCheck,
  runMode,
  links,
  unlinks,
  maxLinks,
  maxImages,
  onSuccess,
  onError,
}: {
  input: Awaited<ReturnType<typeof resolveRunInput>>;
  dryRun: boolean;
  enrichLinks: boolean;
  noSeoCheck: boolean;
  seoCheckMode?: 'errors-only' | 'strict';
  seoCheckMaxTurns?: number;
  forceSeoCheck: boolean;
  runMode: WriteRunMode;
  links?: string[];
  unlinks?: string[];
  maxLinks?: number;
  maxImages?: number;
  onSuccess?: (result: PipelineRunResult) => void;
  onError: (error: Error) => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [stages, setStages] = useState<StageViewModel[]>(() =>
    createInitialStages(),
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
          noSeoCheck,
          seoCheckMode,
          seoCheckMaxTurns,
          forceSeoCheck,
          runMode,
          customLinks: links,
          unlinks,
          maxLinks,
          maxImages,
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
        onSuccess?.(runResult);
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
  }, [dryRun, enrichLinks, forceSeoCheck, input, links, noSeoCheck, seoCheckMode, seoCheckMaxTurns, onError, runMode, unlinks, maxLinks, maxImages]);

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
  if (options.fromQueue) {
    await runWriteFromQueue(options);
    return;
  }

  const input = await resolveWriteInput(options, { noInteractive: options.noInteractive });
  await runWritePipeline(input, options.dryRun, options.enrichLinks, 'fresh', options.noInteractive, options.links, options.unlinks, options.maxLinks, options.maxImages, options.exportPath, undefined, options.noSeoCheck, false, options.seoCheckMode, options.seoCheckMaxTurns);
}

async function runWriteFromQueue(options: WriteCommandOptions): Promise<void> {
  const entry = await claimNextPendingEntry({ publicationSlug: options.publication });
  if (!entry) {
    const filter = options.publication ? ` for publication "${options.publication}"` : '';
    throw new ReportedError(`No pending articles in the queue${filter}.`);
  }

  const queueInput: Awaited<ReturnType<typeof resolveRunInput>> = {
    config: {
      settings: entry.settings,
      secrets: (await (async () => {
        const { loadSecrets } = await import('../../config/secretStore.js');
        const { readEnvSettings } = await import('../../config/env.js');
        const envSettings = readEnvSettings();
        const secrets = await loadSecrets({ disableKeytar: envSettings.disableKeytar });
        return {
          openRouterApiKey: envSettings.openRouterApiKey ?? secrets.openRouterApiKey,
          replicateApiToken: envSettings.replicateApiToken ?? secrets.replicateApiToken,
          googleAdsDeveloperToken: envSettings.googleAdsDeveloperToken ?? secrets.googleAdsDeveloperToken,
          googleAdsClientId: envSettings.googleAdsClientId ?? secrets.googleAdsClientId,
          googleAdsClientSecret: envSettings.googleAdsClientSecret ?? secrets.googleAdsClientSecret,
          googleAdsRefreshToken: envSettings.googleAdsRefreshToken ?? secrets.googleAdsRefreshToken,
          googleAdsCustomerId: envSettings.googleAdsCustomerId ?? secrets.googleAdsCustomerId,
          googleAdsLoginCustomerId: envSettings.googleAdsLoginCustomerId ?? secrets.googleAdsLoginCustomerId,
        };
      })()),
    },
    idea: entry.idea,
    targetAudienceHint: entry.targetAudienceHint,
    job: entry.job,
    publication: entry.publication,
    series: entry.series,
    author: entry.author,
    experienceNotes: entry.experienceNotes,
  };

  if (options.style || options.intent || options.length) {
    queueInput.config.settings = appSettingsSchema.parse({
      ...queueInput.config.settings,
      ...(options.style ? { style: options.style } : {}),
      ...(options.intent ? { intent: options.intent } : {}),
      ...(options.length ? { targetLength: options.length } : {}),
    });
  }

  try {
    await runWritePipeline(
      queueInput,
      options.dryRun,
      options.enrichLinks,
      'fresh',
      true,
      options.links,
      options.unlinks,
      options.maxLinks,
      options.maxImages,
      entry.exportPath ?? options.exportPath,
      entry.id,
    );
    await deleteClaimedEntry(entry.id);
  } catch (error) {
    await revertClaimedEntry(entry);
    throw error;
  }
}

export async function runWriteResumeCommand(options: { noInteractive?: boolean; forceSeoCheck?: boolean; seoCheckMode?: 'errors-only' | 'strict'; seoCheckMaxTurns?: number; enrichLinks?: boolean; links?: string[]; unlinks?: string[]; maxLinks?: number; maxImages?: number; exportPath?: string } = {}): Promise<void> {
  const session = await loadWriteSession();
  if (!session) {
    throw new ReportedError('No resumable write session found. Run ideon write <idea> first.');
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
  await runWritePipeline(input, session.dryRun, options.enrichLinks ?? false, 'resume', options.noInteractive ?? false, options.links, options.unlinks, options.maxLinks, options.maxImages, options.exportPath, undefined, false, options.forceSeoCheck ?? false, options.seoCheckMode, options.seoCheckMaxTurns);
}

async function runWritePipeline(
  input: Awaited<ReturnType<typeof resolveRunInput>>,
  dryRun: boolean,
  enrichLinks: boolean,
  runMode: WriteRunMode,
  noInteractive: boolean,
  links?: string[],
  unlinks?: string[],
  maxLinks?: number,
  maxImages?: number,
  exportPath?: string,
  queueEntryId?: string,
  noSeoCheck = false,
  forceSeoCheck = false,
  seoCheckMode?: 'errors-only' | 'strict',
  seoCheckMaxTurns?: number,
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

        if (queueEntryId) {
          const { loadQueueEntry, revertClaimedEntry } = await import('../../config/queueStore.js');
          const claimed = await loadQueueEntry(queueEntryId);
          if (claimed) {
            await revertClaimedEntry(claimed);
          }
        }
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
      const result = await renderPlainPipeline(input, dryRun, enrichLinks, runMode, links, unlinks, maxLinks, maxImages, noSeoCheck, forceSeoCheck, seoCheckMode, seoCheckMaxTurns);
      if (exportPath) {
        await runOutputCommand({
          generationId: result.artifact.slug,
          destinationPath: exportPath,
        });
      }
      return;
    }

    let commandError: Error | null = null;
    let pipelineResult: PipelineRunResult | null = null;

    const app = render(
      <WriteApp
        input={input}
        dryRun={dryRun}
        enrichLinks={enrichLinks}
        noSeoCheck={noSeoCheck}
        seoCheckMode={seoCheckMode}
        seoCheckMaxTurns={seoCheckMaxTurns}
        forceSeoCheck={forceSeoCheck}
        runMode={runMode}
        links={links}
        unlinks={unlinks}
        maxLinks={maxLinks}
        maxImages={maxImages}
        onSuccess={(result) => {
          pipelineResult = result;
        }}
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
    if (exportPath && pipelineResult) {
      await autoExport(exportPath, pipelineResult);
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

async function autoExport(exportPath: string, result: PipelineRunResult): Promise<void> {
  await runOutputCommand({
    generationId: result.artifact.slug,
    destinationPath: exportPath,
  });
}
