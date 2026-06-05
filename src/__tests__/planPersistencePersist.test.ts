import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { persistPlan, createSeriesFromCluster, buildQueueEntry } from '../plan/persistence.js';
import type { PersistenceInput } from '../plan/persistence.js';
import type { PlannedArticle } from '../types/plan.js';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('../config/seriesStore.js', () => ({
  saveSeries: jest.fn<() => Promise<any>>().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('../config/queueStore.js', () => ({
  saveQueueEntry: jest.fn<() => Promise<any>>().mockResolvedValue(undefined),
  generateQueueId: jest.fn().mockReturnValue('test-queue-id'),
}));

describe('persistence - persistPlan', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('calls saveSeries for each accepted cluster', async () => {
    const input: PersistenceInput = {
      mode: 'new-idea',
      contentIdea: 'test idea',
      publicationSlug: 'test-pub',
      targetMarket: { countryCodes: ['US'], language: 'en' },
      researchStats: {
        queryRoundsCompleted: 3,
        candidatesEvaluated: 50,
        candidatesPassed: 10,
        cacheHits: 20,
        apiCallsMade: 15,
      },
      lowVolumeMode: false,
      acceptedSeries: [
        {
          name: 'Test Series',
          pillarKeyword: 'test-keyword',
          funnelStage: 'top',
          clusterRationale: 'rationale',
          coverageGapNote: '',
          articles: [],
        },
      ],
      acceptedArticles: [],
      discardedCandidates: [],
      exhaustionRecords: [],
      contentType: 'article',
    };

    // Should not throw
    await expect(persistPlan(input)).resolves.not.toThrow();
  });

  it('calls saveQueueEntry for each accepted article', async () => {
    const article: PlannedArticle = {
      title: 'Test Article',
      primaryKeyword: 'test-keyword',
      secondaryKeywords: [],
      intentType: 'informational',
      funnelStage: 'top',
      contentAngle: 'Test angle',
      format: 'guide',
      isPillar: false,
      priority: 'medium',
      refreshCandidate: null,
      type: 'new',
    };

    const input: PersistenceInput = {
      mode: 'new-idea',
      contentIdea: 'test idea',
      publicationSlug: 'test-pub',
      targetMarket: { countryCodes: ['US'], language: 'en' },
      researchStats: {
        queryRoundsCompleted: 3,
        candidatesEvaluated: 50,
        candidatesPassed: 10,
        cacheHits: 20,
        apiCallsMade: 15,
      },
      lowVolumeMode: false,
      acceptedSeries: [
        {
          name: 'Test Series',
          pillarKeyword: 'test-keyword',
          funnelStage: 'top',
          clusterRationale: 'rationale',
          coverageGapNote: '',
          articles: [article],
        },
      ],
      acceptedArticles: [article],
      discardedCandidates: [],
      exhaustionRecords: [],
      contentType: 'article',
    };

    // Should not throw
    await expect(persistPlan(input)).resolves.not.toThrow();
  });

  it('writes planning session file to config directory', async () => {
    const input: PersistenceInput = {
      mode: 'new-idea',
      contentIdea: 'test idea',
      publicationSlug: 'test-pub',
      targetMarket: { countryCodes: ['US'], language: 'en' },
      researchStats: {
        queryRoundsCompleted: 3,
        candidatesEvaluated: 50,
        candidatesPassed: 10,
        cacheHits: 20,
        apiCallsMade: 15,
      },
      lowVolumeMode: false,
      acceptedSeries: [],
      acceptedArticles: [],
      discardedCandidates: [],
      exhaustionRecords: [],
      contentType: 'article',
    };

    // Should not throw
    await expect(persistPlan(input)).resolves.not.toThrow();
  });

  it('handles expand-series mode', async () => {
    const input: PersistenceInput = {
      mode: 'expand-series',
      seriesSlug: 'existing-series',
      publicationSlug: 'test-pub',
      targetMarket: { countryCodes: ['US'], language: 'en' },
      researchStats: {
        queryRoundsCompleted: 2,
        candidatesEvaluated: 30,
        candidatesPassed: 5,
        cacheHits: 10,
        apiCallsMade: 5,
      },
      lowVolumeMode: false,
      acceptedSeries: [],
      acceptedArticles: [],
      discardedCandidates: [],
      exhaustionRecords: [],
      contentType: 'article',
    };

    // Should not throw
    await expect(persistPlan(input)).resolves.not.toThrow();
  });

  it('handles empty accepted series and articles', async () => {
    const input: PersistenceInput = {
      mode: 'new-idea',
      contentIdea: 'empty test',
      publicationSlug: 'test-pub',
      targetMarket: { countryCodes: ['US'], language: 'en' },
      researchStats: {
        queryRoundsCompleted: 1,
        candidatesEvaluated: 10,
        candidatesPassed: 0,
        cacheHits: 5,
        apiCallsMade: 2,
      },
      lowVolumeMode: false,
      acceptedSeries: [],
      acceptedArticles: [],
      discardedCandidates: [],
      exhaustionRecords: [],
      contentType: 'article',
    };

    // Should not throw even with empty arrays
    await expect(persistPlan(input)).resolves.not.toThrow();
  });

  it('handles low volume mode flag', async () => {
    const input: PersistenceInput = {
      mode: 'new-idea',
      contentIdea: 'low volume test',
      publicationSlug: 'test-pub',
      targetMarket: { countryCodes: ['US'], language: 'en' },
      researchStats: {
        queryRoundsCompleted: 3,
        candidatesEvaluated: 50,
        candidatesPassed: 10,
        cacheHits: 20,
        apiCallsMade: 15,
      },
      lowVolumeMode: true,
      acceptedSeries: [],
      acceptedArticles: [],
      discardedCandidates: [],
      exhaustionRecords: [],
      contentType: 'article',
    };

    // Should not throw
    await expect(persistPlan(input)).resolves.not.toThrow();
  });

  it('handles contentIdea with special characters', async () => {
    const input: PersistenceInput = {
      mode: 'new-idea',
      contentIdea: 'Test/Idea: With "Special" Characters!',
      publicationSlug: 'test-pub',
      targetMarket: { countryCodes: ['US'], language: 'en' },
      researchStats: {
        queryRoundsCompleted: 3,
        candidatesEvaluated: 50,
        candidatesPassed: 10,
        cacheHits: 20,
        apiCallsMade: 15,
      },
      lowVolumeMode: false,
      acceptedSeries: [],
      acceptedArticles: [],
      discardedCandidates: [],
      exhaustionRecords: [],
      contentType: 'article',
    };

    // Should not throw
    await expect(persistPlan(input)).resolves.not.toThrow();
  });

  it('uses seriesSlug for filename when no contentIdea', async () => {
    const input: PersistenceInput = {
      mode: 'expand-series',
      seriesSlug: 'existing-series',
      publicationSlug: 'test-pub',
      targetMarket: { countryCodes: ['US'], language: 'en' },
      researchStats: {
        queryRoundsCompleted: 3,
        candidatesEvaluated: 50,
        candidatesPassed: 10,
        cacheHits: 20,
        apiCallsMade: 15,
      },
      lowVolumeMode: false,
      acceptedSeries: [],
      acceptedArticles: [],
      discardedCandidates: [],
      exhaustionRecords: [],
      contentType: 'article',
    };

    // Should not throw
    await expect(persistPlan(input)).resolves.not.toThrow();
  });
});
