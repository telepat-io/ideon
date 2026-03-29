import type { AppSettings } from '../config/schema.js';
import { buildSingleShotContentMessages } from '../llm/prompts/channelContent.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { LlmInteractionRecord } from '../pipeline/events.js';
import type { ContentBrief } from '../types/contentBrief.js';

export async function writeSingleShotContent({
  idea,
  contentType,
  role = 'secondary',
  primaryContentType,
  style,
  outputIndex,
  outputCountForType,
  articleReferenceMarkdown,
  contentBrief,
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
  outputIndex: number;
  outputCountForType: number;
  articleReferenceMarkdown?: string;
  contentBrief: ContentBrief;
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
      contentBrief,
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
      outputIndex,
      outputCountForType,
      contentBrief,
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
  contentBrief: ContentBrief;
  articleReferenceMarkdown?: string;
}): string {
  const anchorNote = options.articleReferenceMarkdown
    ? 'Anchored to generated primary context from this run.'
    : 'No primary anchor available; generated directly from idea.';

  return [
    `# ${options.contentType} draft ${options.outputIndex}`,
    '',
    `Idea: ${options.idea}`,
    `Variant: ${options.outputIndex}/${options.outputCountForType}`,
    `Role: ${options.role}`,
    `Primary content type: ${options.primaryContentType}`,
    `Shared brief: ${options.contentBrief.description}`,
    anchorNote,
    '',
    'This is a dry-run placeholder for single-prompt channel generation.',
  ].join('\n');
}
