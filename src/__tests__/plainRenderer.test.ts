import { jest } from '@jest/globals';
import type { ResolvedRunInput } from '../config/resolver.js';
import type { PipelineRunResult, StageViewModel } from '../pipeline/events.js';

const runPipelineShellMock = jest.fn<
  (input: ResolvedRunInput, options?: { onUpdate?: (stages: StageViewModel[]) => void }) => Promise<PipelineRunResult>
>();

jest.unstable_mockModule('../pipeline/runner.js', () => ({
  runPipelineShell: runPipelineShellMock,
}));

const { renderPlainPipeline } = await import('../cli/logging/plainRenderer.js');

describe('renderPlainPipeline', () => {
  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  it('logs item status transitions once per state change', async () => {
    runPipelineShellMock.mockImplementation(async (_input, options) => {
      options?.onUpdate?.([
        {
          id: 'output',
          title: 'Assembling Markdown',
          status: 'running',
          detail: 'Starting output generation.',
          items: [{ id: 'x-1', label: 'x post 1/2', status: 'pending', detail: 'Waiting to start.' }],
        },
      ]);

      options?.onUpdate?.([
        {
          id: 'output',
          title: 'Assembling Markdown',
          status: 'running',
          detail: 'Generating x post 1/2.',
          items: [{ id: 'x-1', label: 'x post 1/2', status: 'running', detail: 'Generating content.' }],
        },
      ]);

      options?.onUpdate?.([
        {
          id: 'output',
          title: 'Assembling Markdown',
          status: 'running',
          detail: 'Still generating x post 1/2.',
          items: [{ id: 'x-1', label: 'x post 1/2', status: 'running', detail: 'Generating content.' }],
        },
      ]);

      options?.onUpdate?.([
        {
          id: 'output',
          title: 'Assembling Markdown',
          status: 'succeeded',
          detail: 'Done.',
          items: [
            {
              id: 'x-1',
              label: 'x post 1/2',
              status: 'succeeded',
              detail: 'Saved markdown output.',
              analytics: {
                durationMs: 1500,
                costUsd: 0.0123,
                costSource: 'estimated',
              },
            },
          ],
        },
      ]);

      return {
        stages: [
          {
            id: 'output',
            title: 'Assembling Markdown',
            status: 'succeeded',
            detail: 'Done.',
          },
        ],
        artifact: {
          title: 'Example',
          slug: 'example',
          sectionCount: 0,
          imageCount: 0,
          outputCount: 1,
          generationDir: '/tmp/run',
          markdownPaths: ['/tmp/run/x-1.md'],
          markdownPath: '/tmp/run/x-1.md',
          assetDir: '/tmp/run',
          analyticsPath: '/tmp/run/generation.analytics.json',
        },
        analytics: {
          runId: 'run-1',
          runMode: 'fresh',
          dryRun: true,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          summary: {
            totalDurationMs: 2000,
            totalRetries: 0,
            totalCostUsd: 0.0123,
            totalCostSource: 'estimated',
          },
          stages: [],
          imagePromptCalls: [],
          imageRenderCalls: [],
          outputItemCalls: [],
        },
      };
    });

    await renderPlainPipeline({} as ResolvedRunInput, true, 'fresh');

    const allLogs = (console.log as jest.Mock).mock.calls.map((call) => String(call[0]));
    const itemLogs = allLogs.filter((line) => line.includes('Assembling Markdown :: x post 1/2'));

    expect(itemLogs).toHaveLength(3);
    expect(itemLogs[0]).toContain('[pending]');
    expect(itemLogs[1]).toContain('[running]');
    expect(itemLogs[2]).toContain('[succeeded]');
    expect(itemLogs[2]).toContain('analytics: 1.5s • cost: ~$0.0123');
  });
});
