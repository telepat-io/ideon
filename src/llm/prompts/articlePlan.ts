import type { ChatMessage } from '../openRouterClient.js';
import type { ContentBrief } from '../../types/contentBrief.js';
import {
  buildRunContextDirective,
  buildStyleDirective,
  buildTargetLengthDirective,
  buildWritingFrameworkInstruction,
} from './writingFramework.js';

const ARTICLE_SECTION_COUNTS: Record<string, { min: number; max: number; label: string }> = {
  small: { min: 2, max: 4, label: '2 to 4' },
  medium: { min: 4, max: 7, label: '4 to 6' },
  large: { min: 6, max: 10, label: '6 to 10' },
};

export function buildArticlePlanJsonSchema(targetLength: string) {
  const sectionCounts = ARTICLE_SECTION_COUNTS[targetLength] ?? ARTICLE_SECTION_COUNTS['medium']!;
  return {
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
        minItems: sectionCounts.min,
        maxItems: sectionCounts.max,
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
            anchorAfterSection: { type: 'integer', minimum: 1, maximum: 10 },
            description: { type: 'string' },
          },
        },
      },
    },
  } as const;
}

export function buildArticlePlanMessages(
  idea: string,
  options: {
    style: string;
    contentTypes: string[];
    contentBrief: ContentBrief;
    targetLength: string;
  },
): ChatMessage[] {
  const sectionCounts = ARTICLE_SECTION_COUNTS[options.targetLength] ?? ARTICLE_SECTION_COUNTS['medium']!;
  const systemInstruction = [
    'You are a senior editorial strategist. Produce a rigorous article plan for a polished long-form Markdown article.',
    buildWritingFrameworkInstruction(),
    buildStyleDirective(options.style),
    buildRunContextDirective(options.contentTypes),
    buildTargetLengthDirective('article', options.targetLength),
    'Quality bar: produce expert-level structure with high information density, concrete mechanisms, and practical reader outcomes.',
    'Choose an adaptive persuasion structure (AIDA, PAS, or BAB) based on audience need, search intent, and the job-to-be-done of the idea.',
    'Avoid generic filler, empty wrap-up sentences, and vague claims that do not specify how or why.',
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
        '- The article should feel authoritative, practical, and clearly structured for scanning and deep reading.',
        '- Generate a memorable title and a sharp subtitle that promise a concrete benefit, mechanism, or outcome.',
        '- The slug must be lowercase kebab-case and publication-ready.',
        '- The description should work as a concise meta description, align with the shared content brief, and avoid hype language.',
        `- Plan ${sectionCounts.label} strong sections with distinct focus areas and logical progression (no repetitive section intent).`,
        '- Frame section titles to reflect likely search intent or practical reader questions when appropriate.',
        '- Each section description should name the mechanism, evidence type, or practical action that makes the section useful.',
        '- Sections are article-only structure and must not be treated as requirements for non-article channels.',
        '- Include a cover image description and 2 to 3 inline image descriptions.',
        '- Image descriptions must be concrete and contextual, not generic stock-photo phrasing.',
        '- Inline images should be anchored after specific sections using 1-based indexes.',
        '- Avoid AI giveaway phrasing, dramatic cliches, and generic conclusions that add no new information.',
        '',
        'Shared content brief context:',
        `- description: ${options.contentBrief.description}`,
        `- targetAudience: ${options.contentBrief.targetAudience}`,
        `- corePromise: ${options.contentBrief.corePromise}`,
        `- keyPoints: ${options.contentBrief.keyPoints.join(' | ')}`,
        `- voiceNotes: ${options.contentBrief.voiceNotes}`,
        '',
        'Return JSON with all required fields:',
        '- title: string',
        '- subtitle: string',
        '- keywords: array of 3 to 8 strings',
        '- slug: string in lowercase kebab-case',
        '- description: string',
        '- introBrief: string',
        '- outroBrief: string',
        `- sections: array of ${sectionCounts.label} objects, each with title and description strings`,
        '- coverImageDescription: string',
        '- inlineImages: array of 2 to 3 objects, each with anchorAfterSection (integer 1 to 10) and description string',
        '',
        'Do not omit any required fields. Return strict JSON only.',
      ].join('\n'),
    },
  ];
}