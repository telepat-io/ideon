import type { ChatMessage } from '../openRouterClient.js';
import type { ContentPlan } from '../../types/contentPlan.js';
import { isLongFormContentType } from '../../types/article.js';
import { resolveDefaultInlineImageCount } from '../../config/schema.js';
import {
  buildRunContextDirective,
  buildTargetLengthDirective,
} from './writingFramework.js';
import { buildPrimaryPlanGuideInstruction } from './guideBundles.js';

function deriveSectionCounts(targetLengthWords: number): { min: number; max: number; label: string } {
  const normalizedWords = Number.isFinite(targetLengthWords) && targetLengthWords > 0 ? targetLengthWords : 900;
  const center = Math.max(2, Math.min(10, Math.round(normalizedWords / 220)));
  const min = Math.max(2, center - 1);
  const max = Math.min(10, center + 1);
  return {
    min,
    max,
    label: `${min} to ${max}`,
  };
}

export function buildPrimaryPlanJsonSchema(contentType: string, targetLengthWords: number) {
  if (!isLongFormContentType(contentType)) {
    return buildShortFormPlanJsonSchema();
  }

  return buildLongFormPlanJsonSchema(targetLengthWords);
}

function buildLongFormPlanJsonSchema(targetLengthWords: number) {
  const sectionCounts = deriveSectionCounts(targetLengthWords);
  const imageCounts = resolveDefaultInlineImageCount(targetLengthWords);
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'contentType',
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
      contentType: { type: 'string' },
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
        minItems: imageCounts.min,
        maxItems: imageCounts.max,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['description', 'anchorAfterSection'],
          properties: {
            description: { type: 'string' },
            anchorAfterSection: { type: 'number', minimum: 1 },
          },
        },
      },
    },
  } as const;
}

function buildShortFormPlanJsonSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'contentType',
      'title',
      'slug',
      'description',
      'coverImageDescription',
      'angle',
    ],
    properties: {
      contentType: { type: 'string' },
      title: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string' },
      coverImageDescription: { type: 'string' },
      angle: { type: 'string' },
    },
  } as const;
}

export function buildPrimaryPlanMessages(
  idea: string,
  options: {
    contentType: string;
    intent: string;
    contentTypes: string[];
    contentPlan: ContentPlan;
    targetLength: number;
  },
): ChatMessage[] {
  if (!isLongFormContentType(options.contentType)) {
    return buildShortFormPlanMessages(idea, options);
  }

  return buildLongFormPlanMessages(idea, options);
}

function buildLongFormPlanMessages(
  idea: string,
  options: {
    contentType: string;
    intent: string;
    contentTypes: string[];
    contentPlan: ContentPlan;
    targetLength: number;
  },
): ChatMessage[] {
  const sectionCounts = deriveSectionCounts(options.targetLength);
  const imageCounts = resolveDefaultInlineImageCount(options.targetLength);
  const systemInstruction = [
    'You are a senior editorial strategist. Produce a rigorous content plan for a polished long-form Markdown output.',
    buildPrimaryPlanGuideInstruction(options.intent, options.contentType),
    buildRunContextDirective(options.contentTypes),
    buildTargetLengthDirective(options.contentType, options.targetLength),
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
        `Create a ${options.contentType} plan from this idea:`,
        idea,
        '',
        'Requirements:',
        '- The content should feel authoritative, practical, and clearly structured for scanning and deep reading.',
        '- Generate a memorable title and a sharp subtitle that promise a concrete benefit, mechanism, or outcome.',
        '- The slug must be lowercase kebab-case and publication-ready.',
        '- The description should work as a concise meta description and align with the shared content plan.',
        `- Plan ${sectionCounts.label} strong sections with distinct focus areas and logical progression (no repetitive section intent).`,
        '- Frame section titles to reflect likely search intent or practical reader questions when appropriate.',
        '- Each section description should name the mechanism, evidence type, or practical action that makes the section useful.',
        '- Sections are primary-only structure and must not be treated as requirements for non-primary channels.',
        `- Include a cover image description and ${imageCounts.min} to ${imageCounts.max} inline image descriptions.`,
        '- Each inline image must specify which section it follows (anchorAfterSection, 1-based index). Choose sections where visual reinforcement adds the most value.',
        '- Image descriptions should capture the general concept and mood — the exact text-to-image prompt will be refined later using the actual section content.',
        '- Image descriptions must be concrete and contextual, not generic stock-photo phrasing.',
        '',
        'Shared content plan context:',
        `- description: ${options.contentPlan.description}`,
        `- targetAudience: ${options.contentPlan.targetAudience}`,
        `- corePromise: ${options.contentPlan.corePromise}`,
        `- keyPoints: ${options.contentPlan.keyPoints.join(' | ')}`,
        `- voiceNotes: ${options.contentPlan.voiceNotes}`,
        '',
        'Return JSON with all required fields:',
        `- contentType: set to "${options.contentType}" exactly`,
        '- title: string',
        '- subtitle: string',
        '- keywords: array of 3 to 8 strings',
        '- slug: string in lowercase kebab-case',
        '- description: string',
        '- introBrief: string',
        '- outroBrief: string',
        `- sections: array of ${sectionCounts.label} objects, each with title and description strings`,
        '- coverImageDescription: string',
        `- inlineImages: array of ${imageCounts.min} to ${imageCounts.max} objects, each with a description string and an anchorAfterSection number (1-based section index)`,
        '',
        'Do not omit any required fields. Return strict JSON only.',
      ].join('\n'),
    },
  ];
}

function buildShortFormPlanMessages(
  idea: string,
  options: {
    contentType: string;
    intent: string;
    contentTypes: string[];
    contentPlan: ContentPlan;
    targetLength: number;
  },
): ChatMessage[] {
  const systemInstruction = [
    'You are a senior content strategist. Produce a concise content plan for a short-form social media post.',
    buildPrimaryPlanGuideInstruction(options.intent, options.contentType),
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
        `Create a ${options.contentType} plan from this idea:`,
        idea,
        '',
        'Requirements:',
        '- Generate a sharp, attention-grabbing title suitable for social media.',
        '- The slug must be lowercase kebab-case and publication-ready.',
        '- The description should capture the core message in one sentence.',
        '- The angle should describe the hook, framing, or unique take that makes this post compelling.',
        '- Include a cover image description that works as a visual anchor for the post.',
        '- Do NOT include sections, subtitles, keywords, intros, or outros — this is short-form content.',
        '',
        'Shared content plan context:',
        `- description: ${options.contentPlan.description}`,
        `- targetAudience: ${options.contentPlan.targetAudience}`,
        `- corePromise: ${options.contentPlan.corePromise}`,
        `- keyPoints: ${options.contentPlan.keyPoints.join(' | ')}`,
        `- voiceNotes: ${options.contentPlan.voiceNotes}`,
        '',
        'Return JSON with all required fields:',
        `- contentType: set to "${options.contentType}" exactly`,
        '- title: string (short, punchy, social-media-ready)',
        '- slug: string in lowercase kebab-case',
        '- description: string (one-sentence core message)',
        '- coverImageDescription: string',
        '- angle: string (the hook or framing that makes this post work)',
        '',
        'Do not omit any required fields. Return strict JSON only.',
      ].join('\n'),
    },
  ];
}
