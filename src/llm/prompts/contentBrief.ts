import type { ChatMessage } from '../openRouterClient.js';
import {
  buildRunContextDirective,
  buildStyleDirective,
  buildWritingFrameworkInstruction,
} from './writingFramework.js';

export const contentBriefSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'description',
    'targetAudience',
    'corePromise',
    'keyPoints',
    'voiceNotes',
    'primaryContentType',
    'secondaryContentTypes',
    'secondaryContentStrategy',
  ],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    targetAudience: { type: 'string' },
    corePromise: { type: 'string' },
    keyPoints: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: { type: 'string' },
    },
    voiceNotes: { type: 'string' },
    primaryContentType: { type: 'string' },
    secondaryContentTypes: {
      type: 'array',
      items: { type: 'string' },
    },
    secondaryContentStrategy: { type: 'string' },
  },
} as const;

export function buildContentBriefMessages(
  idea: string,
  options: {
    style: string;
    targetAudienceHint?: string;
    primaryContentType: string;
    secondaryContentTypes: string[];
  },
): ChatMessage[] {
  const audienceSeed = options.targetAudienceHint?.trim() || 'A general, non-specific audience.';
  const hasSecondaryContentTypes = options.secondaryContentTypes.length > 0;

  const systemInstruction = [
    'You are a senior editorial strategist.',
    'Produce a shared content brief that can guide all requested content types in this run.',
    buildWritingFrameworkInstruction(),
    buildStyleDirective(options.style),
    buildRunContextDirective([options.primaryContentType, ...options.secondaryContentTypes]),
    'The brief must be specific, concrete, and directly usable by writers without extra clarification.',
    'This run has one explicit primary output and optional secondary outputs that should promote or incite interest in the primary while remaining independently valuable.',
    'Return only the requested JSON.',
  ].join(' ');

  return [
    {
      role: 'system',
      content: systemInstruction,
    },
    {
      role: 'user',
      content: [
        'Create a shared content brief from this idea:',
        idea,
        '',
        `Audience seed (optional user guidance): ${audienceSeed}`,
        'Treat this audience seed as a starting point. Enrich it with concrete context, needs, and constraints tied to the idea instead of repeating it verbatim.',
        '',
        'Requirements:',
        '- title: concise, user-facing title for the primary output (5 to 12 words, plain text).',
        '- description: explicit high-signal summary of the content body and angle for all channels.',
        '- targetAudience: who this is for and their current context; must refine and particularize the audience seed in context.',
        '- corePromise: what concrete outcome the reader should expect.',
        '- keyPoints: 3 to 6 specific points that must survive adaptation across channels.',
        '- voiceNotes: practical tone/voice constraints to keep outputs consistent.',
        `- primaryContentType: set to "${options.primaryContentType}" exactly.`,
        `- secondaryContentTypes: include these types exactly: ${options.secondaryContentTypes.join(', ') || 'none'}.`,
        hasSecondaryContentTypes
          ? '- secondaryContentStrategy: explicit guidance for making secondary outputs channel-native, self-contained, and enticing gateways into the primary content.'
          : '- secondaryContentStrategy: set to an empty string because this run has no secondary outputs.',
        '',
        'Return JSON only with all required fields.',
      ].join('\n'),
    },
  ];
}
