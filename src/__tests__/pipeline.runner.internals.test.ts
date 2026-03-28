import { __testInternals } from '../pipeline/runner.js';
import type { StageViewModel } from '../pipeline/events.js';

describe('pipeline runner internals', () => {
  it('records stage timing, retries, costs, and snapshots analytics for missing/existing stages', () => {
    const tracking = new Map<string, {
      startedAtMs: number;
      endedAtMs: number | null;
      retries: number;
      costs: Array<number | null>;
      costSources: Array<'provider' | 'estimated' | 'unavailable'>;
    }>();

    expect(__testInternals.snapshotStageAnalytics(tracking, 'missing')).toBeUndefined();

    __testInternals.markStageStarted(tracking, 'stage-a');
    __testInternals.addStageRetries(tracking, 'stage-a', 2);
    __testInternals.recordStageCost(tracking, 'stage-a', 0.42, 'provider');
    __testInternals.markStageCompleted(tracking, 'stage-a');

    const snapshot = __testInternals.snapshotStageAnalytics(tracking, 'stage-a');
    expect(snapshot).toEqual(
      expect.objectContaining({
        costUsd: 0.42,
        costSource: 'provider',
      }),
    );

    // markStageCompleted should create and close unknown stages as well.
    __testInternals.markStageCompleted(tracking, 'stage-b');
    expect(__testInternals.snapshotStageAnalytics(tracking, 'stage-b')).toBeDefined();
  });

  it('records LLM metrics into stage tracking', () => {
    const tracking = new Map<string, {
      startedAtMs: number;
      endedAtMs: number | null;
      retries: number;
      costs: Array<number | null>;
      costSources: Array<'provider' | 'estimated' | 'unavailable'>;
    }>();

    __testInternals.recordLlmMetrics(tracking, 'llm-stage', {
      durationMs: 10,
      attempts: 1,
      retries: 1,
      retryBackoffMs: 200,
      modelId: 'moonshotai/kimi-k2.5',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        providerTotalCostUsd: null,
      },
    });

    const snapshot = __testInternals.snapshotStageAnalytics(tracking, 'llm-stage');
    expect(snapshot).toBeDefined();
    expect(snapshot?.costSource).toBe('estimated');
  });

  it('maps section phase identifiers correctly', () => {
    expect(__testInternals.toSectionItemId('intro')).toBe('sections:intro');
    expect(__testInternals.toSectionItemId('outro')).toBe('sections:outro');
    expect(__testInternals.toSectionItemId('section', 2)).toBe('sections:section-3');
    expect(__testInternals.toSectionItemId('section')).toBeNull();
  });

  it('maps section labels to item ids and rejects unknown labels', () => {
    expect(__testInternals.toSectionItemIdFromLabel('Writing introduction')).toBe('sections:intro');
    expect(__testInternals.toSectionItemIdFromLabel('Writing conclusion')).toBe('sections:outro');
    expect(__testInternals.toSectionItemIdFromLabel('Writing section 2/4: Body')).toBe('sections:section-2');
    expect(__testInternals.toSectionItemIdFromLabel('Random status message')).toBeNull();
  });

  it('transitions section items from running to succeeded while starting the next item', () => {
    const items = [
      { id: 'sections:intro', label: 'Intro', status: 'running' as const, detail: 'Generating content.' },
      { id: 'sections:section-1', label: 'Section 1', status: 'pending' as const, detail: 'Waiting to start.' },
    ];
    const tracking = new Map<string, { startedAtMs: number; endedAtMs: number | null; retries: number; costs: Array<number | null>; costSources: Array<'provider' | 'estimated' | 'unavailable'> }>();
    tracking.set('sections:intro', {
      startedAtMs: Date.now() - 10,
      endedAtMs: null,
      retries: 0,
      costs: [null],
      costSources: ['estimated'],
    });

    const next = __testInternals.applySectionItemTransition(items, 'sections:section-1', tracking);

    expect(next[0]?.status).toBe('succeeded');
    expect(next[1]?.status).toBe('running');
    expect(tracking.get('sections:intro')?.endedAtMs).not.toBeNull();
    expect(tracking.get('sections:section-1')).toBeDefined();
  });

  it('formats output labels and ids', () => {
    expect(__testInternals.toOutputItemId('x', 2)).toBe('x-2');
    expect(__testInternals.formatOutputItemLabel('landing-page-copy', 1, 3)).toBe('landing page copy 1/3');
  });

  it('requires non-empty secrets', () => {
    expect(() => __testInternals.requireSecret('', 'Token')).toThrow('Missing Token');
    expect(__testInternals.requireSecret('secret', 'Token')).toBe('secret');
  });

  it('marks the first running stage as failed and returns typed stage id', () => {
    const stages: StageViewModel[] = [
      { id: 'planning', title: 'Planning', status: 'running', detail: 'in progress' },
      { id: 'output', title: 'Output', status: 'pending', detail: 'waiting' },
    ];

    const stageId = __testInternals.markRunningStageFailed(stages, 'failure');
    expect(stageId).toBe('planning');
    expect(stages[0]?.status).toBe('failed');
    expect(stages[0]?.detail).toBe('failure');

    const noRunning: StageViewModel[] = [
      { id: 'custom-stage', title: 'Custom', status: 'pending', detail: 'waiting' },
    ];
    expect(__testInternals.markRunningStageFailed(noRunning, 'x')).toBeNull();
  });

  it('expands requested outputs, keeps per-prefix indices, and defaults when empty', () => {
    const expanded = __testInternals.expandRequestedOutputs([
      { contentType: 'x-thread', count: 2 },
      { contentType: 'x-post', count: 1 },
      { contentType: 'blog-post', count: 1 },
    ]);

    expect(expanded).toEqual([
      { contentType: 'x-thread', filePrefix: 'x-thread', index: 1, outputCountForType: 2 },
      { contentType: 'x-thread', filePrefix: 'x-thread', index: 2, outputCountForType: 2 },
      { contentType: 'x-post', filePrefix: 'x-post', index: 1, outputCountForType: 1 },
      { contentType: 'blog-post', filePrefix: 'blog', index: 1, outputCountForType: 1 },
    ]);

    expect(__testInternals.expandRequestedOutputs([])).toEqual([
      { contentType: 'article', filePrefix: 'article', index: 1, outputCountForType: 1 },
    ]);
  });

  it('maps file prefixes for all known content types and fallback values', () => {
    expect(__testInternals.toFilePrefix('article')).toBe('article');
    expect(__testInternals.toFilePrefix('blog-post')).toBe('blog');
    expect(__testInternals.toFilePrefix('x-thread')).toBe('x-thread');
    expect(__testInternals.toFilePrefix('x-post')).toBe('x-post');
    expect(__testInternals.toFilePrefix('reddit-post')).toBe('reddit');
    expect(__testInternals.toFilePrefix('linkedin-post')).toBe('linkedin');
    expect(__testInternals.toFilePrefix('newsletter')).toBe('newsletter');
    expect(__testInternals.toFilePrefix('landing-page-copy')).toBe('landing');
    expect(__testInternals.toFilePrefix('Custom Type')).toBe('custom-type');
    expect(__testInternals.toFilePrefix('!!!')).toBe('content');
  });

  it('derives title and slug fallbacks for empty ideas', () => {
    expect(__testInternals.deriveTitleFromIdea('   ')).toBe('Generated Content Batch');
    expect(__testInternals.deriveTitleFromIdea('one two three four five six seven eight nine')).toBe('One Two Three Four Five Six Seven Eight');

    expect(__testInternals.slugifyIdea('Hello, World!')).toBe('hello-world');
    expect(__testInternals.slugifyIdea('!!!')).toBe('generated-content');
  });

  it('recognizes valid write stage ids only', () => {
    expect(__testInternals.asWriteStageId('shared-brief')).toBe('shared-brief');
    expect(__testInternals.asWriteStageId('planning')).toBe('planning');
    expect(__testInternals.asWriteStageId('sections')).toBe('sections');
    expect(__testInternals.asWriteStageId('image-prompts')).toBe('image-prompts');
    expect(__testInternals.asWriteStageId('images')).toBe('images');
    expect(__testInternals.asWriteStageId('output')).toBe('output');
    expect(__testInternals.asWriteStageId('unknown')).toBeNull();
  });

  it('chooses stage cost source for empty, uniform, and mixed sources', () => {
    expect(__testInternals.chooseStageCostSource([], 'estimated')).toBe('estimated');
    expect(__testInternals.chooseStageCostSource(['provider', 'provider'], 'estimated')).toBe('provider');
    expect(__testInternals.chooseStageCostSource(['estimated', 'estimated'], 'provider')).toBe('estimated');
    expect(__testInternals.chooseStageCostSource(['provider', 'estimated'], 'unavailable')).toBe('unavailable');
  });
});
