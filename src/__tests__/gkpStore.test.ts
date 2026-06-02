import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-gkp-store-test-'));
const tempConfigDir = path.join(tempRoot, 'config');

jest.unstable_mockModule('env-paths', () => ({
  default: () => ({ config: tempConfigDir }),
}));

const {
  computeGkpFingerprint,
  getGkpDir,
  getGkpQueriesDir,
  getGkpKeywordsDir,
  isGkpQuerySnapshotFresh,
  listGkpKeywordRecords,
  listGkpQuerySnapshots,
  loadGkpKeywordRecord,
  loadGkpQuerySnapshot,
  normalizeKeywordKey,
  saveGkpKeywordRecord,
  saveGkpQuerySnapshot,
} = await import('../config/gkpStore.js');

afterAll(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe('gkpStore', () => {
  beforeEach(async () => {
    await rm(tempConfigDir, { recursive: true, force: true });
  });

  it('uses a config-backed gkp directory', () => {
    expect(getGkpDir()).toBe(path.join(tempConfigDir, 'gkp'));
    expect(getGkpQueriesDir()).toBe(path.join(tempConfigDir, 'gkp', 'queries'));
    expect(getGkpKeywordsDir()).toBe(path.join(tempConfigDir, 'gkp', 'keywords'));
  });

  it('computes stable fingerprints for the same logical input', () => {
    const first = computeGkpFingerprint({ mode: 'ideas', keywords: ['seo'], publication: 'tech-blog' });
    const second = computeGkpFingerprint({ publication: 'tech-blog', keywords: ['seo'], mode: 'ideas' });
    expect(first).toBe(second);
  });

  it('normalizes keyword keys for filenames', () => {
    expect(normalizeKeywordKey('Content Strategy for SaaS')).toBe('content-strategy-for-saas');
  });

  it('saves and loads query snapshots', async () => {
    const snapshot = await saveGkpQuerySnapshot({
      fingerprint: 'fp-1',
      mode: 'ideas',
      savedAt: '2026-06-03T12:00:00.000Z',
      ttlDays: 30,
      publication: 'tech-blog',
      series: 'seo-playbooks',
      keywords: ['content strategy'],
      countryCodes: ['US'],
      language: 'en',
      count: 2,
      response: { ideas: [{ text: 'content strategy' }], count: 1 },
    });

    const loaded = await loadGkpQuerySnapshot(snapshot.fingerprint);
    expect(loaded).toEqual(snapshot);
  });

  it('filters query snapshots by publication, series, search, and freshness', async () => {
    await saveGkpQuerySnapshot({
      fingerprint: 'fresh-fp',
      mode: 'ideas',
      savedAt: '2026-06-03T12:00:00.000Z',
      ttlDays: 30,
      publication: 'tech-blog',
      series: 'seo-playbooks',
      keywords: ['content strategy'],
      count: 1,
      response: { ideas: [], count: 0 },
    });
    await saveGkpQuerySnapshot({
      fingerprint: 'stale-fp',
      mode: 'historical',
      savedAt: '2026-01-01T00:00:00.000Z',
      ttlDays: 30,
      publication: 'docs-blog',
      series: 'api-guides',
      keywords: ['api design'],
      count: 1,
      response: { keywords: [], count: 0 },
    });

    const publicationFiltered = await listGkpQuerySnapshots({ publication: 'tech-blog' });
    expect(publicationFiltered).toHaveLength(1);
    expect(publicationFiltered[0]!.fingerprint).toBe('fresh-fp');

    const searchFiltered = await listGkpQuerySnapshots({ search: 'api design' });
    expect(searchFiltered).toHaveLength(1);
    expect(searchFiltered[0]!.fingerprint).toBe('stale-fp');

    const freshOnly = await listGkpQuerySnapshots({ freshOnly: true, now: new Date('2026-06-04T00:00:00.000Z') });
    expect(freshOnly).toHaveLength(1);
    expect(freshOnly[0]!.fingerprint).toBe('fresh-fp');

    const staleOnly = await listGkpQuerySnapshots({ staleOnly: true, now: new Date('2026-06-04T00:00:00.000Z') });
    expect(staleOnly).toHaveLength(1);
    expect(staleOnly[0]!.fingerprint).toBe('stale-fp');
  });

  it('reports freshness correctly', () => {
    const fresh = isGkpQuerySnapshotFresh({
      version: 1,
      fingerprint: 'fp',
      mode: 'ideas',
      savedAt: '2026-06-01T00:00:00.000Z',
      ttlDays: 30,
      count: 0,
      response: {},
    }, new Date('2026-06-15T00:00:00.000Z'));
    const stale = isGkpQuerySnapshotFresh({
      version: 1,
      fingerprint: 'fp',
      mode: 'ideas',
      savedAt: '2026-01-01T00:00:00.000Z',
      ttlDays: 30,
      count: 0,
      response: {},
    }, new Date('2026-06-15T00:00:00.000Z'));

    expect(fresh).toBe(true);
    expect(stale).toBe(false);
  });

  it('saves and loads keyword records', async () => {
    const record = await saveGkpKeywordRecord({
      normalizedKeyword: 'content-strategy',
      keyword: 'Content Strategy',
      savedAt: '2026-06-03T12:00:00.000Z',
      publication: 'tech-blog',
      series: 'seo-playbooks',
      avgMonthlySearches: 100,
      competition: 'LOW',
      sourceQueries: ['fp-1'],
    });

    const loaded = await loadGkpKeywordRecord('content-strategy');
    expect(loaded).toEqual(record);
  });

  it('filters keyword records by publication, series, and search', async () => {
    await saveGkpKeywordRecord({
      normalizedKeyword: 'content-strategy',
      keyword: 'Content Strategy',
      savedAt: '2026-06-03T12:00:00.000Z',
      publication: 'tech-blog',
      series: 'seo-playbooks',
      sourceQueries: ['fp-1'],
    });
    await saveGkpKeywordRecord({
      normalizedKeyword: 'api-design',
      keyword: 'API Design',
      savedAt: '2026-06-02T12:00:00.000Z',
      publication: 'docs-blog',
      series: 'api-guides',
      sourceQueries: ['fp-2'],
    });

    const filtered = await listGkpKeywordRecords({ publication: 'tech-blog' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.normalizedKeyword).toBe('content-strategy');

    const searched = await listGkpKeywordRecords({ search: 'api' });
    expect(searched).toHaveLength(1);
    expect(searched[0]!.normalizedKeyword).toBe('api-design');
  });
});