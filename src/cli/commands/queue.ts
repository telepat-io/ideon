import { createInterface } from 'node:readline/promises';
import { resolveTargetLengthAlias } from '../../config/schema.js';
import {
  generateQueueId,
  saveQueueEntry,
  listQueueEntries,
  getNextPendingEntry,
  deleteQueueEntry,
  clearQueue,
  queueEntryExists,
} from '../../config/queueStore.js';
import type { QueueEntry, QueueEntryStatus } from '../../types/queue.js';
import { resolveWriteInput } from '../writeInputResolver.js';
import type { ContentCommandOptions } from '../contentOptions.js';
import { ReportedError } from '../reportedError.js';

interface QueueAddOptions extends ContentCommandOptions {
  noInteractive: boolean;
}

interface QueueListOptions {
  json: boolean;
  publication?: string;
  status?: string;
}

interface QueueRemoveOptions {
  id: string;
  force: boolean;
}

export async function runQueueAddCommand(
  ideaArg: string | undefined,
  options: QueueAddOptions,
): Promise<void> {
  const resolved = await resolveWriteInput(options, { noInteractive: options.noInteractive });

  const entry: QueueEntry = {
    id: generateQueueId(),
    status: 'pending',
    idea: resolved.idea,
    targetAudienceHint: resolved.targetAudienceHint,
    settings: resolved.config.settings,
    job: resolved.job,
    publication: resolved.publication,
    series: resolved.series,
    exportPath: options.exportPath,
    addedAt: new Date().toISOString(),
    type: 'new',
  };

  await saveQueueEntry(entry);

  const ideaSnippet = entry.idea.length > 60 ? `${entry.idea.slice(0, 57)}...` : entry.idea;
  console.log(`Added to queue: ${entry.id} — "${ideaSnippet}"`);
}

export async function runQueueListCommand(options: QueueListOptions): Promise<void> {
  const statusFilter = options.status as QueueEntryStatus | undefined;
  const entries = await listQueueEntries({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(options.publication ? { publicationSlug: options.publication } : {}),
  });

  if (options.json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (entries.length === 0) {
    console.log('Queue is empty. Add articles with `ideon queue add`.');
    return;
  }

  const idWidth = 36;
  const ideaWidth = Math.max(6, ...entries.map((e) => Math.min(e.idea.length, 40)));
  const styleWidth = Math.max(6, ...entries.map((e) => (e.settings.style ?? '-').length));
  const pubWidth = Math.max(6, ...entries.map((e) => (e.publication?.slug ?? '-').length));
  const statusWidth = Math.max(6, ...entries.map((e) => e.status.length));

  console.log(
    '  ' +
    'ID'.padEnd(idWidth) + '  ' +
    'Idea'.padEnd(ideaWidth) + '  ' +
    'Style'.padEnd(styleWidth) + '  ' +
    'Publication'.padEnd(pubWidth) + '  ' +
    'Status'.padEnd(statusWidth)
  );

  console.log('  ' + '-'.repeat(idWidth + ideaWidth + styleWidth + pubWidth + statusWidth + 16));

  for (const entry of entries) {
    const ideaSnippet = entry.idea.length > 40 ? `${entry.idea.slice(0, 37)}...` : entry.idea;
    const style = entry.settings.style ?? '-';
    const pub = entry.publication?.slug ?? '-';
    console.log(
      '  ' +
      entry.id.padEnd(idWidth) + '  ' +
      ideaSnippet.padEnd(ideaWidth) + '  ' +
      style.padEnd(styleWidth) + '  ' +
      pub.padEnd(pubWidth) + '  ' +
      entry.status.padEnd(statusWidth)
    );
  }
}

export async function runQueuePeekCommand(options: { publication?: string }): Promise<void> {
  const entry = await getNextPendingEntry({
    ...(options.publication ? { publicationSlug: options.publication } : {}),
  });

  if (!entry) {
    const filter = options.publication ? ` for publication "${options.publication}"` : '';
    console.log(`No pending articles in the queue${filter}.`);
    return;
  }

  printQueueEntryDetail(entry);
}

export async function runQueueRemoveCommand(options: QueueRemoveOptions): Promise<void> {
  if (!(await queueEntryExists(options.id))) {
    throw new ReportedError(`Queue entry "${options.id}" not found.`);
  }

  if (!options.force) {
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      throw new ReportedError('Remove requires confirmation in an interactive terminal. Re-run with --force to skip the prompt.');
    }

    const confirmed = await promptForConfirmation(`Delete queue entry "${options.id}"?`);
    if (!confirmed) {
      console.log('Removal cancelled.');
      return;
    }
  }

  await deleteQueueEntry(options.id);
  console.log(`Deleted queue entry "${options.id}".`);
}

export async function runQueueClearCommand(options: { force: boolean }): Promise<void> {
  if (!options.force) {
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      throw new ReportedError('Clear requires confirmation in an interactive terminal. Re-run with --force to skip the prompt.');
    }

    const confirmed = await promptForConfirmation('Clear all queue entries?');
    if (!confirmed) {
      console.log('Clear cancelled.');
      return;
    }
  }

  const count = await clearQueue();
  console.log(`Cleared ${count} queue ${count === 1 ? 'entry' : 'entries'}.`);
}

function printQueueEntryDetail(entry: QueueEntry): void {
  console.log(`  ID: ${entry.id}`);
  console.log(`  Idea: ${entry.idea}`);
  if (entry.targetAudienceHint) console.log(`  Audience: ${entry.targetAudienceHint}`);
  if (entry.publication) console.log(`  Publication: ${entry.publication.slug}`);
  if (entry.series) console.log(`  Series: ${entry.series.slug}`);
  console.log(`  Style: ${entry.settings.style}`);
  console.log(`  Intent: ${entry.settings.intent}`);
  console.log(`  Length: ${resolveTargetLengthAlias(entry.settings.targetLength)}`);
  const primary = entry.settings.contentTargets.find((t) => t.role === 'primary');
  if (primary) console.log(`  Type: ${primary.contentType}`);
  console.log(`  Status: ${entry.status}`);
  console.log(`  Added: ${entry.addedAt}`);
}

async function promptForConfirmation(message: string): Promise<boolean> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (await readline.question(`${message} (y/N) `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    readline.close();
  }
}
