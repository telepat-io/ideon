import type { ArticlePlan, ArticleImagePrompt } from '../../types/article.js';
import type { ChatMessage } from '../openRouterClient.js';

export const imagePromptSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['prompt'],
  properties: {
    prompt: { type: 'string' },
  },
} as const;

export function buildImagePromptMessages(plan: ArticlePlan, image: ArticleImagePrompt): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You write concise, high-signal prompts for text-to-image models. The prompt should be vivid, compositionally clear, and suitable for editorial illustration. Return only the requested JSON.',
    },
    {
      role: 'user',
      content: [
        `Article title: ${plan.title}`,
        `Article subtitle: ${plan.subtitle}`,
        `Article description: ${plan.description}`,
        `Image kind: ${image.kind}`,
        `Image description: ${image.description}`,
        'Write one strong prompt for a clean editorial illustration. Avoid text overlays or watermarks.',
      ].join('\n'),
    },
  ];
}