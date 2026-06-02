import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import envPaths from 'env-paths';
import { queueEntrySchema, type QueueEntry } from '../types/queue.js';

const ideonPaths = envPaths('ideon', { suffix: '' });
const queueDir = path.join(ideonPaths.config, 'queue');

function pendingFilePath(id: string): string {
  return path.join(queueDir, `${id}.json`);
}

function inProgressFilePath(id: string): string {
  return path.join(queueDir, `${id}.in-progress.json`);
}

export function getQueueDir(): string {
  return queueDir;
}

export function generateQueueId(): string {
  return randomUUID();
}

export async function saveQueueEntry(entry: QueueEntry): Promise<void> {
  await mkdir(queueDir, { recursive: true });
  const filePath = pendingFilePath(entry.id);
  await writeFile(filePath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
}

export async function loadQueueEntry(id: string): Promise<QueueEntry | null> {
  for (const filePath of [pendingFilePath(id), inProgressFilePath(id)]) {
    try {
      const raw = await readFile(filePath, 'utf8');
      return queueEntrySchema.parse(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  return null;
}

export async function listQueueEntries(options?: { status?: QueueEntry['status']; publicationSlug?: string }): Promise<QueueEntry[]> {
  await mkdir(queueDir, { recursive: true });
  const entries = await readdir(queueDir, { withFileTypes: true });
  const queueEntries: QueueEntry[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    try {
      const raw = await readFile(path.join(queueDir, entry.name), 'utf8');
      const parsed = queueEntrySchema.parse(JSON.parse(raw));

      if (options?.status && parsed.status !== options.status) {
        continue;
      }

      if (options?.publicationSlug && parsed.publication?.slug !== options.publicationSlug) {
        continue;
      }

      queueEntries.push(parsed);
    } catch {
      // Skip malformed queue files silently
    }
  }

  return queueEntries.sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

export async function getNextPendingEntry(options?: { publicationSlug?: string }): Promise<QueueEntry | null> {
  const pending = await listQueueEntries({
    status: 'pending',
    ...(options?.publicationSlug ? { publicationSlug: options.publicationSlug } : {}),
  });
  return pending[0] ?? null;
}

export async function claimNextPendingEntry(options?: { publicationSlug?: string }): Promise<QueueEntry | null> {
  const entry = await getNextPendingEntry(options);
  if (!entry) {
    return null;
  }

  const srcPath = pendingFilePath(entry.id);
  const destPath = inProgressFilePath(entry.id);

  try {
    await rename(srcPath, destPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Another process claimed it first
      return null;
    }
    throw error;
  }

  const claimed: QueueEntry = {
    ...entry,
    status: 'in-progress',
    startedAt: new Date().toISOString(),
  };

  await writeFile(destPath, `${JSON.stringify(claimed, null, 2)}\n`, 'utf8');
  return claimed;
}

export async function revertClaimedEntry(entry: QueueEntry): Promise<void> {
  const srcPath = inProgressFilePath(entry.id);
  const destPath = pendingFilePath(entry.id);

  const reverted: QueueEntry = {
    ...entry,
    status: 'pending',
    startedAt: undefined,
  };

  try {
    await writeFile(destPath, `${JSON.stringify(reverted, null, 2)}\n`, 'utf8');
    await rm(srcPath, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function deleteQueueEntry(id: string): Promise<void> {
  for (const filePath of [pendingFilePath(id), inProgressFilePath(id)]) {
    try {
      await rm(filePath);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  throw new Error(`Queue entry "${id}" not found.`);
}

export async function deleteClaimedEntry(id: string): Promise<void> {
  try {
    await rm(inProgressFilePath(id));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function clearQueue(): Promise<number> {
  await mkdir(queueDir, { recursive: true });
  const entries = await readdir(queueDir, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    await rm(path.join(queueDir, entry.name));
    count++;
  }

  return count;
}

export async function queueEntryExists(id: string): Promise<boolean> {
  for (const filePath of [pendingFilePath(id), inProgressFilePath(id)]) {
    try {
      await readFile(filePath, 'utf8');
      return true;
    } catch {
      // continue
    }
  }
  return false;
}
