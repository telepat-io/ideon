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

  userLines.push('Write one strong prompt for a clean editorial illustration. Avoid text overlays or watermarks.');

  return [
    {
      role: 'system',
      content:
        'You write concise, high-signal prompts for text-to-image models. The prompt should be vivid, compositionally clear, and suitable for editorial illustration. Return only the requested JSON.',
    },
    {
      role: 'user',
      content: userLines.join('\n'),
    },
  ];
}