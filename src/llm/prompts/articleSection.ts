import type { ArticlePlan, ArticleSectionPlan } from '../../types/article.js';
import type { ChatMessage } from '../openRouterClient.js';
import {
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

function buildSystemInstruction(base: string, style: string, contentTypes: string[], targetLength: string): string {
  return [
    base,
    buildWritingFrameworkInstruction(),
    buildStyleDirective(style),
    buildRunContextDirective(contentTypes),
    buildTargetLengthDirective('article', targetLength),
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

export function buildIntroMessages(plan: ArticlePlan, style: string, contentTypes: string[], targetLength: string): ChatMessage[] {
  const baseSystemInstruction = buildSystemInstruction(
    'You write polished editorial prose for Markdown articles. Return only the prose body with no heading and no code fences.',
    style,
    contentTypes,
    targetLength,
  );
  const paragraphCount = INTRO_PARAGRAPH_COUNTS[targetLength] ?? INTRO_PARAGRAPH_COUNTS['medium']!;

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
        '- Hook the reader quickly.',
        '- Set up the argument and tone for the rest of the article.',
      ].join('\n'),
    },
  ];
}

export function buildSectionMessages(
  plan: ArticlePlan,
  section: ArticleSectionPlan,
  style: string,
  contentTypes: string[],
  targetLength: string,
): ChatMessage[] {
  const baseSystemInstruction = buildSystemInstruction(
    'You write in-depth Markdown article sections. Return only the prose body for the section, with no heading and no code fences.',
    style,
    contentTypes,
    targetLength,
  );
  const paragraphCount = SECTION_PARAGRAPH_COUNTS[targetLength] ?? SECTION_PARAGRAPH_COUNTS['medium']!;

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
        `Write the section titled "${section.title}".`,
        `Section focus: ${section.description}`,
        'Requirements:',
        `- ${paragraphCount} paragraphs.`,
        '- Be concrete and specific.',
        '- Use short Markdown lists only if they materially improve clarity.',
      ].join('\n'),
    },
  ];
}

export function buildOutroMessages(plan: ArticlePlan, style: string, contentTypes: string[], targetLength: string): ChatMessage[] {
  const baseSystemInstruction = buildSystemInstruction(
    'You write polished editorial conclusions for Markdown articles. Return only the prose body with no heading and no code fences.',
    style,
    contentTypes,
    targetLength,
  );
  const paragraphCount = OUTRO_PARAGRAPH_COUNTS[targetLength] ?? OUTRO_PARAGRAPH_COUNTS['medium']!;

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
        '- Synthesize the main argument.',
        '- End with a strong, thoughtful closing line.',
      ].join('\n'),
    },
  ];
}