import type { ArticlePlan, ArticleSectionPlan } from '../../types/article.js';
import type { Publication } from '../../types/publication.js';
import type { Series } from '../../types/series.js';
import { resolveTargetLengthAlias } from '../../config/schema.js';
import type { ChatMessage } from '../openRouterClient.js';
import {
  buildRunContextDirective,
  buildTargetLengthDirective,
} from './writingFramework.js';
import {
  buildIntroGuideInstruction,
  buildOutroGuideInstruction,
  buildSectionGuideInstruction,
} from './guideBundles.js';
import { buildAuthorDirective, type AuthorRunContext } from './authorPolicy.js';
import { buildEditorialPolicyDirective } from './publicationPolicy.js';
import { buildSeriesDirective } from './seriesPolicy.js';

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

type GuideCallType = 'intro' | 'section' | 'outro';

function buildSystemInstruction(
  base: string,
  callType: GuideCallType,
  style: string,
  intent: string,
  contentTypes: string[],
  targetLengthWords: number,
  contentType: string,
  publication: Publication | null,
  series: Series | null,
  authorContext: AuthorRunContext | null = null,
  keywords?: string[],
): string {
  const guideInstruction = callType === 'intro'
    ? buildIntroGuideInstruction(style, intent, contentType, keywords)
    : callType === 'section'
      ? buildSectionGuideInstruction(style, intent, contentType, keywords)
      : buildOutroGuideInstruction(style, intent, contentType);

  return [
    base,
    guideInstruction,
    buildRunContextDirective(contentTypes),
    buildTargetLengthDirective(contentType, targetLengthWords),
    buildEditorialPolicyDirective(publication),
    buildSeriesDirective(series),
    buildAuthorDirective(authorContext),
  ].filter((part) => part.length > 0).join(' ');
}

function sharedPlanContext(plan: ArticlePlan): string {
  const sectionOutline = plan.sections
    .map((section, index) => {
      const targets = section.targetKeywords?.length
        ? ` [targetKeywords: ${section.targetKeywords.join(', ')}]`
        : '';
      return `${index + 1}. ${section.title}: ${section.description}${targets}`;
    })
    .join('\n');

  return [
    `Title: ${plan.title}`,
    `Subtitle: ${plan.subtitle}`,
    `Description: ${plan.description}`,
    `Primary keyword: ${plan.primaryKeyword}`,
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

function sectionKeywordTargets(plan: ArticlePlan, section: ArticleSectionPlan): string[] {
  if (section.targetKeywords && section.targetKeywords.length > 0) {
    return section.targetKeywords;
  }
  return plan.keywords.filter((kw) => kw !== plan.primaryKeyword);
}

export function buildIntroMessages(
  plan: ArticlePlan,
  style: string,
  intent: string,
  contentTypes: string[],
  targetLengthWords: number,
  introTargetWords: number,
  publication: Publication | null = null,
  series: Series | null = null,
  authorContext: AuthorRunContext | null = null,
): ChatMessage[] {
  const baseSystemInstruction = buildSystemInstruction(
    'You write polished editorial prose for Markdown articles. Return only the prose body with no heading and no code fences.',
    'intro',
    style,
    intent,
    contentTypes,
    targetLengthWords,
    plan.contentType,
    publication,
    series,
    authorContext,
    plan.keywords,
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
        ...(plan.primaryKeyword
          ? [`- Include the primary keyword "${plan.primaryKeyword}" naturally within the first 100 words.`]
          : []),
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
  publication: Publication | null = null,
  series: Series | null = null,
  authorContext: AuthorRunContext | null = null,
): ChatMessage[] {
  const baseSystemInstruction = buildSystemInstruction(
    'You write in-depth Markdown article sections. Return only the prose body for the section, with no heading and no code fences.',
    'section',
    style,
    intent,
    contentTypes,
    targetLengthWords,
    plan.contentType,
    publication,
    series,
    authorContext,
    plan.keywords,
  );
  const targetLengthAlias = resolveTargetLengthAlias(targetLengthWords);
  const paragraphCount = SECTION_PARAGRAPH_COUNTS[targetLengthAlias] ?? SECTION_PARAGRAPH_COUNTS['medium']!;
  const keywordTargets = sectionKeywordTargets(plan, section);

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
        '- Open with a 40-to-60-word definition-first paragraph that directly answers the section heading.',
        '- If the section opens with **Key takeaway:**, that labeled line must be at least 40 words (definition-first), matching on-page-essentials.',
        '- Be concrete and specific. Support key claims with statistics, data points, or authoritative citations.',
        '- Include practitioner insight only when supported by the author profile or experience notes; otherwise use third-person expert voice or [AUTHOR: add first-hand example here] placeholders.',
        '- Continue naturally from the article draft so far without rehashing prior sections.',
        '- Use short Markdown lists only if they materially improve clarity.',
        ...(keywordTargets.length > 0
          ? [`- Weave these SEO keywords into body prose where they fit the section topic naturally: ${keywordTargets.join(', ')}. Do not force them if they break readability.`]
          : []),
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
  publication: Publication | null = null,
  series: Series | null = null,
  authorContext: AuthorRunContext | null = null,
): ChatMessage[] {
  const baseSystemInstruction = buildSystemInstruction(
    'You write polished editorial conclusions for Markdown articles. Return only the prose body with no heading and no code fences.',
    'outro',
    style,
    intent,
    contentTypes,
    targetLengthWords,
    plan.contentType,
    publication,
    series,
    authorContext,
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
        ...(plan.primaryKeyword
          ? [`- If natural, mention the primary entity "${plan.primaryKeyword}" once without keyword stuffing.`]
          : []),
      ].join('\n'),
    },
  ];
}
