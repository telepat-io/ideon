import type { AppSettings } from '../config/schema.js';
import { buildSingleShotContentMessages } from '../llm/prompts/channelContent.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';

export async function writeSingleShotContent({
  idea,
  contentType,
  style,
  outputIndex,
  outputCountForType,
  xMode,
  articleReferenceMarkdown,
  settings,
  openRouter,
  dryRun,
  onLlmMetrics,
}: {
  idea: string;
  contentType: string;
  style: string;
  outputIndex: number;
  outputCountForType: number;
  xMode?: string;
  articleReferenceMarkdown?: string;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onLlmMetrics?: (metrics: LlmCallMetrics) => void;
}): Promise<string> {
  if (dryRun || !openRouter) {
    return buildDryRunContent({
      idea,
      contentType,
      outputIndex,
      outputCountForType,
      articleReferenceMarkdown,
    });
  }

  return await openRouter.requestText({
    messages: buildSingleShotContentMessages({
      idea,
      contentType,
      style,
      outputIndex,
      outputCountForType,
      xMode,
      articleReferenceMarkdown,
    }),
    settings,
    onMetrics: onLlmMetrics,
  });
}

function buildDryRunContent(options: {
  idea: string;
  contentType: string;
  outputIndex: number;
  outputCountForType: number;
  articleReferenceMarkdown?: string;
}): string {
  const anchorNote = options.articleReferenceMarkdown
    ? 'Anchored to generated article context from this run.'
    : 'No article anchor available; generated directly from idea.';

  return [
    `# ${options.contentType} draft ${options.outputIndex}`,
    '',
    `Idea: ${options.idea}`,
    `Variant: ${options.outputIndex}/${options.outputCountForType}`,
    anchorNote,
    '',
    'This is a dry-run placeholder for single-prompt channel generation.',
  ].join('\n');
}
