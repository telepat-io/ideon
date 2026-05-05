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

export function buildImagePromptMessages(
  plan: Pick<ArticlePlan, 'title' | 'subtitle' | 'description'>,
  image: ArticleImagePrompt,
  section?: { title: string; body: string },
): ChatMessage[] {
  const userLines = [
    `Article title: ${plan.title}`,
    `Article subtitle: ${plan.subtitle}`,
    `Article description: ${plan.description}`,
    `Image kind: ${image.kind}`,
    `Image description: ${image.description}`,
  ];

  if (section) {
    userLines.push(
      `Section title: ${section.title}`,
      `Section excerpt: ${section.body.slice(0, 500)}`,
    );
  }

  userLines.push('Write one strong visual prompt describing the image in natural language.');

  return [
    {
      role: 'system',
      content:
        'You write concise, high-signal prompts for text-to-image models. The prompt should be vivid and compositionally clear. Do not include any words, letters, numbers, logos, watermarks, or signage in the image, unless text in the image was explicitly requested. Return only the requested JSON.',
    },
    {
      role: 'user',
      content: userLines.join('\n'),
    },
  ];
}