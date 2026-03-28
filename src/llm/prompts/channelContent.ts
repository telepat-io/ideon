import type { ChatMessage } from '../openRouterClient.js';
import type { ContentBrief } from '../../types/contentBrief.js';
import {
  buildStyleDirective,
  buildTargetLengthDirective,
  buildWritingFrameworkInstruction,
} from './writingFramework.js';

const CHANNEL_RULES: Record<string, string> = {
  'blog-post': [
    'Write a complete Markdown blog post with a clear title, short lead, scannable subheadings, and practical takeaways.',
    'Favor concrete examples, compact paragraphs, and actionable guidance over theory.',
  ].join(' '),
  'x-post': [
    'Write native X content with short lines, high signal, and a strong hook in the first line.',
    'If xMode is single, return one concise post. If xMode is thread, return a numbered thread with one post per line prefixed like "1/7".',
    'Each thread line must be self-contained but still advance the same core narrative.',
  ].join(' '),
  'reddit-post': [
    'Write a Reddit-native post in plain, authentic voice with practical detail and no marketing gloss.',
    'Use first-hand framing, candid constraints, and only minimal formatting that improves readability.',
  ].join(' '),
  'linkedin-post': [
    'Write a LinkedIn-native post for professional clarity and engagement.',
    'Open with a strong two-line hook, use spaced short paragraphs, and end with one focused reflection or CTA.',
  ].join(' '),
  newsletter: [
    'Write a concise newsletter piece with a subject-line-quality opening and clear section flow.',
    'Prioritize practical value density, strong transitions, and sustained reader momentum.',
  ].join(' '),
  'landing-page-copy': [
    'Write landing-page copy in Markdown with headline, value proposition, proof-oriented body blocks, objection handling, and clear CTA text.',
    'Keep claims specific, credible, and measurable. Avoid hype language.',
  ].join(' '),
  article: 'Write a polished Markdown article.',
};

export function buildSingleShotContentMessages(options: {
  idea: string;
  contentType: string;
  style: string;
  outputIndex: number;
  outputCountForType: number;
  xMode?: string;
  contentBrief: ContentBrief;
  articleReferenceMarkdown?: string;
  targetLength: string;
}): ChatMessage[] {
  const channelRule = CHANNEL_RULES[options.contentType] ?? 'Write channel-native Markdown content.';
  const articleContext = options.articleReferenceMarkdown
    ? [
        'Reference article context (use as anchor source, but adapt natively for the requested channel):',
        options.articleReferenceMarkdown,
      ].join('\n\n')
    : 'No article anchor exists for this run. Build directly from the idea.';

  return [
    {
      role: 'system',
      content: [
        'You are a senior content strategist and copywriter.',
        `Write exactly one ${options.contentType} output.`,
        buildWritingFrameworkInstruction(),
        buildStyleDirective(options.style),
        channelRule,
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Idea: ${options.idea}`,
        `Content type: ${options.contentType}`,
        `Output index: ${options.outputIndex} of ${options.outputCountForType}`,
        options.xMode ? `X mode: ${options.xMode}` : '',
        '',
        'Shared content brief (must guide this output):',
        `- description: ${options.contentBrief.description}`,
        `- targetAudience: ${options.contentBrief.targetAudience}`,
        `- corePromise: ${options.contentBrief.corePromise}`,
        `- keyPoints: ${options.contentBrief.keyPoints.join(' | ')}`,
        `- voiceNotes: ${options.contentBrief.voiceNotes}`,
        '',
        articleContext,
        '',
        'Output requirements:',
        '- Return only final Markdown content with no preamble.',
        '- Keep structure native to the target channel.',
        buildTargetLengthDirective(options.contentType, options.targetLength),
      ]
        .filter((line) => line.length > 0)
        .join('\n'),
    },
  ];
}
