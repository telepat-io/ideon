import { jest } from '@jest/globals';
import type { ResolvedRunInput } from '../config/resolver.js';
import type { PipelineRunResult, StageViewModel } from '../pipeline/events.js';

const runPipelineShellMock = jest.fn<
  (input: ResolvedRunInput, options?: { onUpdate?: (stages: StageViewModel[]) => void }) => Promise<PipelineRunResult>
>();
const notifyWriteStartedMock = jest.fn<() => Promise<void>>();
const notifyWriteSucceededMock = jest.fn<() => Promise<void>>();
const notifyWriteFailedMock = jest.fn<() => Promise<void>>();

jest.unstable_mockModule('../pipeline/runner.js', () => ({
  runPipelineShell: runPipelineShellMock,
}));

jest.unstable_mockModule('../cli/notifications/osNotifier.js', () => ({
  notifyWriteStarted: notifyWriteStartedMock,
  notifyWriteSucceeded: notifyWriteSucceededMock,
  notifyWriteFailed: notifyWriteFailedMock,
}));

const { renderPlainPipeline } = await import('../cli/logging/plainRenderer.js');

describe('renderPlainPipeline', () => {
  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    notifyWriteStartedMock.mockResolvedValue();
    notifyWriteSucceededMock.mockResolvedValue();
    notifyWriteFailedMock.mockResolvedValue();
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
          interactionsPath: '/tmp/run/model.interactions.json',
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
          stages: [
            {
              stageId: 'shared-brief',
              durationMs: 1000,
              startedAt: new Date().toISOString(),
              endedAt: new Date().toISOString(),
              retries: 0,
              costUsd: 0.001,
              costSource: 'estimated',
            },
            {
              stageId: 'planning',
              durationMs: 1000,
              startedAt: new Date().toISOString(),
              endedAt: new Date().toISOString(),
              retries: 0,
              costUsd: 0.002,
              costSource: 'provider',
            },
          ],
          imagePromptCalls: [],
          imageRenderCalls: [],
          outputItemCalls: [],
          linkEnrichmentCalls: [],
        },
      };
    });

    await renderPlainPipeline({
      idea: 'A practical idea',
      config: {
        settings: {
          notifications: { enabled: true },
        },
      },
    } as ResolvedRunInput, true, true, 'fresh');

    const allLogs = (console.log as jest.Mock).mock.calls.map((call) => String(call[0]));
    const itemLogs = allLogs.filter((line) => line.includes('Assembling Markdown :: x post 1/2'));

    expect(itemLogs).toHaveLength(3);
    expect(itemLogs[0]).toContain('[pending]');
    expect(itemLogs[1]).toContain('[running]');
    expect(itemLogs[2]).toContain('[succeeded]');
    expect(itemLogs[2]).toContain('analytics: 1.5s • cost: ~$0.0123');
    expect(allLogs).toContain('  cost_by_stage:');
    expect(allLogs).toContain('    shared-brief: ~$0.0010');
    expect(allLogs).toContain('    planning: $0.0020');
    expect(notifyWriteStartedMock).toHaveBeenCalledWith({
      enabled: true,
      idea: 'A practical idea',
      runMode: 'fresh',
    });
    expect(notifyWriteSucceededMock).toHaveBeenCalledWith({
      enabled: true,
      title: 'Example',
      slug: 'example',
    });
    expect(notifyWriteFailedMock).not.toHaveBeenCalled();
  });

  it('logs running stage detail changes including retry metadata', async () => {
    runPipelineShellMock.mockImplementation(async (_input, options) => {
      options?.onUpdate?.([
        {
          id: 'shared-brief',
          title: 'Planning Shared Brief',
          status: 'running',
          detail: 'Generating explicit cross-channel content guidance.',
        },
      ]);

      options?.onUpdate?.([
        {
          id: 'shared-brief',
          title: 'Planning Shared Brief',
          status: 'running',
          detail: 'Generating explicit cross-channel content guidance.',
          retryCount: 1,
          lastRetryError: 'OpenRouter rate limited',
        },
      ]);

      options?.onUpdate?.([
        {
          id: 'shared-brief',
          title: 'Planning Shared Brief',
          status: 'running',
          detail: 'Retrying shared brief request.',
          retryCount: 2,
          lastRetryError: 'OpenRouter temporarily unavailable',
        },
      ]);

      options?.onUpdate?.([
        {
          id: 'shared-brief',
          title: 'Planning Shared Brief',
          status: 'succeeded',
          detail: 'Shared brief generated successfully.',
          retryCount: 2,
          lastRetryError: 'OpenRouter temporarily unavailable',
        },
      ]);

      return {
        stages: [
          {
            id: 'shared-brief',
            title: 'Planning Shared Brief',
            status: 'succeeded',
            detail: 'Shared brief generated successfully.',
            retryCount: 2,
            lastRetryError: 'OpenRouter temporarily unavailable',
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
          interactionsPath: '/tmp/run/model.interactions.json',
        },
        analytics: {
          runId: 'run-1',
          runMode: 'fresh',
          dryRun: true,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          summary: {
            totalDurationMs: 2000,
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
      };
    });

    await renderPlainPipeline({
      idea: 'A practical idea',
      config: {
        settings: {
          notifications: { enabled: true },
        },
      },
    } as ResolvedRunInput, true, true, 'fresh');

    const allLogs = (console.log as jest.Mock).mock.calls.map((call) => String(call[0]));
    const stageLogs = allLogs.filter((line) => line.includes('Planning Shared Brief'));

    expect(stageLogs.length).toBeGreaterThanOrEqual(4);
    expect(stageLogs.some((line) => line.includes('[running]') && line.includes('retried 1x'))).toBe(true);
    expect(stageLogs.some((line) => line.includes('[running]') && line.includes('retried 2x'))).toBe(true);
  });

  it('sends failed terminal notification when the pipeline throws', async () => {
    runPipelineShellMock.mockRejectedValue(new Error('network issue'));

    await expect(
      renderPlainPipeline(
        {
          idea: 'Failure scenario',
          config: {
            settings: {
              notifications: { enabled: true },
            },
          },
        } as ResolvedRunInput,
        true,
        true,
        'fresh',
      ),
    ).rejects.toThrow('network issue');

    expect(notifyWriteStartedMock).toHaveBeenCalledWith({
      enabled: true,
      idea: 'Failure scenario',
      runMode: 'fresh',
    });
    expect(notifyWriteFailedMock).toHaveBeenCalledWith({
      enabled: true,
      message: 'network issue Run `ideon write resume` to retry the latest job.',
    });
    expect(notifyWriteSucceededMock).not.toHaveBeenCalled();
  });
});
