import type { ArticlePlan, ArticleSectionPlan } from '../../types/article.js';
import { resolveTargetLengthAlias } from '../../config/schema.js';
import type { ChatMessage } from '../openRouterClient.js';
import {
  buildIntentDirective,
  buildRunContextDirective,
  buildStyleDirective,
  buildTargetLengthDirective,
  buildWritingFrameworkInstruction,
} from './writingFramework.js';

const INTRO_PARAGRAPH_COUNTS: Record<string, string> = {
  small: '1 to 2',
  medium: '2 to 4',
  large: '3 to 5',
};

const SECTION_PARAGRAPH_COUNTS: Record<string, string> = {
  small: '2 to 3',
  medium: '3 to 6',
  large: '5 to 8',
};

const OUTRO_PARAGRAPH_COUNTS: Record<string, string> = {
  small: '1 to 2',
  medium: '2 to 3',
  large: '3 to 5',
};

function buildSystemInstruction(
  base: string,
  style: string,
  intent: string,
  contentTypes: string[],
  targetLengthWords: number,
): string {
  return [
    base,
    buildWritingFrameworkInstruction(),
    buildStyleDirective(style),
    buildIntentDirective(intent),
    buildRunContextDirective(contentTypes),
    buildTargetLengthDirective('article', targetLengthWords),
  ].join(' ');
}

function sharedPlanContext(plan: ArticlePlan): string {
  const sectionOutline = plan.sections
    .map((section, index) => `${index + 1}. ${section.title}: ${section.description}`)
    .join('\n');

  return [
    `Title: ${plan.title}`,
    `Subtitle: ${plan.subtitle}`,
    `Description: ${plan.description}`,
    `Keywords: ${plan.keywords.join(', ')}`,
    'Outline:',
    sectionOutline,
  ].join('\n');
}

function sharedDraftContext(articleSoFar: string): string {
  const normalized = articleSoFar.trim();
  if (!normalized) {
    return 'Article generated so far:\n[No prior article content yet.]';
  }

  return [
    'Article generated so far:',
    normalized,
  ].join('\n');
}

export function buildIntroMessages(
  plan: ArticlePlan,
  style: string,
  intent: string,
  contentTypes: string[],
  targetLengthWords: number,
  introTargetWords: number,
): ChatMessage[] {
  const baseSystemInstruction = buildSystemInstruction(
    'You write polished editorial prose for Markdown articles. Return only the prose body with no heading and no code fences.',
    style,
    intent,
    contentTypes,
    targetLengthWords,
  );
  const targetLengthAlias = resolveTargetLengthAlias(targetLengthWords);
  const paragraphCount = INTRO_PARAGRAPH_COUNTS[targetLengthAlias] ?? INTRO_PARAGRAPH_COUNTS['medium']!;

  return [
    {
      role: 'system',
      content: baseSystemInstruction,
    },
    {
      role: 'user',
      content: [
        sharedPlanContext(plan),
        '',
        `Write the article introduction using this brief: ${plan.introBrief}`,
        'Requirements:',
        `- ${paragraphCount} paragraphs.`,
        `- Target length: about ${introTargetWords} words.`,
        '- Hook the reader quickly.',
        '- Set up the argument and tone for the rest of the article.',
      ].join('\n'),
    },
  ];
}

export function buildSectionMessages(
  plan: ArticlePlan,
  section: ArticleSectionPlan,
  articleSoFar: string,
  style: string,
  intent: string,
  contentTypes: string[],
  targetLengthWords: number,
  sectionTargetWords: number,
): ChatMessage[] {
  const baseSystemInstruction = buildSystemInstruction(
    'You write in-depth Markdown article sections. Return only the prose body for the section, with no heading and no code fences.',
    style,
    intent,
    contentTypes,
    targetLengthWords,
  );
  const targetLengthAlias = resolveTargetLengthAlias(targetLengthWords);
  const paragraphCount = SECTION_PARAGRAPH_COUNTS[targetLengthAlias] ?? SECTION_PARAGRAPH_COUNTS['medium']!;

  return [
    {
      role: 'system',
      content: baseSystemInstruction,
    },
    {
      role: 'user',
      content: [
        sharedPlanContext(plan),
        '',
        sharedDraftContext(articleSoFar),
        '',
        `Write the section titled "${section.title}".`,
        `Section focus: ${section.description}`,
        'Requirements:',
        `- ${paragraphCount} paragraphs.`,
        `- Target length: about ${sectionTargetWords} words.`,
        '- Be concrete and specific.',
        '- Continue naturally from the article draft so far without rehashing prior sections.',
        '- Use short Markdown lists only if they materially improve clarity.',
      ].join('\n'),
    },
  ];
}

export function buildOutroMessages(
  plan: ArticlePlan,
  style: string,
  intent: string,
  contentTypes: string[],
  targetLengthWords: number,
  outroTargetWords: number,
): ChatMessage[] {
  const baseSystemInstruction = buildSystemInstruction(
    'You write polished editorial conclusions for Markdown articles. Return only the prose body with no heading and no code fences.',
    style,
    intent,
    contentTypes,
    targetLengthWords,
  );
  const targetLengthAlias = resolveTargetLengthAlias(targetLengthWords);
  const paragraphCount = OUTRO_PARAGRAPH_COUNTS[targetLengthAlias] ?? OUTRO_PARAGRAPH_COUNTS['medium']!;

  return [
    {
      role: 'system',
      content: baseSystemInstruction,
    },
    {
      role: 'user',
      content: [
        sharedPlanContext(plan),
        '',
        `Write the article conclusion using this brief: ${plan.outroBrief}`,
        'Requirements:',
        `- ${paragraphCount} paragraphs.`,
        `- Target length: about ${outroTargetWords} words.`,
        '- Synthesize the main argument.',
        '- End with a strong, thoughtful closing line.',
      ].join('\n'),
    },
  ];
}