import type { AppSettings } from '../config/schema.js';
import type { OpenRouterClient, AgentToolExecutedEvent, AgentTurnCompleteEvent } from '../llm/openRouterClient.js';
import { estimateLlmCostUsd, type LlmCallMetrics } from '../pipeline/analytics.js';
import type { CostSource, LlmInteractionRecord } from '../pipeline/events.js';
import { countSeoErrors, lintArticleSeo, type SeoCheckMode, type SeoLintResult } from '../seo/lint.js';
import type { ArticlePlan } from '../types/article.js';
import { buildEditorSystemPrompt, buildEditorUserPrompt } from './prompts.js';
import { cloneEditorSnapshot, type EditorSessionSnapshot, type EditorTextSnapshot } from './snapshot.js';
import { createEditorToolHandlers } from './tools.js';
import { SEO_CHECK_TOOL_DEFINITIONS } from './toolDefinitions.js';

export interface RunEditorInput {
  plan: ArticlePlan;
  text: EditorTextSnapshot;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  seoCheckMode: SeoCheckMode;
  maxTurns: number;
  force?: boolean;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
  onAgentTurnComplete?: (event: AgentTurnCompleteEvent) => void;
  onToolExecuted?: (event: AgentToolExecutedEvent) => void;
  onLlmMetrics?: (metrics: LlmCallMetrics) => void;
}

export interface RunEditorResult {
  snapshot: EditorSessionSnapshot;
  lint: SeoLintResult;
  turnsUsed: number;
  skippedAgent: boolean;
  maxTurnsReached: boolean;
  editorCostUsd: number | null;
  editorCostSource: CostSource;
}

export function runEditorLint(
  plan: ArticlePlan,
  text: EditorTextSnapshot,
  mode: SeoCheckMode = 'errors-only',
): SeoLintResult {
  return lintArticleSeo({ plan, text, mode });
}

function shouldSkipAgent(
  issues: SeoLintResult['issues'],
  mode: SeoCheckMode,
  force: boolean,
): boolean {
  if (force) {
    return false;
  }
  if (mode === 'strict') {
    return issues.length === 0;
  }
  return countSeoErrors(issues) === 0;
}

export async function runEditor(input: RunEditorInput): Promise<RunEditorResult> {
  const snapshot = cloneEditorSnapshot(input.plan, input.text);
  const mode = input.seoCheckMode;
  const initialLint = lintArticleSeo({ plan: snapshot.plan, text: snapshot.text, mode });

  if (shouldSkipAgent(initialLint.issues, mode, input.force ?? false)) {
    return {
      snapshot,
      lint: initialLint,
      turnsUsed: 0,
      skippedAgent: true,
      maxTurnsReached: false,
      editorCostUsd: null,
      editorCostSource: 'unavailable',
    };
  }

  if (input.dryRun || !input.openRouter) {
    for (const issue of initialLint.issues) {
      console.warn(`[seo] ${issue.message}`);
    }
    return {
      snapshot,
      lint: initialLint,
      turnsUsed: 0,
      skippedAgent: true,
      maxTurnsReached: false,
      editorCostUsd: null,
      editorCostSource: 'unavailable',
    };
  }

  const includeKeywordGuide = snapshot.plan.keywords.length > 0;
  let editorCostUsd: number | null = null;
  let editorCostSource: CostSource = 'unavailable';
  const loopResult = await input.openRouter.requestAgentLoop({
    messages: [
      {
        role: 'system',
        content: buildEditorSystemPrompt(mode, includeKeywordGuide),
      },
      {
        role: 'user',
        content: buildEditorUserPrompt(initialLint.issues, snapshot.plan, snapshot.text),
      },
    ],
    tools: SEO_CHECK_TOOL_DEFINITIONS,
    settings: input.settings,
    maxTurns: input.maxTurns,
    toolHandlers: createEditorToolHandlers(() => snapshot, { mode }),
    interactionContext: {
      stageId: 'seo-check',
      operationId: 'seo-check:editor-agent',
    },
    onInteraction: input.onInteraction,
    onTurnComplete: input.onAgentTurnComplete,
    onToolExecuted: input.onToolExecuted,
    onMetrics: (metrics) => {
      const cost = estimateLlmCostUsd(metrics.modelId, metrics.usage);
      editorCostUsd = cost.usd;
      editorCostSource = cost.source;
      input.onLlmMetrics?.(metrics);
    },
  });

  const finalLint = lintArticleSeo({ plan: snapshot.plan, text: snapshot.text, mode });
  for (const issue of finalLint.issues) {
    console.warn(`[seo] ${issue.message}`);
  }

  return {
    snapshot,
    lint: finalLint,
    turnsUsed: loopResult.turnsUsed,
    skippedAgent: false,
    maxTurnsReached: loopResult.maxTurnsReached,
    editorCostUsd,
    editorCostSource,
  };
}
