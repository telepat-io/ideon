import type { AppSettings } from '../config/schema.js';
import { buildSingleShotContentMessages } from '../llm/prompts/channelContent.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { LlmInteractionRecord } from '../pipeline/events.js';
import type { PrimaryPlan } from '../types/article.js';
import type { ContentPlan } from '../types/contentPlan.js';

export async function writeSingleShotContent({
  idea,
  contentType,
  role = 'secondary',
  primaryContentType,
  style,
  intent,
  outputIndex,
  outputCountForType,
  articleReferenceMarkdown,
  contentPlan,
  plan,
  settings,
  openRouter,
  dryRun,
  onLlmMetrics,
  onInteraction,
}: {
  idea: string;
  contentType: string;
  role?: 'primary' | 'secondary';
  primaryContentType: string;
  style: string;
  intent: string;
  outputIndex: number;
  outputCountForType: number;
  articleReferenceMarkdown?: string;
  contentPlan: ContentPlan;
  plan?: PrimaryPlan | null;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onLlmMetrics?: (metrics: LlmCallMetrics) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<string> {
  if (dryRun || !openRouter) {
    return buildDryRunContent({
      idea,
      contentType,
      role,
      primaryContentType,
      outputIndex,
      outputCountForType,
      contentPlan,
      plan,
      articleReferenceMarkdown,
    });
  }

  return await openRouter.requestText({
    messages: buildSingleShotContentMessages({
      idea,
      contentType,
      role,
      primaryContentType,
      style,
      intent,
      outputIndex,
      outputCountForType,
      contentPlan,
      plan,
      articleReferenceMarkdown,
      targetLength: settings.targetLength,
    }),
    settings,
    interactionContext: {
      stageId: 'output',
      operationId: `output:${contentType}:${outputIndex}`,
    },
    onInteraction,
    onMetrics: onLlmMetrics,
  });
}

function buildDryRunContent(options: {
  idea: string;
  contentType: string;
  outputIndex: number;
  outputCountForType: number;
  role: 'primary' | 'secondary';
  primaryContentType: string;
  contentPlan: ContentPlan;
  plan?: PrimaryPlan | null;
  articleReferenceMarkdown?: string;
}): string {
  const anchorNote = options.articleReferenceMarkdown
    ? 'Anchored to generated primary context from this run.'
    : 'No primary anchor available; generated directly from idea.';

  const planNote = options.plan
    ? `Plan title: ${options.plan.title}\nPlan description: ${options.plan.description}${options.plan.angle ? `\nAngle: ${options.plan.angle}` : ''}`
    : 'No primary plan available.';

  return [
    `# ${options.contentType} draft ${options.outputIndex}`,
    '',
    `Idea: ${options.idea}`,
    `Variant: ${options.outputIndex}/${options.outputCountForType}`,
    `Role: ${options.role}`,
    `Primary content type: ${options.primaryContentType}`,
    `Shared plan: ${options.contentPlan.description}`,
    planNote,
    anchorNote,
    '',
    'This is a dry-run placeholder for single-prompt channel generation.',
  ].join('\n');
}
