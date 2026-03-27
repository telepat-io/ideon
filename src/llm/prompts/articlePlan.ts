import type { ChatMessage } from '../openRouterClient.js';
import {
  buildRunContextDirective,
  buildStyleDirective,
  buildWritingFrameworkInstruction,
} from './writingFramework.js';

export const articlePlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'subtitle',
    'keywords',
    'slug',
    'description',
    'introBrief',
    'outroBrief',
    'sections',
    'coverImageDescription',
    'inlineImages',
  ],
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    keywords: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: { type: 'string' },
    },
    slug: { type: 'string' },
    description: { type: 'string' },
    introBrief: { type: 'string' },
    outroBrief: { type: 'string' },
    sections: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
    coverImageDescription: { type: 'string' },
    inlineImages: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['anchorAfterSection', 'description'],
        properties: {
          anchorAfterSection: { type: 'integer', minimum: 1, maximum: 6 },
          description: { type: 'string' },
        },
      },
    },
  },
} as const;

export function buildArticlePlanMessages(
  idea: string,
  options: {
    style: string;
    contentTypes: string[];
  },
): ChatMessage[] {
  const systemInstruction = [
    'You are an editorial strategist. Produce a rigorous article plan for a polished long-form Markdown article.',
    buildWritingFrameworkInstruction(),
    buildStyleDirective(options.style),
    buildRunContextDirective(options.contentTypes),
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
        'Create an article plan from this idea:',
        idea,
        '',
        'Requirements:',
        '- The article should feel authoritative, practical, and well structured.',
        '- Generate a memorable title and a sharp subtitle.',
        '- The slug must be lowercase kebab-case and publication-ready.',
        '- The description should work as a short summary or meta description.',
        '- Plan 4 to 6 strong sections with distinct focus areas.',
        '- Include a cover image description and 2 to 3 inline image descriptions.',
        '- Inline images should be anchored after specific sections using 1-based indexes.',
        '',
        'Return JSON with all required fields:',
        '- title: string',
        '- subtitle: string',
        '- keywords: array of 3 to 8 strings',
        '- slug: string in lowercase kebab-case',
        '- description: string',
        '- introBrief: string',
        '- outroBrief: string',
        '- sections: array of 4 to 6 objects, each with title and description strings',
        '- coverImageDescription: string',
        '- inlineImages: array of 2 to 3 objects, each with anchorAfterSection (integer 1 to 6) and description string',
        '',
        'Do not omit any required fields. Return JSON only.',
      ].join('\n'),
    },
  ];
}