const BASE_WRITING_FRAMEWORK = [
  'Writing framework:',
  'Structure with intent: open with a clear hook, build ideas in a logical progression, and close with a concrete takeaway.',
  'Information density mandate: each sentence must add new value, mechanism, evidence, or action; avoid empty recap lines.',
  'Specificity over vagueness: use concrete details, named mechanisms, and practical examples instead of abstract filler.',
  'Rhythm and readability: vary sentence length with short, medium, and occasional longer lines to avoid monotony and keep pace.',
  'Scannability and signposting: make section flow obvious with strong headings, parallel list structure, and clear paragraph openings.',
  'Active voice and concrete subjects: make the actor explicit and keep claims verifiable.',
  'Story discipline: use narrative only when it clarifies the idea, and tie every story beat to reader outcome.',
  'Channel fit: match native conventions of the target format while preserving clarity and substance.',
  'Authenticity filter: prefer plain professional language over polished AI-sounding phrasing or generic corporate jargon.',
].join(' ');

const DO_AVOID_EXAMPLES = [
  'Do examples:',
  'Do write concrete guidance such as "Use a 3-step rollout checklist with owner, deadline, and acceptance signal".',
  'Do write a precise hook such as "Most teams lose two weeks per launch because approvals have no clear owner".',
  'Do make outcomes measurable with numbers, constraints, or operational tradeoffs when possible.',
  'Avoid examples:',
  'Avoid generic lines such as "In todays world, innovation is important".',
  'Avoid empty claims such as "This strategy changes everything" without evidence or mechanism.',
  'Avoid over-polished transitions and dramatic cliches when a simple connector is clearer.',
  'Avoid ending paragraphs with summary-only filler that adds no new information.',
].join(' ');

const STYLE_DIRECTIVES: Record<string, string> = {
  professional:
    'Style directive (professional): use crisp, confident language, balanced tone, and decision-ready framing. Favor precise terms, low hype, and explicit constraints.',
  friendly:
    'Style directive (friendly): use warm, conversational language, simple transitions, and approachable phrasing. Use natural contractions and short punchy lines without losing specificity.',
  technical:
    'Style directive (technical): prioritize precision, explicit terminology, and implementation-level clarity. Preserve canonical technical terms, avoid unnecessary synonyms, and state assumptions directly.',
  academic:
    'Style directive (academic): use formal tone, careful qualification, and analytical structure. Distinguish evidence from inference and avoid rhetorical overstatement.',
  opinionated:
    'Style directive (opinionated): take a clear stance, defend it with reasoning, and avoid hedging. Make tradeoffs explicit and support claims with concrete examples.',
  storytelling:
    'Style directive (storytelling): foreground scene and momentum, then extract practical insight at each turn. Use sensory or situational detail sparingly and always tie it to utility.',
};

const FALLBACK_STYLE_DIRECTIVE =
  'Style directive: keep tone consistent, intentional, and aligned with requested audience and channel. Prefer specific, active, and concrete language over generic polish.';

export function buildWritingFrameworkInstruction(): string {
  return [BASE_WRITING_FRAMEWORK, DO_AVOID_EXAMPLES].join(' ');
}

export function buildStyleDirective(style: string): string {
  return STYLE_DIRECTIVES[style] ?? FALLBACK_STYLE_DIRECTIVE;
}

export function buildRunContextDirective(contentTypes: string[]): string {
  const normalizedTypes = contentTypes.length > 0 ? contentTypes.join(', ') : 'article';
  return `Run context: requested content types are ${normalizedTypes}. Keep output aligned with this distribution plan, maintain one shared content brief, and adapt structure per channel without duplicating article-only scaffolding.`;
}

type TargetLengthTier = {
  label: string;
  article: string;
  'blog-post': string;
  'x-thread': string;
  'x-post': string;
  'reddit-post': string;
  'linkedin-post': string;
  newsletter: string;
  'landing-page-copy': string;
  fallback: string;
};

const TARGET_LENGTH_TIERS: Record<string, TargetLengthTier> = {
  small: {
    label: 'small',
    article:
      'Target length (small article): 300–800 words total, 2–4 sections, ~2–3 paragraphs per section. One core idea, lightly explored. Minimal storytelling. Use for quick explainers.',
    'blog-post':
      'Target length (small blog post): 500–900 words. Answer-focused, minimal fluff, straight to value. Good for long-tail SEO and short how-to queries.',
    'x-thread':
      'Target length (small x-thread): 3–5 posts, each post one clear idea with momentum from one step to the next.',
    'x-post':
      'Target length (small x-post): 70–150 characters, one idea, pure hook or insight.',
    'reddit-post':
      'Target length (small reddit post): 150–400 words. Quick question or observation, minimal formatting.',
    'linkedin-post':
      'Target length (small linkedin post): 50–150 words, 3–6 lines, single insight.',
    newsletter:
      'Target length (small newsletter): 300–800 words, 1–2 sections, one core idea.',
    'landing-page-copy':
      'Target length (small landing page): 150–400 words total. Sections: headline, subhead, CTA only.',
    fallback:
      'Target length (small): 50–300 words. Compressed insight density. Prioritise hooks and key points over elaboration.',
  },
  medium: {
    label: 'medium',
    article:
      'Target length (medium article): 800–1,800 words total, 4–6 sections, ~3–5 paragraphs per section. 2–3 core ideas with examples and light narrative. Default best-performing size.',
    'blog-post':
      'Target length (medium blog post): 900–1,800 words. Structured with clear H2s, includes examples and takeaways. Sweet spot for SEO and readability.',
    'x-thread':
      'Target length (medium x-thread): 5–8 posts, each post concise and additive, with clear narrative progression.',
    'x-post':
      'Target length (medium x-post): 150–280 characters or 2–4 short lines, 1–2 ideas with slight expansion.',
    'reddit-post':
      'Target length (medium reddit post): 400–1,200 words. Context, experience, and question. Conversational tone.',
    'linkedin-post':
      'Target length (medium linkedin post): 150–400 words, 8–15 short lines, story plus takeaway. Best performing range.',
    newsletter:
      'Target length (medium newsletter): 800–1,800 words, 2–4 sections, curated insights. Ideal default.',
    'landing-page-copy':
      'Target length (medium landing page): 400–900 words. Sections: hero, benefits, social proof, CTA.',
    fallback:
      'Target length (medium): 300–1,200 words. Balanced depth and breadth with examples and actionable takeaways.',
  },
  large: {
    label: 'large',
    article:
      'Target length (large article): 1,800–3,500+ words total, 6–10 sections, ~5–8 paragraphs per section. Deep exploration with frameworks, strong internal linking potential. Use for SEO authority and pillar content.',
    'blog-post':
      'Target length (large blog post): 1,800–3,000 words. Comprehensive coverage with FAQs, examples, and edge cases. Use when competing for high-value keywords.',
    'x-thread':
      'Target length (large x-thread): 8–12 posts, each post one punchy idea with strong narrative progression. Every post must independently hook.',
    'x-post':
      'Target length (large x-post): 200–300 characters, one strong stance plus one supporting detail or proof.',
    'reddit-post':
      'Target length (large reddit post): 1,200–2,500+ words. Detailed breakdown with story, lessons, numbers, and mistakes.',
    'linkedin-post':
      'Target length (large linkedin post): 400–900 words. Structured storytelling, multiple insights. Use sparingly for deep authority posts.',
    newsletter:
      'Target length (large newsletter): 1,800–3,000 words. Multi-topic edition with deep commentary. Use for weekly deep dives.',
    'landing-page-copy':
      'Target length (large landing page): 900–2,000+ words. Includes objection handling, FAQs, detailed benefits, and case studies.',
    fallback:
      'Target length (large): 1,200–3,500+ words. Deep exploration with frameworks, multiple examples, and expanded narrative.',
  },
};

export function buildTargetLengthDirective(contentType: string, targetLength: string): string {
  const tier = TARGET_LENGTH_TIERS[targetLength] ?? TARGET_LENGTH_TIERS['medium']!;
  return (tier[contentType as keyof TargetLengthTier] as string | undefined) ?? tier.fallback;
}