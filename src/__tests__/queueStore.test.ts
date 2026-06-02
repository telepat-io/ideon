import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-queue-test-'));
const tempConfigDir = path.join(tempRoot, 'config');

jest.unstable_mockModule('env-paths', () => ({
  default: () => ({ config: tempConfigDir }),
}));

const { queueEntrySchema } = await import('../types/queue.js');
const {
  saveQueueEntry,
  loadQueueEntry,
  listQueueEntries,
  getNextPendingEntry,
  claimNextPendingEntry,
  revertClaimedEntry,
  deleteQueueEntry,
  deleteClaimedEntry,
  clearQueue,
  queueEntryExists,
  generateQueueId,
  getQueueDir,
} = await import('../config/queueStore.js');
const { defaultAppSettings } = await import('../config/schema.js');

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

describe('queue store', () => {
  describe('generateQueueId', () => {
    it('returns a non-empty string', () => {
      const id = generateQueueId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('returns unique ids', () => {
      const id1 = generateQueueId();
      const id2 = generateQueueId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('getQueueDir', () => {
    it('returns a path under the config dir', () => {
      const dir = getQueueDir();
      expect(dir).toContain('queue');
    });
  });

  describe('saveQueueEntry and loadQueueEntry', () => {
    it('saves and loads a pending entry', async () => {
      const entry = makeEntry();
      await saveQueueEntry(entry);
      const loaded = await loadQueueEntry(entry.id);
      expect(loaded).toBeTruthy();
      expect(loaded!.id).toBe(entry.id);
      expect(loaded!.idea).toBe('Test idea');
      expect(loaded!.status).toBe('pending');
    });

    it('returns null for non-existent id', async () => {
      const loaded = await loadQueueEntry('non-existent-id');
      expect(loaded).toBeNull();
    });

    it('loads an in-progress entry', async () => {
      const entry = makeEntry({ status: 'in-progress', startedAt: new Date().toISOString() });
      const filePath = path.join(getQueueDir(), `${entry.id}.in-progress.json`);
      const { mkdir } = await import('node:fs/promises');
      await mkdir(getQueueDir(), { recursive: true });
      await writeFile(filePath, JSON.stringify(entry, null, 2), 'utf8');

      const loaded = await loadQueueEntry(entry.id);
      expect(loaded).toBeTruthy();
      expect(loaded!.status).toBe('in-progress');
    });
  });

  describe('listQueueEntries', () => {
    it('lists all entries sorted by addedAt', async () => {
      await clearQueue();

      const entry1 = makeEntry({ idea: 'First', addedAt: '2025-01-01T00:00:00.000Z' });
      const entry2 = makeEntry({ idea: 'Second', addedAt: '2025-01-02T00:00:00.000Z' });
      await saveQueueEntry(entry1);
      await saveQueueEntry(entry2);

      const entries = await listQueueEntries();
      expect(entries.length).toBeGreaterThanOrEqual(2);
      const ideas = entries.map((e) => e.idea);
      expect(ideas.indexOf('First')).toBeLessThan(ideas.indexOf('Second'));
    });

    it('filters by status', async () => {
      await clearQueue();

      const pending = makeEntry({ idea: 'Pending item' });
      const inProgress = makeEntry({ idea: 'In-progress item', status: 'in-progress', startedAt: new Date().toISOString() });
      await saveQueueEntry(pending);
      const inProgressPath = path.join(getQueueDir(), `${inProgress.id}.in-progress.json`);
      await writeFile(inProgressPath, JSON.stringify(inProgress, null, 2), 'utf8');

      const pendingEntries = await listQueueEntries({ status: 'pending' });
      expect(pendingEntries.every((e) => e.status === 'pending')).toBe(true);
    });

    it('filters by publication slug', async () => {
      await clearQueue();

      const withPub = makeEntry({
        idea: 'With pub',
        publication: { name: 'Test Pub', slug: 'test-pub', editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' }, defaults: {} },
      });
      const withoutPub = makeEntry({ idea: 'Without pub' });
      await saveQueueEntry(withPub);
      await saveQueueEntry(withoutPub);

      const filtered = await listQueueEntries({ publicationSlug: 'test-pub' });
      expect(filtered.length).toBe(1);
      expect(filtered[0]!.idea).toBe('With pub');
    });
  });

  describe('getNextPendingEntry', () => {
    it('returns the oldest pending entry', async () => {
      await clearQueue();

      const entry1 = makeEntry({ idea: 'Older', addedAt: '2025-01-01T00:00:00.000Z' });
      const entry2 = makeEntry({ idea: 'Newer', addedAt: '2025-01-02T00:00:00.000Z' });
      await saveQueueEntry(entry1);
      await saveQueueEntry(entry2);

      const next = await getNextPendingEntry();
      expect(next).toBeTruthy();
      expect(next!.idea).toBe('Older');
    });

    it('returns null when queue is empty', async () => {
      await clearQueue();
      const next = await getNextPendingEntry();
      expect(next).toBeNull();
    });

    it('filters by publication slug', async () => {
      await clearQueue();

      const withPub = makeEntry({
        idea: 'Pub article',
        publication: { name: 'My Pub', slug: 'my-pub', editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' }, defaults: {} },
        addedAt: '2025-01-01T00:00:00.000Z',
      });
      const other = makeEntry({ idea: 'Other article', addedAt: '2025-01-02T00:00:00.000Z' });
      await saveQueueEntry(withPub);
      await saveQueueEntry(other);

      const next = await getNextPendingEntry({ publicationSlug: 'my-pub' });
      expect(next).toBeTruthy();
      expect(next!.idea).toBe('Pub article');
    });
  });

  describe('claimNextPendingEntry', () => {
    it('atomically renames to in-progress and returns claimed entry', async () => {
      await clearQueue();

      const entry = makeEntry({ idea: 'Claim me' });
      await saveQueueEntry(entry);

      const claimed = await claimNextPendingEntry();
      expect(claimed).toBeTruthy();
      expect(claimed!.id).toBe(entry.id);
      expect(claimed!.status).toBe('in-progress');
      expect(claimed!.startedAt).toBeTruthy();

      // Original pending file should be gone
      const reloaded = await loadQueueEntry(entry.id);
      expect(reloaded).toBeTruthy();
      expect(reloaded!.status).toBe('in-progress');
    });

    it('returns null when no pending entries exist', async () => {
      await clearQueue();
      const claimed = await claimNextPendingEntry();
      expect(claimed).toBeNull();
    });

    it('skips entries that were claimed by another process', async () => {
      await clearQueue();

      const entry = makeEntry({ idea: 'Race' });
      await saveQueueEntry(entry);

      // Simulate another process claiming it by renaming
      const { rename } = await import('node:fs/promises');
      const pendingPath = path.join(getQueueDir(), `${entry.id}.json`);
      const inProgressPath = path.join(getQueueDir(), `${entry.id}.in-progress.json`);
      await rename(pendingPath, inProgressPath);

      // Our claim should fail gracefully
      const claimed = await claimNextPendingEntry();
      expect(claimed).toBeNull();
    });
  });

  describe('revertClaimedEntry', () => {
    it('renames back to pending and resets status', async () => {
      await clearQueue();

      const entry = makeEntry({ idea: 'Revert me' });
      await saveQueueEntry(entry);

      const claimed = await claimNextPendingEntry();
      expect(claimed).toBeTruthy();

      await revertClaimedEntry(claimed!);

      const reverted = await loadQueueEntry(entry.id);
      expect(reverted).toBeTruthy();
      expect(reverted!.status).toBe('pending');
      expect(reverted!.startedAt).toBeUndefined();
    });
  });

  describe('deleteQueueEntry', () => {
    it('deletes a pending entry', async () => {
      await clearQueue();

      const entry = makeEntry({ idea: 'Delete me' });
      await saveQueueEntry(entry);

      await deleteQueueEntry(entry.id);
      const loaded = await loadQueueEntry(entry.id);
      expect(loaded).toBeNull();
    });

    it('throws for non-existent entry', async () => {
      await expect(deleteQueueEntry('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('clearQueue', () => {
    it('deletes all queue files and returns count', async () => {
      await saveQueueEntry(makeEntry({ idea: 'A' }));
      await saveQueueEntry(makeEntry({ idea: 'B' }));

      const count = await clearQueue();
      expect(count).toBeGreaterThanOrEqual(2);

      const entries = await listQueueEntries();
      expect(entries.length).toBe(0);
    });
  });

  describe('deleteClaimedEntry', () => {
    it('deletes an in-progress entry file', async () => {
      await clearQueue();

      const entry = makeEntry({ idea: 'Claimed to delete' });
      await saveQueueEntry(entry);
      await claimNextPendingEntry();

      await deleteClaimedEntry(entry.id);

      const loaded = await loadQueueEntry(entry.id);
      expect(loaded).toBeNull();
    });

    it('does not throw for non-existent in-progress file', async () => {
      await expect(deleteClaimedEntry('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('queueEntryExists', () => {
    it('returns true for existing pending entry', async () => {
      await clearQueue();

      const entry = makeEntry({ idea: 'Exists' });
      await saveQueueEntry(entry);

      expect(await queueEntryExists(entry.id)).toBe(true);
    });

    it('returns true for in-progress entry', async () => {
      await clearQueue();

      const entry = makeEntry({ idea: 'Exists in-progress' });
      await saveQueueEntry(entry);
      await claimNextPendingEntry();

      expect(await queueEntryExists(entry.id)).toBe(true);
    });

    it('returns false for non-existent entry', async () => {
      expect(await queueEntryExists('non-existent')).toBe(false);
    });
  });

  describe('queueEntrySchema', () => {
    it('parses minimal entry', () => {
      const result = queueEntrySchema.parse({
        id: 'test-id',
        status: 'pending',
        idea: 'Test idea',
        settings: defaultAppSettings,
        addedAt: '2025-01-01T00:00:00.000Z',
      });
      expect(result.id).toBe('test-id');
      expect(result.status).toBe('pending');
      expect(result.publication).toBeNull();
      expect(result.series).toBeNull();
      expect(result.job).toBeNull();
    });

    it('parses full entry with publication and series', () => {
      const result = queueEntrySchema.parse({
        id: 'test-id',
        status: 'pending',
        idea: 'Full entry',
        settings: defaultAppSettings,
        addedAt: '2025-01-01T00:00:00.000Z',
        publication: { name: 'Pub', slug: 'pub', editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' }, defaults: {} },
        series: { name: 'Series', slug: 'series', topic: '', editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' }, defaults: {} },
        exportPath: './out',
        targetAudienceHint: 'Developers',
      });
      expect(result.publication!.slug).toBe('pub');
      expect(result.series!.slug).toBe('series');
      expect(result.exportPath).toBe('./out');
      expect(result.targetAudienceHint).toBe('Developers');
    });

    it('rejects empty idea', () => {
      expect(() => queueEntrySchema.parse({
        id: 'test-id',
        status: 'pending',
        idea: '',
        settings: defaultAppSettings,
        addedAt: '2025-01-01T00:00:00.000Z',
      })).toThrow();
    });

    it('rejects invalid status', () => {
      expect(() => queueEntrySchema.parse({
        id: 'test-id',
        status: 'completed',
        idea: 'Test',
        settings: defaultAppSettings,
        addedAt: '2025-01-01T00:00:00.000Z',
      })).toThrow();
    });
  });
});
