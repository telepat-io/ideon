import type { ChatMessage } from '../openRouterClient.js';
import type { ContentPlan } from '../../types/contentPlan.js';
import {
  buildTargetLengthDirective,
} from './writingFramework.js';
import { buildChannelContentGuideInstruction } from './guideBundles.js';

function buildOutputShapeConstraint(contentType: string): string {
  if (contentType === 'x-thread') {
    return 'Return a numbered thread with one post per line prefixed like "1/7".';
  }

  if (contentType === 'x-post') {
    return 'Return one concise post only. Do not return numbered thread lines.';
  }

  return '';
}

export function buildSingleShotContentMessages(options: {
  idea: string;
  contentType: string;
  role: 'primary' | 'secondary';
  primaryContentType: string;
  style: string;
  intent: string;
  outputIndex: number;
  outputCountForType: number;
  contentPlan: ContentPlan;
  articleReferenceMarkdown?: string;
  targetLength: number;
}): ChatMessage[] {
  const outputShapeConstraint = buildOutputShapeConstraint(options.contentType);
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
        buildChannelContentGuideInstruction(options.style, options.intent, options.contentType),
        roleDirective,
        outputShapeConstraint,
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
        'Shared content plan (must guide this output):',
        `- title: ${options.contentPlan.title}`,
        `- description: ${options.contentPlan.description}`,
        `- targetAudience: ${options.contentPlan.targetAudience}`,
        `- corePromise: ${options.contentPlan.corePromise}`,
        `- keyPoints: ${options.contentPlan.keyPoints.join(' | ')}`,
        `- voiceNotes: ${options.contentPlan.voiceNotes}`,
        `- primaryContentType: ${options.contentPlan.primaryContentType}`,
        `- secondaryContentTypes: ${options.contentPlan.secondaryContentTypes.join(' | ') || 'none'}`,
        `- secondaryContentStrategy: ${options.contentPlan.secondaryContentStrategy}`,
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
