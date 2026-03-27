import type { ChatMessage } from '../openRouterClient.js';

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

export function buildArticlePlanMessages(idea: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are an editorial strategist. Produce a rigorous article plan for a polished long-form Markdown article. Be specific, concrete, and avoid generic filler. Return only the requested JSON.',
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
      ].join('\n'),
    },
  ];
}