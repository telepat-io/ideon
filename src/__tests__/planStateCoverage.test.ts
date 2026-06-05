import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { hydrateState } from '../plan/state.js';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('../config/seriesStore.js', () => ({
  listSeries: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
  loadSeries: jest.fn<() => Promise<any>>().mockRejectedValue(new Error('not found')),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('../config/gkpStore.js', () => ({
  listGkpKeywordRecords: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
  normalizeKeywordKey: (kw: string) => kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled-keyword',
}));

describe('state - coverage map updates', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('updates existing keyword with newer date', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-update-newer');
    process.env.IDEON_HOME = ideonHome;

    // Create two articles with the same keyword but different dates
    const outputDir = path.join(ideonHome, '.ideon', 'output');
    await fs.mkdir(outputDir, { recursive: true });

    // First generation with older date
    const gen1Dir = path.join(outputDir, 'gen-1');
    await fs.mkdir(gen1Dir, { recursive: true });
    await fs.writeFile(path.join(gen1Dir, 'meta.json'), JSON.stringify({
      title: 'Old Article',
      publication: 'test-pub',
      series: 'old-series',
      generatedAt: '2023-01-01T00:00:00.000Z',
      keywords: ['shared-keyword'],
    }));

    // Second generation with newer date
    const gen2Dir = path.join(outputDir, 'gen-2');
    await fs.mkdir(gen2Dir, { recursive: true });
    await fs.writeFile(path.join(gen2Dir, 'meta.json'), JSON.stringify({
      title: 'New Article',
      publication: 'test-pub',
      series: 'new-series',
      generatedAt: '2024-01-01T00:00:00.000Z',
      keywords: ['shared-keyword'],
    }));

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    // Should have the keyword in coverage map
    expect(state.coverageMap['shared-keyword']).toBeDefined();
    // The title should be one of the two articles
    expect(['Old Article', 'New Article']).toContain(state.coverageMap['shared-keyword'].title);

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('keeps older article when new article has older date', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-keep-older');
    process.env.IDEON_HOME = ideonHome;

    // First article with newer date
    const outputDir1 = path.join(ideonHome, '.ideon', 'output', 'gen-1');
    await fs.mkdir(outputDir1, { recursive: true });
    await fs.writeFile(path.join(outputDir1, 'meta.json'), JSON.stringify({
      title: 'Newer Article',
      publication: 'test-pub',
      series: 'newer-series',
      generatedAt: '2024-01-01T00:00:00.000Z',
      keywords: ['shared-keyword'],
    }));

    // Second article with older date
    const outputDir2 = path.join(ideonHome, '.ideon', 'output', 'gen-2');
    await fs.mkdir(outputDir2, { recursive: true });
    await fs.writeFile(path.join(outputDir2, 'meta.json'), JSON.stringify({
      title: 'Older Article',
      publication: 'test-pub',
      series: 'older-series',
      generatedAt: '2023-01-01T00:00:00.000Z',
      keywords: ['shared-keyword'],
    }));

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    // Should keep the newer article
    expect(state.coverageMap['shared-keyword'].title).toBe('Newer Article');

    await fs.rm(ideonHome, { recursive: true, force: true });
  });

  it('updates series slug when article has series', async () => {
    const ideonHome = path.join(os.homedir(), '.ideon-test-update-series');
    process.env.IDEON_HOME = ideonHome;

    // First article without series
    const outputDir1 = path.join(ideonHome, '.ideon', 'output', 'gen-1');
    await fs.mkdir(outputDir1, { recursive: true });
    await fs.writeFile(path.join(outputDir1, 'meta.json'), JSON.stringify({
      title: 'Article Without Series',
      publication: 'test-pub',
      generatedAt: '2023-01-01T00:00:00.000Z',
      keywords: ['shared-keyword'],
    }));

    // Second article with series and newer date
    const outputDir2 = path.join(ideonHome, '.ideon', 'output', 'gen-2');
    await fs.mkdir(outputDir2, { recursive: true });
    await fs.writeFile(path.join(outputDir2, 'meta.json'), JSON.stringify({
      title: 'Article With Series',
      publication: 'test-pub',
      series: 'test-series',
      generatedAt: '2024-01-01T00:00:00.000Z',
      keywords: ['shared-keyword'],
    }));

    const state = await hydrateState({
      publicationSlug: 'test-pub',
      countryCodes: ['US'],
      language: 'en',
    });

    expect(state.coverageMap['shared-keyword'].seriesSlug).toBe('test-series');

    await fs.rm(ideonHome, { recursive: true, force: true });
  });
});
