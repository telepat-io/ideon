import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { hydrateState, loadSeriesKeywords } from '../plan/state.js';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

jest.mock('../config/seriesStore.js', () => ({
  listSeries: jest.fn().mockResolvedValue([]),
  loadSeries: jest.fn().mockRejectedValue(new Error('not found')),
}));

jest.mock('../config/gkpStore.js', () => ({
  listGkpKeywordRecords: jest.fn().mockResolvedValue([]),
  normalizeKeywordKey: (kw: string) => kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled-keyword',
}));

describe('state - hydrateState', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('builds coverage map from existing articles', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-coverage');
    process.env.IDEON_HOME = ideonHome;

    const outputDir = path.join(ideonHome, '.ideon', 'output', 'test-gen');
    await fs.mkdir(outputDir, { recursive: true });

    const metaJson = {
      title: 'Test Article',
      publication: 'test-pub',
      series: 'test-series',
      generatedAt: '2024-01-01T00:00:00.000Z',
      keywords: ['test-keyword', 'another-keyword'],
    };

    await fs.writeFile(path.join(outputDir, 'meta.json'), JSON.stringify(metaJson));

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.coverageMap['test-keyword']).toBeDefined();
    expect(state.coverageMap['test-keyword'].title).toBe('Test Article');
    expect(state.coverageMap['test-keyword'].seriesSlug).toBe('test-series');

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('ignores articles from other publications', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-filter');
    process.env.IDEON_HOME = ideonHome;

    const outputDir = path.join(ideonHome, '.ideon', 'output', 'other-gen');
    await fs.mkdir(outputDir, { recursive: true });

    const metaJson = {
      title: 'Other Article',
      publication: 'other-pub',
      series: 'other-series',
      generatedAt: '2024-01-01T00:00:00.000Z',
      keywords: ['other-keyword'],
    };

    await fs.writeFile(path.join(outputDir, 'meta.json'), JSON.stringify(metaJson));

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.coverageMap['other-keyword']).toBeUndefined();

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('handles missing output directory', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-missing');
    process.env.IDEON_HOME = ideonHome;

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.coverageMap).toEqual({});

    await fs.rm(ideonHome, { recursive: true, force: true }).catch(() => {});
  });

  it('handles missing planning sessions directory', async () => {
    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    // Should not crash even if directory doesn't exist
    expect(state.exhaustionMap).toBeDefined();
    expect(state.exhaustionMap).toEqual({});
  });

  it('handles malformed planning session files', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-malformed');
    process.env.IDEON_HOME = ideonHome;

    const configDir = path.join(ideonHome, '.ideon', 'config', 'planning-sessions');
    await fs.mkdir(configDir, { recursive: true });

    await fs.writeFile(
      path.join(configDir, 'malformed.json'),
      'not valid json',
    );

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.exhaustionMap).toEqual({});

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('skips non-JSON files in planning sessions directory', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-non-json');
    process.env.IDEON_HOME = ideonHome;

    const configDir = path.join(ideonHome, '.ideon', 'config', 'planning-sessions');
    await fs.mkdir(configDir, { recursive: true });

    await fs.writeFile(
      path.join(configDir, 'readme.txt'),
      'not a session file',
    );

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.exhaustionMap).toEqual({});

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('skips directories in planning sessions directory', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-subdir');
    process.env.IDEON_HOME = ideonHome;

    const configDir = path.join(ideonHome, '.ideon', 'config', 'planning-sessions');
    await fs.mkdir(configDir, { recursive: true });
    await fs.mkdir(path.join(configDir, 'subdir'), { recursive: true });

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.exhaustionMap).toEqual({});

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('handles articles without generatedAt', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-no-date');
    process.env.IDEON_HOME = ideonHome;

    const outputDir = path.join(ideonHome, '.ideon', 'output', 'no-date-gen');
    await fs.mkdir(outputDir, { recursive: true });

    const metaJson = {
      title: 'Article Without Date',
      publication: 'test-pub',
      keywords: ['no-date-keyword'],
    };

    await fs.writeFile(path.join(outputDir, 'meta.json'), JSON.stringify(metaJson));

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.coverageMap['no-date-keyword']).toBeDefined();
    expect(state.coverageMap['no-date-keyword'].ageMonths).toBe(0);

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('handles articles without series', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-no-series');
    process.env.IDEON_HOME = ideonHome;

    const outputDir = path.join(ideonHome, '.ideon', 'output', 'no-series-gen');
    await fs.mkdir(outputDir, { recursive: true });

    const metaJson = {
      title: 'Article Without Series',
      publication: 'test-pub',
      keywords: ['no-series-keyword'],
    };

    await fs.writeFile(path.join(outputDir, 'meta.json'), JSON.stringify(metaJson));

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.coverageMap['no-series-keyword']).toBeDefined();
    expect(state.coverageMap['no-series-keyword'].seriesSlug).toBe('');

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('handles articles without keywords', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-no-kw');
    process.env.IDEON_HOME = ideonHome;

    const outputDir = path.join(ideonHome, '.ideon', 'output', 'no-kw-gen');
    await fs.mkdir(outputDir, { recursive: true });

    const metaJson = {
      title: 'Article Without Keywords',
      publication: 'test-pub',
    };

    await fs.writeFile(path.join(outputDir, 'meta.json'), JSON.stringify(metaJson));

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(Object.keys(state.coverageMap).length).toBe(0);

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('handles invalid meta.json', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-invalid-meta');
    process.env.IDEON_HOME = ideonHome;

    const outputDir = path.join(ideonHome, '.ideon', 'output', 'invalid-meta-gen');
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(path.join(outputDir, 'meta.json'), 'not valid json');

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.coverageMap).toEqual({});

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('handles meta.json without publication field', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-no-pub');
    process.env.IDEON_HOME = ideonHome;

    const outputDir = path.join(ideonHome, '.ideon', 'output', 'no-pub-gen');
    await fs.mkdir(outputDir, { recursive: true });

    const metaJson = {
      title: 'Article Without Publication',
      keywords: ['no-pub-keyword'],
    };

    await fs.writeFile(path.join(outputDir, 'meta.json'), JSON.stringify(metaJson));

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.coverageMap).toEqual({});

    await fs.rm(ideonHome, { recursive: true, force: true });
  });
});

describe('state - loadSeriesKeywords', () => {
  it('returns empty array when series not found', async () => {
    const result = await loadSeriesKeywords('non-existent');
    expect(result).toEqual([]);
  });
});
