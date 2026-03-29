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

const SHARED_BRIEF_MAX_TOKENS = 8000;

export async function planContentBrief({
  idea,
  targetAudienceHint,
  settings,
  openRouter,
  dryRun,
  onLlmMetrics,
  onInteraction,
}: {
  idea: string;
  targetAudienceHint?: string;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onLlmMetrics?: (metrics: LlmCallMetrics) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<ContentBrief> {
  if (dryRun || !openRouter) {
    return buildDryRunContentBrief(idea, targetAudienceHint);
  }

  const sharedBriefSettings: AppSettings = {
    ...settings,
    modelSettings: {
      ...settings.modelSettings,
      maxTokens: Math.max(settings.modelSettings.maxTokens, SHARED_BRIEF_MAX_TOKENS),
    },
  };

  return await openRouter.requestStructured<ContentBrief>({
    schemaName: 'content_brief',
    schema: contentBriefSchema,
    messages: buildContentBriefMessages(idea, {
      style: settings.style,
      targetAudienceHint,
      primaryContentType: settings.contentTargets.find((target) => target.role === 'primary')?.contentType ?? 'article',
      secondaryContentTypes: settings.contentTargets
        .filter((target) => target.role === 'secondary')
        .map((target) => target.contentType),
    }),
    settings: sharedBriefSettings,
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

function buildDryRunContentBrief(idea: string, targetAudienceHint?: string): ContentBrief {
  const normalizedIdea = idea.trim();
  const normalizedAudience = targetAudienceHint?.trim();
  const targetAudience = normalizedAudience && normalizedAudience.length > 0
    ? `Audience seed: ${normalizedAudience}. Extend this profile with specific motivations, constraints, and context tied to ${normalizedIdea}.`
    : 'A broad, general audience of curious professionals and creators seeking practical, applicable insight.';

  return {
    title: deriveTitleFromIdea(normalizedIdea),
    description: `A practical, cross-channel content package about ${normalizedIdea} with clear mechanisms, examples, and execution guidance.`,
    targetAudience,
    corePromise: 'The reader will leave with a concrete understanding of what to do next and why it works.',
    keyPoints: [
      'Clarify the problem context before proposing tactics.',
      'Use concrete examples with operational detail instead of abstract claims.',
      'Translate the same core message into channel-native structure without losing substance.',
    ],
    voiceNotes: 'Keep the tone practical and direct. Avoid hype, vague claims, and filler language.',
    primaryContentType: 'article',
    secondaryContentTypes: ['x-post', 'linkedin-post'],
    secondaryContentStrategy: 'Each secondary output should stand on its own with practical value while creating curiosity that points readers back to the primary piece.',
  };
}

function deriveTitleFromIdea(idea: string): string {
  if (!idea) {
    return 'Generated Content Brief';
  }

  return idea
    .split(/\s+/)
    .slice(0, 8)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
