import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import { runEditor, runEditorLint } from '../editor/runEditor.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { ArticlePlan } from '../types/article.js';

function mockPlan(): ArticlePlan {
  return {
    contentType: 'article',
    title: 'Missing Keyword Title',
    subtitle: 'Subtitle',
    primaryKeyword: 'kubernetes',
    keywords: ['kubernetes', 'pods'],
    slug: 'missing-keyword-title',
    description: 'A long enough meta description for SEO lint checks that spans at least one hundred and twenty characters in total length.',
    introBrief: 'Intro brief',
    outroBrief: 'Outro brief',
    coverImageDescription: 'Cover',
    sections: [
      { title: 'Pods overview', description: 'Pods', targetKeywords: ['pods'] },
      { title: 'Scheduling', description: 'Scheduling' },
    ],
    inlineImages: [],
  };
}

describe('runEditor', () => {
  it('skips agent when lint passes and force is false', async () => {
    const plan = mockPlan();
    plan.title = 'Kubernetes Guide for Platform Teams';

    const result = await runEditor({
      plan,
      text: {
        intro: 'Kubernetes orchestration helps teams deploy workloads reliably across clusters with less manual toil and fewer rollout incidents.',
        sections: [
          {
            title: plan.sections[0]!.title,
            body: 'Pods are the smallest deployable units in Kubernetes and wrap one or more containers that share network namespaces, storage volumes, and lifecycle hooks so operators can reason about failure domains consistently across environments, regions, and teams with 37% fewer rollbacks according to recent surveys.',
          },
          {
            title: plan.sections[1]!.title,
            body: 'Scheduling assigns pods to nodes based on resource requests, affinity rules, taints, tolerations, topology spread constraints, and observed cluster capacity signals so workloads remain available during node maintenance windows, upgrades, traffic spikes, and regional outages in production according to 2024 platform benchmarks.',
          },
        ],
        outro: 'Kubernetes remains the default orchestration layer for many platform teams.',
      },
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: true,
      seoCheckMode: 'errors-only',
      maxTurns: defaultAppSettings.seoCheckMaxTurns,
    });

    expect(result.skippedAgent).toBe(true);
    expect(result.turnsUsed).toBe(0);
    expect(result.lint.passed).toBe(true);
  });

  it('warns and skips agent in dry-run when lint issues remain', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await runEditor({
      plan: mockPlan(),
      text: {
        intro: 'This intro does not mention the primary keyword at all.',
        sections: [
          { title: 'Pods overview', body: 'Short.' },
          { title: 'Scheduling', body: 'Also short.' },
        ],
        outro: 'Done.',
      },
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: true,
      seoCheckMode: 'errors-only',
      maxTurns: defaultAppSettings.seoCheckMaxTurns,
      force: true,
    });

    expect(result.skippedAgent).toBe(true);
    expect(result.lint.passed).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('runs the agent loop when lint issues remain and openRouter is available', async () => {
    const onAgentTurnComplete = jest.fn();
    const onToolExecuted = jest.fn();
    const requestAgentLoop = jest.fn<OpenRouterClient['requestAgentLoop']>().mockImplementation(async (request) => {
      request.onTurnComplete?.({
        turn: 1,
        operationId: 'seo-check:editor-agent:turn-1',
        metrics: {
          durationMs: 12,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          modelId: defaultAppSettings.model,
          usage: {
            promptTokens: 100,
            completionTokens: 20,
            totalTokens: 120,
            providerTotalCostUsd: null,
          },
        },
        toolCalls: ['edit_intro'],
      });
      request.onMetrics?.({
        durationMs: 12,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        modelId: defaultAppSettings.model,
        usage: {
          promptTokens: 100,
          completionTokens: 20,
          totalTokens: 120,
          providerTotalCostUsd: null,
        },
      });
      return {
        messages: [],
        turnsUsed: 1,
        finalContent: 'done',
        maxTurnsReached: false,
      };
    });
    const openRouter = { requestAgentLoop } as unknown as OpenRouterClient;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await runEditor({
      plan: mockPlan(),
      text: {
        intro: 'This intro does not mention the primary keyword at all.',
        sections: [
          { title: 'Pods overview', body: 'Short.' },
          { title: 'Scheduling', body: 'Also short.' },
        ],
        outro: 'Done.',
      },
      settings: defaultAppSettings,
      openRouter,
      dryRun: false,
      seoCheckMode: 'errors-only',
      maxTurns: defaultAppSettings.seoCheckMaxTurns,
      force: true,
      onAgentTurnComplete,
      onToolExecuted,
    });

    expect(requestAgentLoop).toHaveBeenCalledTimes(1);
    expect(onAgentTurnComplete).toHaveBeenCalledTimes(1);
    expect(result.skippedAgent).toBe(false);
    expect(result.turnsUsed).toBe(1);
    expect(result.editorCostUsd).not.toBeNull();
    expect(result.editorCostSource).toBe('estimated');
    warnSpy.mockRestore();
  });

  it('leaves editor cost unavailable when the agent loop reports no metrics', async () => {
    const requestAgentLoop = jest.fn<OpenRouterClient['requestAgentLoop']>().mockResolvedValue({
      messages: [],
      turnsUsed: 0,
      finalContent: null,
      maxTurnsReached: false,
    });
    const openRouter = { requestAgentLoop } as unknown as OpenRouterClient;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await runEditor({
      plan: mockPlan(),
      text: {
        intro: 'This intro does not mention the primary keyword at all.',
        sections: [
          { title: 'Pods overview', body: 'Short.' },
          { title: 'Scheduling', body: 'Also short.' },
        ],
        outro: 'Done.',
      },
      settings: defaultAppSettings,
      openRouter,
      dryRun: false,
      seoCheckMode: 'errors-only',
      maxTurns: defaultAppSettings.seoCheckMaxTurns,
      force: true,
    });

    expect(result.editorCostUsd).toBeNull();
    expect(result.editorCostSource).toBe('unavailable');
    warnSpy.mockRestore();
  });

  it('exposes runEditorLint as a thin wrapper', () => {
    const lint = runEditorLint(mockPlan(), {
      intro: 'Missing keyword intro.',
      sections: [],
      outro: 'Outro.',
    });

    expect(lint.passed).toBe(false);
  });

  it('skips agent for warnings-only drafts in errors-only mode', async () => {
    const plan = mockPlan();
    plan.title = 'Kubernetes platform guide for teams operating reliable container orchestration at scale';

    const result = await runEditor({
      plan,
      text: {
        intro: 'Kubernetes orchestration helps teams deploy workloads reliably across clusters with less manual toil and fewer rollout incidents.',
        sections: [
          {
            title: plan.sections[0]!.title,
            body: 'Pods are the smallest deployable units in Kubernetes and wrap one or more containers that share network namespaces, storage volumes, and lifecycle hooks so operators can reason about failure domains consistently across environments, regions, and teams with 37% fewer rollbacks according to recent surveys.',
          },
          {
            title: plan.sections[1]!.title,
            body: 'Scheduling assigns pods to nodes based on resource requests, affinity rules, taints, tolerations, topology spread constraints, and observed cluster capacity signals so workloads remain available during node maintenance windows, upgrades, traffic spikes, and regional outages in production according to 2024 platform benchmarks.',
          },
        ],
        outro: 'Kubernetes remains the default orchestration layer for many platform teams.',
      },
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: false,
      seoCheckMode: 'errors-only',
      maxTurns: defaultAppSettings.seoCheckMaxTurns,
    });

    expect(result.skippedAgent).toBe(true);
    expect(result.lint.passed).toBe(true);
    expect(result.lint.issues.some((issue) => issue.severity === 'warning')).toBe(true);
  });

  it('runs agent in strict mode when warnings remain', async () => {
    const requestAgentLoop = jest.fn<OpenRouterClient['requestAgentLoop']>().mockResolvedValue({
      messages: [],
      turnsUsed: 0,
      finalContent: null,
      maxTurnsReached: false,
    });
    const openRouter = { requestAgentLoop } as unknown as OpenRouterClient;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const plan = mockPlan();
    plan.title = 'Kubernetes platform guide for teams operating reliable container orchestration at scale';

    await runEditor({
      plan,
      text: {
        intro: 'Kubernetes orchestration helps teams deploy workloads reliably across clusters with less manual toil and fewer rollout incidents.',
        sections: [
          {
            title: plan.sections[0]!.title,
            body: 'Pods are the smallest deployable units in Kubernetes and wrap one or more containers that share network namespaces, storage volumes, and lifecycle hooks so operators can reason about failure domains consistently across environments, regions, and teams with 37% fewer rollbacks according to recent surveys.',
          },
          {
            title: plan.sections[1]!.title,
            body: 'Scheduling assigns pods to nodes based on resource requests, affinity rules, taints, tolerations, topology spread constraints, and observed cluster capacity signals so workloads remain available during node maintenance windows, upgrades, traffic spikes, and regional outages in production according to 2024 platform benchmarks.',
          },
        ],
        outro: 'Kubernetes remains the default orchestration layer for many platform teams.',
      },
      settings: defaultAppSettings,
      openRouter,
      dryRun: false,
      seoCheckMode: 'strict',
      maxTurns: defaultAppSettings.seoCheckMaxTurns,
    });

    expect(requestAgentLoop).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
