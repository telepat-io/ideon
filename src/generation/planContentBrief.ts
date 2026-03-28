import type { AppSettings } from '../config/schema.js';
import {
  buildContentBriefMessages,
  contentBriefSchema,
} from '../llm/prompts/contentBrief.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { LlmInteractionRecord } from '../pipeline/events.js';
import type { ContentBrief } from '../types/contentBrief.js';
import { contentBriefSchema as contentBriefResultSchema } from '../types/contentBriefSchema.js';

export async function planContentBrief({
  idea,
  settings,
  openRouter,
  dryRun,
  onLlmMetrics,
  onInteraction,
}: {
  idea: string;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onLlmMetrics?: (metrics: LlmCallMetrics) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<ContentBrief> {
  if (dryRun || !openRouter) {
    return buildDryRunContentBrief(idea);
  }

  return await openRouter.requestStructured<ContentBrief>({
    schemaName: 'content_brief',
    schema: contentBriefSchema,
    messages: buildContentBriefMessages(idea, {
      style: settings.style,
      contentTypes: settings.contentTargets.map((target) => target.contentType),
    }),
    settings,
    interactionContext: {
      stageId: 'shared-brief',
      operationId: 'shared-brief:content-brief',
    },
    onInteraction,
    onMetrics: onLlmMetrics,
    parse(data) {
      return contentBriefResultSchema.parse(data);
    },
  });
}

function buildDryRunContentBrief(idea: string): ContentBrief {
  const normalizedIdea = idea.trim();
  return {
    description: `A practical, cross-channel content package about ${normalizedIdea} with clear mechanisms, examples, and execution guidance.`,
    targetAudience: 'Operators, creators, and small teams looking for practical guidance they can apply this week.',
    corePromise: 'The reader will leave with a concrete understanding of what to do next and why it works.',
    keyPoints: [
      'Clarify the problem context before proposing tactics.',
      'Use concrete examples with operational detail instead of abstract claims.',
      'Translate the same core message into channel-native structure without losing substance.',
    ],
    voiceNotes: 'Keep the tone practical and direct. Avoid hype, vague claims, and filler language.',
  };
}
