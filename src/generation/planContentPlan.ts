import type { AppSettings } from '../config/schema.js';
import type { Publication } from '../types/publication.js';
import {
  buildContentPlanMessages,
  contentPlanSchema,
} from '../llm/prompts/contentPlan.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { LlmInteractionRecord } from '../pipeline/events.js';
import type { ContentPlan } from '../types/contentPlan.js';
import { contentPlanSchema as contentPlanResultSchema } from '../types/contentPlanSchema.js';

const SHARED_PLAN_MAX_TOKENS = 8000;

export async function planContentPlan({
  idea,
  targetAudienceHint,
  settings,
  publication,
  openRouter,
  dryRun,
  onLlmMetrics,
  onInteraction,
}: {
  idea: string;
  targetAudienceHint?: string;
  settings: AppSettings;
  publication?: Publication | null;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onLlmMetrics?: (metrics: LlmCallMetrics) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<ContentPlan> {
  if (dryRun || !openRouter) {
    return buildDryRunContentPlan(idea, targetAudienceHint);
  }

  const sharedPlanSettings: AppSettings = {
    ...settings,
    modelSettings: {
      ...settings.modelSettings,
      maxTokens: Math.max(settings.modelSettings.maxTokens, SHARED_PLAN_MAX_TOKENS),
    },
  };

  return await openRouter.requestStructured<ContentPlan>({
    schemaName: 'content_plan',
    schema: contentPlanSchema,
    messages: buildContentPlanMessages(idea, {
      intent: settings.intent,
      targetAudienceHint,
      primaryContentType: settings.contentTargets.find((target) => target.role === 'primary')?.contentType ?? 'article',
      secondaryContentTypes: settings.contentTargets
        .filter((target) => target.role === 'secondary')
        .map((target) => target.contentType),
      publication,
    }),
    settings: sharedPlanSettings,
    interactionContext: {
      stageId: 'shared-plan',
      operationId: 'shared-plan:content-plan',
    },
    onInteraction,
    onMetrics: onLlmMetrics,
    parse(data) {
      return contentPlanResultSchema.parse(data);
    },
  });
}

function buildDryRunContentPlan(idea: string, targetAudienceHint?: string): ContentPlan {
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
    return 'Generated Content Plan';
  }

  return idea
    .split(/\s+/)
    .slice(0, 8)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
