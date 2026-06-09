import type { ChatMessage } from '../openRouterClient.js';
import type { ContentPlan } from '../../types/contentPlan.js';
import type { Publication } from '../../types/publication.js';
import type { Series } from '../../types/series.js';
import { isLongFormContentType } from '../../types/article.js';
import { resolveDefaultInlineImageCount } from '../../config/schema.js';
import {
  buildRunContextDirective,
  buildTargetLengthDirective,
} from './writingFramework.js';
import { buildPrimaryPlanGuideInstruction } from './guideBundles.js';
import { buildEditorialPolicyDirective } from './publicationPolicy.js';
import { buildSeriesDirective } from './seriesPolicy.js';

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

const KEYWORD_PLACEMENT_DIRECTIVE = [
  'Assign primaryKeyword from the keywords list.',
  'Place primaryKeyword in the title and intro brief.',
  'Assign targetKeywords per section (0 to 2 each); every keyword must appear in the title, a section title, or a section targetKeywords list.',
  'At least one secondary keyword should appear in a major H2 section heading when natural.',
].join(' ');

export function buildPrimaryPlanJsonSchema(contentType: string, targetLengthWords: number, providedKeywords?: string[]) {
  if (!isLongFormContentType(contentType)) {
    return buildShortFormPlanJsonSchema();
  }

  return buildLongFormPlanJsonSchema(targetLengthWords, providedKeywords);
}

function buildLongFormPlanJsonSchema(targetLengthWords: number, providedKeywords?: string[]) {
  const sectionCounts = deriveSectionCounts(targetLengthWords);
  const imageCounts = resolveDefaultInlineImageCount(targetLengthWords);
  const hasProvidedKeywords = providedKeywords && providedKeywords.length > 0;

  const required = [
    'contentType',
    'title',
    'subtitle',
    'primaryKeyword',
    ...(hasProvidedKeywords ? [] : ['keywords']),
    'slug',
    'description',
    'introBrief',
    'outroBrief',
    'sections',
    'coverImageDescription',
    'inlineImages',
  ];

  const sectionItemRequired = ['title', 'description', 'targetKeywords'];

  const properties: Record<string, unknown> = {
    contentType: { type: 'string' },
    title: { type: 'string' },
    subtitle: { type: 'string' },
    primaryKeyword: { type: 'string' },
    ...(hasProvidedKeywords ? {} : {
      keywords: {
        type: 'array',
        minItems: 3,
        maxItems: 8,
        items: { type: 'string' },
      },
    }),
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
        required: sectionItemRequired,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          targetKeywords: {
            type: 'array',
            minItems: 0,
            maxItems: 2,
            items: { type: 'string' },
          },
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
  };

  return {
    type: 'object',
    additionalProperties: false,
    required,
    properties,
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
    publication?: Publication | null;
    series?: Series | null;
    keywords?: string[];
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
    publication?: Publication | null;
    series?: Series | null;
    keywords?: string[];
  },
): ChatMessage[] {
  const sectionCounts = deriveSectionCounts(options.targetLength);
  const imageCounts = resolveDefaultInlineImageCount(options.targetLength);
  const hasProvidedKeywords = options.keywords && options.keywords.length > 0;

  const systemInstruction = [
    'You are a senior editorial strategist. Produce a rigorous content plan for a polished long-form Markdown output.',
    buildPrimaryPlanGuideInstruction(options.intent, options.contentType, options.keywords),
    buildRunContextDirective(options.contentTypes),
    buildTargetLengthDirective(options.contentType, options.targetLength),
    buildEditorialPolicyDirective(options.publication ?? null),
    buildSeriesDirective(options.series ?? null),
    KEYWORD_PLACEMENT_DIRECTIVE,
    ...(hasProvidedKeywords
      ? [`The following SEO keywords have been provided and will be used for metadata: ${options.keywords!.join(', ')}.`]
      : []),
    'Return only the requested JSON.',
  ].filter((part) => part.length > 0).join(' ');

  const keywordRequirement = hasProvidedKeywords
    ? ''
    : '- keywords: array of 3 to 8 specific, non-generic strings representing primary entities and search topics (not exact-match duplicates of heading text)';

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
        '- Generate a memorable title (under 60 characters) that leads with the primary entity. Include a sharp subtitle that promises a concrete benefit, mechanism, or outcome.',
        '- The slug must be lowercase kebab-case and publication-ready.',
        '- The description should work as a concise meta description (120-160 characters), include the primary entity, and align with the shared content plan.',
        `- Plan ${sectionCounts.label} strong sections with distinct focus areas and logical progression (no repetitive section intent).`,
        '- Frame section titles to reflect likely search intent or practical reader questions when appropriate.',
        '- Each section description should name the mechanism, evidence type, or practical action that makes the section useful.',
        '- Assign primaryKeyword and per-section targetKeywords (0 to 2 each) so every keyword is covered across title, headings, or targetKeywords.',
        '- Sections are primary-only structure and must not be treated as requirements for non-primary channels.',
        `- Include a cover image description and ${imageCounts.min} to ${imageCounts.max} inline image descriptions.`,
        '- Each inline image must specify which section it follows (anchorAfterSection, starting at 1). Choose sections where visual reinforcement adds the most value.',
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
        '- primaryKeyword: string (must be one of the keywords)',
        keywordRequirement,
        '- slug: string in lowercase kebab-case',
        '- description: string',
        '- introBrief: string',
        '- outroBrief: string',
        `- sections: array of ${sectionCounts.label} objects, each with title, description, and targetKeywords (array of 0 to 2 strings)`,
        '- coverImageDescription: string',
        `- inlineImages: array of ${imageCounts.min} to ${imageCounts.max} objects, each with a description string and an anchorAfterSection number (starting at 1).`,
        '',
        'Do not omit any required fields. Return strict JSON only.',
      ].filter((line) => line.length > 0).join('\n'),
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
    publication?: Publication | null;
    series?: Series | null;
    keywords?: string[];
  },
): ChatMessage[] {
  const systemInstruction = [
    'You are a senior content strategist. Produce a concise content plan for a short-form social media post.',
    buildPrimaryPlanGuideInstruction(options.intent, options.contentType, options.keywords),
    buildRunContextDirective(options.contentTypes),
    buildEditorialPolicyDirective(options.publication ?? null),
    buildSeriesDirective(options.series ?? null),
    'Return only the requested JSON.',
  ].filter((part) => part.length > 0).join(' ');

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
