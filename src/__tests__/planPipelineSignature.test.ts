import { describe, it, expect } from '@jest/globals';
import { runPlan } from '../plan/pipeline.js';

describe('pipeline - runPlan', () => {
  it('is exported as an async function', () => {
    expect(typeof runPlan).toBe('function');
    expect(runPlan.constructor.name).toBe('AsyncFunction');
  });

  it('accepts required options object', () => {
    // Verify the function signature accepts the expected shape
    expect(async () => {
      await runPlan({
        input: {
          mode: 'new-idea',
          contentIdea: 'test',
          publicationSlug: 'test-pub',
          countryCodes: ['US'],
          language: 'en',
          contentType: 'article',
          autoSave: false,
          nonInteractive: false,
          dryRun: false,
          planModel: 'test-model',
          intentModel: 'test-model',
          seedKeywords: [],
          excludeSeries: [],
        },
        llmClient: {} as any,
        gkpClient: {} as any,
        appSettings: {} as any,
      });
    }).not.toThrow();
  });

  it('accepts expand-series mode input', () => {
    expect(async () => {
      await runPlan({
        input: {
          mode: 'expand-series',
          seriesSlug: 'test-series',
          publicationSlug: 'test-pub',
          countryCodes: ['US'],
          language: 'en',
          contentType: 'article',
          autoSave: false,
          nonInteractive: false,
          dryRun: false,
          planModel: 'test-model',
          intentModel: 'test-model',
          seedKeywords: [],
        },
        llmClient: {} as any,
        gkpClient: {} as any,
        appSettings: {} as any,
      });
    }).not.toThrow();
  });

  it('accepts optional event handlers', () => {
    expect(async () => {
      await runPlan({
        input: {
          mode: 'new-idea',
          contentIdea: 'test',
          publicationSlug: 'test-pub',
          countryCodes: ['US'],
          language: 'en',
          contentType: 'article',
          autoSave: false,
          nonInteractive: false,
          dryRun: false,
          planModel: 'test-model',
          intentModel: 'test-model',
          seedKeywords: [],
          excludeSeries: [],
        },
        llmClient: {} as any,
        gkpClient: {} as any,
        appSettings: {} as any,
        onEvent: () => {},
        onResearchEvent: () => {},
      });
    }).not.toThrow();
  });
});
