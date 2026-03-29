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
  'x-thread': [
    'Write native X thread content with short lines, high signal, and a strong hook in the first line.',
    'Return a numbered thread with one post per line prefixed like "1/7".',
    'Each thread line must be self-contained but still advance the same core narrative.',
  ].join(' '),
  'x-post': [
    'Write native X content with short lines, high signal, and a strong hook in the first line.',
    'Return one concise post only. Do not return numbered thread lines.',
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
  role: 'primary' | 'secondary';
  primaryContentType: string;
  style: string;
  outputIndex: number;
  outputCountForType: number;
  contentBrief: ContentBrief;
  articleReferenceMarkdown?: string;
  targetLength: string;
}): ChatMessage[] {
  const channelRule = CHANNEL_RULES[options.contentType] ?? 'Write channel-native Markdown content.';
  const articleContext = options.articleReferenceMarkdown
    ? [
        'Reference primary context (use as anchor source, but adapt natively for the requested channel):',
        options.articleReferenceMarkdown,
      ].join('\n\n')
    : 'No primary anchor exists for this run. Build directly from the idea.';

  const roleDirective = options.role === 'primary'
    ? [
        'This output is the primary content for the run.',
        'Deliver the full canonical value for this idea on the requested channel.',
      ].join(' ')
    : [
        `This output is secondary content and must promote or incite interest in the primary ${options.primaryContentType} content.`,
        'Keep it independently useful, avoid sounding like an ad, and include channel-native cues that point back to the primary narrative.',
      ].join(' ');

  return [
    {
      role: 'system',
      content: [
        'You are a senior content strategist and copywriter.',
        `Write exactly one ${options.contentType} output.`,
        buildWritingFrameworkInstruction(),
        buildStyleDirective(options.style),
        roleDirective,
        channelRule,
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Idea: ${options.idea}`,
        `Content type: ${options.contentType}`,
        `Role: ${options.role}`,
        `Primary content type: ${options.primaryContentType}`,
        `Output index: ${options.outputIndex} of ${options.outputCountForType}`,
        '',
        'Shared content brief (must guide this output):',
        `- title: ${options.contentBrief.title}`,
        `- description: ${options.contentBrief.description}`,
        `- targetAudience: ${options.contentBrief.targetAudience}`,
        `- corePromise: ${options.contentBrief.corePromise}`,
        `- keyPoints: ${options.contentBrief.keyPoints.join(' | ')}`,
        `- voiceNotes: ${options.contentBrief.voiceNotes}`,
        `- primaryContentType: ${options.contentBrief.primaryContentType}`,
        `- secondaryContentTypes: ${options.contentBrief.secondaryContentTypes.join(' | ') || 'none'}`,
        `- secondaryContentStrategy: ${options.contentBrief.secondaryContentStrategy}`,
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
