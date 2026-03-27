import type { ArticlePlan, ArticleSectionPlan } from '../../types/article.js';
import type { ChatMessage } from '../openRouterClient.js';

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

export function buildIntroMessages(plan: ArticlePlan): ChatMessage[] {
  return [
    {
      role: 'system',
      content: 'You write polished editorial prose for Markdown articles. Return only the prose body with no heading and no code fences.',
    },
    {
      role: 'user',
      content: [
        sharedPlanContext(plan),
        '',
        `Write the article introduction using this brief: ${plan.introBrief}`,
        'Requirements:',
        '- 2 to 4 paragraphs.',
        '- Hook the reader quickly.',
        '- Set up the argument and tone for the rest of the article.',
      ].join('\n'),
    },
  ];
}

export function buildSectionMessages(plan: ArticlePlan, section: ArticleSectionPlan): ChatMessage[] {
  return [
    {
      role: 'system',
      content: 'You write in-depth Markdown article sections. Return only the prose body for the section, with no heading and no code fences.',
    },
    {
      role: 'user',
      content: [
        sharedPlanContext(plan),
        '',
        `Write the section titled "${section.title}".`,
        `Section focus: ${section.description}`,
        'Requirements:',
        '- 3 to 6 paragraphs.',
        '- Be concrete and specific.',
        '- Use short Markdown lists only if they materially improve clarity.',
      ].join('\n'),
    },
  ];
}

export function buildOutroMessages(plan: ArticlePlan): ChatMessage[] {
  return [
    {
      role: 'system',
      content: 'You write polished editorial conclusions for Markdown articles. Return only the prose body with no heading and no code fences.',
    },
    {
      role: 'user',
      content: [
        sharedPlanContext(plan),
        '',
        `Write the article conclusion using this brief: ${plan.outroBrief}`,
        'Requirements:',
        '- 2 to 3 paragraphs.',
        '- Synthesize the main argument.',
        '- End with a strong, thoughtful closing line.',
      ].join('\n'),
    },
  ];
}