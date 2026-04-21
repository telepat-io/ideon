import { resolveTargetLengthAlias } from '../../config/schema.js';

export function buildRunContextDirective(contentTypes: string[]): string {
  const normalizedTypes = contentTypes.length > 0 ? contentTypes.join(', ') : 'article';
  return `Run context: requested content types are ${normalizedTypes}. Keep output aligned with this distribution plan, maintain one shared content brief, and adapt structure per channel without duplicating article-only scaffolding.`;
}

type TargetLengthTier = {
  label: string;
  article: string;
  'blog-post': string;
  'linkedin-post': string;
  newsletter: string;
  'press-release': string;
  'reddit-post': string;
  'science-paper': string;
  'x-post': string;
  'x-thread': string;
  fallback: string;
};

const TARGET_LENGTH_TIERS: Record<string, TargetLengthTier> = {
  small: {
    label: 'small',
    article:
      'Target length (small article): 300–800 words total, 2–4 sections, ~2–3 paragraphs per section. One core idea, lightly explored. Minimal storytelling. Use for quick explainers.',
    'blog-post':
      'Target length (small blog post): 500–900 words. Answer-focused, minimal fluff, straight to value. Good for long-tail SEO and short how-to queries.',
    'linkedin-post':
      'Target length (small linkedin post): 50–150 words, 3–6 lines, single insight.',
    newsletter:
      'Target length (small newsletter): 300–800 words, 1–2 sections, one core idea.',
    'press-release':
      'Target length (small press release): 300–700 words with headline, lead, core announcement details, and concise quote block.',
    'reddit-post':
      'Target length (small reddit post): 150–400 words. Quick question or observation, minimal formatting.',
    'science-paper':
      'Target length (small science paper): 800–1,400 words condensed structure with abstract-style opener, methods summary, and key findings.',
    'x-post':
      'Target length (small x-post): 70–150 characters, one idea, pure hook or insight.',
    'x-thread':
      'Target length (small x-thread): 3–5 posts, each post one clear idea with momentum from one step to the next.',
    fallback:
      'Target length (small): 50–300 words. Compressed insight density. Prioritise hooks and key points over elaboration.',
  },
  medium: {
    label: 'medium',
    article:
      'Target length (medium article): 800–1,800 words total, 4–6 sections, ~3–5 paragraphs per section. 2–3 core ideas with examples and light narrative. Default best-performing size.',
    'blog-post':
      'Target length (medium blog post): 900–1,800 words. Structured with clear H2s, includes examples and takeaways. Sweet spot for SEO and readability.',
    'linkedin-post':
      'Target length (medium linkedin post): 150–400 words, 8–15 short lines, story plus takeaway. Best performing range.',
    newsletter:
      'Target length (medium newsletter): 800–1,800 words, 2–4 sections, curated insights. Ideal default.',
    'press-release':
      'Target length (medium press release): 700–1,200 words with complete release anatomy, context, quote, and next-step details.',
    'reddit-post':
      'Target length (medium reddit post): 400–1,200 words. Context, experience, and question. Conversational tone.',
    'science-paper':
      'Target length (medium science paper): 1,400–2,600 words with clearer methodological depth, results framing, and discussion of limitations.',
    'x-post':
      'Target length (medium x-post): 150–280 characters or 2–4 short lines, 1–2 ideas with slight expansion.',
    'x-thread':
      'Target length (medium x-thread): 5–8 posts, each post concise and additive, with clear narrative progression.',
    fallback:
      'Target length (medium): 300–1,200 words. Balanced depth and breadth with examples and actionable takeaways.',
  },
  large: {
    label: 'large',
    article:
      'Target length (large article): 1,800–3,500+ words total, 6–10 sections, ~5–8 paragraphs per section. Deep exploration with frameworks, strong internal linking potential. Use for SEO authority and pillar content.',
    'blog-post':
      'Target length (large blog post): 1,800–3,000 words. Comprehensive coverage with FAQs, examples, and edge cases. Use when competing for high-value keywords.',
    'linkedin-post':
      'Target length (large linkedin post): 400–900 words. Structured storytelling, multiple insights. Use sparingly for deep authority posts.',
    newsletter:
      'Target length (large newsletter): 1,800–3,000 words. Multi-topic edition with deep commentary. Use for weekly deep dives.',
    'press-release':
      'Target length (large press release): 1,200–2,000+ words with full context, expanded quote material, and detailed release implications.',
    'reddit-post':
      'Target length (large reddit post): 1,200–2,500+ words. Detailed breakdown with story, lessons, numbers, and mistakes.',
    'science-paper':
      'Target length (large science paper): 2,600–4,500+ words with full narrative arc from research question through methods, results, and implications.',
    'x-post':
      'Target length (large x-post): 200–300 characters, one strong stance plus one supporting detail or proof.',
    'x-thread':
      'Target length (large x-thread): 8–12 posts, each post one punchy idea with strong narrative progression. Every post must independently hook.',
    fallback:
      'Target length (large): 1,200–3,500+ words. Deep exploration with frameworks, multiple examples, and expanded narrative.',
  },
};

export function buildTargetLengthDirective(contentType: string, targetLengthWords: number): string {
  const normalizedTargetLengthWords = Number.isFinite(targetLengthWords) && targetLengthWords > 0
    ? Math.round(targetLengthWords)
    : 900;
  const alias = resolveTargetLengthAlias(normalizedTargetLengthWords);
  const tier = TARGET_LENGTH_TIERS[alias] ?? TARGET_LENGTH_TIERS['medium']!;
  if (contentType === 'article') {
    return `Target length (article): aim for about ${normalizedTargetLengthWords} words total while keeping section depth and structure consistent.`;
  }

  const baseDirective = (tier[contentType as keyof TargetLengthTier] as string | undefined) ?? tier.fallback;
  return `${baseDirective} Overall run target is about ${normalizedTargetLengthWords} words.`;
}