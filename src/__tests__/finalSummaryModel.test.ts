import { buildFinalSummaryRows } from '../cli/ui/finalSummaryModel.js';

describe('buildFinalSummaryRows', () => {
  it('keeps only high-signal rows and assigns distinct label colors', () => {
    const rows = buildFinalSummaryRows({
      artifact: {
        title: 'Example title',
        slug: 'example-title',
        sectionCount: 4,
        imageCount: 2,
        outputCount: 3,
        generationDir: '/tmp/example-title',
        markdownPaths: ['/tmp/example-title/article-1.md'],
        markdownPath: '/tmp/example-title/article-1.md',
        assetDir: '/tmp/example-title/assets',
        analyticsPath: '/tmp/example-title/generation.analytics.json',
        interactionsPath: '/tmp/example-title/model.interactions.json',
      },
      analytics: {
        runId: 'run-1',
        runMode: 'fresh',
        dryRun: false,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        summary: {
          totalDurationMs: 5432,
          totalRetries: 2,
          totalCostUsd: 0.0123,
          totalCostSource: 'estimated',
        },
        stages: [],
        imagePromptCalls: [],
        imageRenderCalls: [],
        outputItemCalls: [],
        linkEnrichmentCalls: [],
      },
    });

    expect(rows.map((row) => row.id)).toEqual(['slug', 'counts', 'generation', 'metrics']);

    const flattenedText = rows.flatMap((row) => row.segments.map((segment) => segment.text)).join('');
    expect(flattenedText).not.toContain('markdown');
    expect(flattenedText).not.toContain('assets');
    expect(flattenedText).not.toContain('analytics');

    expect(rows[0]?.segments[0]).toMatchObject({ text: 'slug', color: 'cyanBright', bold: true });
    expect(rows[1]?.segments[0]).toMatchObject({ text: 'sections', color: 'yellowBright', bold: true });
    expect(rows[1]?.segments[4]).toMatchObject({ text: 'images', color: 'magentaBright', bold: true });
    expect(rows[1]?.segments[8]).toMatchObject({ text: 'outputs', color: 'greenBright', bold: true });
    expect(rows[3]?.segments[0]).toMatchObject({ text: 'duration', color: 'cyanBright', bold: true });
    expect(rows[3]?.segments[4]).toMatchObject({ text: 'retries', color: 'yellowBright', bold: true });
    expect(rows[3]?.segments[8]).toMatchObject({ text: 'cost', color: 'greenBright', bold: true });
    expect(rows[3]?.segments[10]).toMatchObject({ text: '$0.0123', color: 'white' });
  });

  it('formats unavailable cost without reintroducing path rows', () => {
    const rows = buildFinalSummaryRows({
      artifact: {
        title: 'Example title',
        slug: 'example-title',
        sectionCount: 1,
        imageCount: 0,
        outputCount: 1,
        generationDir: '/tmp/example-title',
        markdownPaths: ['/tmp/example-title/article-1.md'],
        markdownPath: '/tmp/example-title/article-1.md',
        assetDir: '/tmp/example-title/assets',
        analyticsPath: '/tmp/example-title/generation.analytics.json',
        interactionsPath: '/tmp/example-title/model.interactions.json',
      },
      analytics: {
        runId: 'run-2',
        runMode: 'resume',
        dryRun: true,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        summary: {
          totalDurationMs: 100,
          totalRetries: 0,
          totalCostUsd: null,
          totalCostSource: 'unavailable',
        },
        stages: [],
        imagePromptCalls: [],
        imageRenderCalls: [],
        outputItemCalls: [],
        linkEnrichmentCalls: [],
      },
    });

    expect(rows[3]?.segments[10]?.text).toBe('unavailable');
    expect(rows.some((row) => row.id === 'markdown')).toBe(false);
    expect(rows.some((row) => row.id === 'assets')).toBe(false);
    expect(rows.some((row) => row.id === 'analytics')).toBe(false);
  });
});