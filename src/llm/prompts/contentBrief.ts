import type { ChatMessage } from '../openRouterClient.js';
import {
  buildRunContextDirective,
  buildStyleDirective,
  buildWritingFrameworkInstruction,
} from './writingFramework.js';

export const contentBriefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['description', 'targetAudience', 'corePromise', 'keyPoints', 'voiceNotes'],
  properties: {
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
  },
} as const;

export function buildContentBriefMessages(
  idea: string,
  options: {
    style: string;
    contentTypes: string[];
  },
): ChatMessage[] {
  const systemInstruction = [
    'You are a senior editorial strategist.',
    'Produce a shared content brief that can guide all requested content types in this run.',
    buildWritingFrameworkInstruction(),
    buildStyleDirective(options.style),
    buildRunContextDirective(options.contentTypes),
    'The brief must be specific, concrete, and directly usable by writers without extra clarification.',
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
        'Requirements:',
        '- description: explicit high-signal summary of the content body and angle for all channels.',
        '- targetAudience: who this is for and their current context.',
        '- corePromise: what concrete outcome the reader should expect.',
        '- keyPoints: 3 to 6 specific points that must survive adaptation across channels.',
        '- voiceNotes: practical tone/voice constraints to keep outputs consistent.',
        '',
        'Return JSON only with all required fields.',
      ].join('\n'),
    },
  ];
}
