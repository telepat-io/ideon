import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-queue-cmd-test-'));
const tempConfigDir = path.join(tempRoot, 'config');

jest.unstable_mockModule('env-paths', () => ({
  default: () => ({ config: tempConfigDir }),
}));

const { defaultAppSettings } = await import('../config/schema.js');
const {
  saveQueueEntry,
  clearQueue,
  generateQueueId,
} = await import('../config/queueStore.js');
const { queueEntrySchema } = await import('../types/queue.js');
const {
  runQueueListCommand,
  runQueuePeekCommand,
  runQueueRemoveCommand,
  runQueueClearCommand,
} = await import('../cli/commands/queue.js');

function makeEntry(overrides: Record<string, unknown> = {}) {
  return queueEntrySchema.parse({
    id: generateQueueId(),
    status: 'pending',
    idea: 'Test idea',
    settings: defaultAppSettings,
    addedAt: new Date().toISOString(),
    ...overrides,
  });
}

afterAll(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe('queue commands', () => {
  describe('runQueueListCommand', () => {
    it('prints empty message when queue is empty', async () => {
      await clearQueue();

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runQueueListCommand({ json: false });
      } finally {
        console.log = origLog;
      }

      expect(logs.some((l) => l.includes('Queue is empty'))).toBe(true);
    });

    it('lists entries in table format', async () => {
      await clearQueue();
      await saveQueueEntry(makeEntry({ idea: 'First article' }));
      await saveQueueEntry(makeEntry({ idea: 'Second article' }));

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runQueueListCommand({ json: false });
      } finally {
        console.log = origLog;
      }

      expect(logs.some((l) => l.includes('First article'))).toBe(true);
      expect(logs.some((l) => l.includes('Second article'))).toBe(true);
    });

    it('prints JSON output', async () => {
      await clearQueue();
      await saveQueueEntry(makeEntry({ idea: 'JSON article' }));

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runQueueListCommand({ json: true });
      } finally {
        console.log = origLog;
      }

      const jsonOutput = JSON.parse(logs[0]!);
      expect(jsonOutput.length).toBeGreaterThanOrEqual(1);
      expect(jsonOutput.some((e: { idea: string }) => e.idea === 'JSON article')).toBe(true);
    });

    it('filters by publication slug', async () => {
      await clearQueue();
      await saveQueueEntry(makeEntry({
        idea: 'With pub',
        publication: { name: 'My Pub', slug: 'my-pub', editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' }, defaults: {} },
      }));
      await saveQueueEntry(makeEntry({ idea: 'Without pub' }));

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runQueueListCommand({ json: true, publication: 'my-pub' });
      } finally {
        console.log = origLog;
      }

      const jsonOutput = JSON.parse(logs[0]!);
      expect(jsonOutput.length).toBe(1);
      expect(jsonOutput[0].idea).toBe('With pub');
    });
  });

  describe('runQueuePeekCommand', () => {
    it('shows the next pending entry', async () => {
      await clearQueue();
      await saveQueueEntry(makeEntry({ idea: 'Next up' }));

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runQueuePeekCommand({});
      } finally {
        console.log = origLog;
      }

      expect(logs.some((l) => l.includes('Next up'))).toBe(true);
    });

    it('prints empty message when no pending entries', async () => {
      await clearQueue();

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runQueuePeekCommand({});
      } finally {
        console.log = origLog;
      }

      expect(logs.some((l) => l.includes('No pending articles'))).toBe(true);
    });
  });

  describe('runQueueRemoveCommand', () => {
    it('removes an entry with --force', async () => {
      await clearQueue();
      const entry = makeEntry({ idea: 'Remove me' });
      await saveQueueEntry(entry);

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runQueueRemoveCommand({ id: entry.id, force: true });
      } finally {
        console.log = origLog;
      }

      expect(logs.some((l) => l.includes('Deleted queue entry'))).toBe(true);
    });

    it('throws for non-existent entry', async () => {
      await expect(
        runQueueRemoveCommand({ id: 'non-existent', force: true }),
      ).rejects.toThrow('not found');
    });
  });

  describe('runQueueClearCommand', () => {
    it('clears all entries with --force', async () => {
      await saveQueueEntry(makeEntry({ idea: 'Clear A' }));
      await saveQueueEntry(makeEntry({ idea: 'Clear B' }));

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runQueueClearCommand({ force: true });
      } finally {
        console.log = origLog;
      }

      expect(logs.some((l) => l.includes('Cleared'))).toBe(true);
    });
  });
});
