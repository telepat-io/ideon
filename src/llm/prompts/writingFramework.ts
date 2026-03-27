const BASE_WRITING_FRAMEWORK = [
  'Writing framework:',
  'Structure with intent: begin with a clear hook, build ideas in a logical sequence, and close with a strong takeaway.',
  'Specificity over vagueness: use concrete details, named mechanisms, and practical examples instead of abstract filler.',
  'Rhythm and readability: vary sentence length, keep paragraphs purposeful, and avoid repetitive cadence.',
  'Story discipline: use narrative only when it clarifies the idea, and tie every story beat to the reader outcome.',
  'Channel fit: match the native conventions of the target format while preserving clarity and substance.',
].join(' ');

const DO_AVOID_EXAMPLES = [
  'Do examples:',
  'Do write concrete guidance such as "Use a 3-step rollout checklist with owner and deadline".',
  'Do write a precise hook such as "Most teams lose two weeks per launch from unclear handoffs".',
  'Avoid examples:',
  'Avoid generic lines such as "In todays world, innovation is important".',
  'Avoid empty claims such as "This strategy changes everything" without evidence or mechanism.',
].join(' ');

const STYLE_DIRECTIVES: Record<string, string> = {
  professional:
    'Style directive (professional): use crisp, confident language, balanced tone, and decision-ready framing.',
  friendly:
    'Style directive (friendly): use warm, conversational language, simple transitions, and approachable phrasing.',
  technical:
    'Style directive (technical): prioritize precision, explicit terminology, and implementation-level clarity.',
  academic:
    'Style directive (academic): use formal tone, careful qualification, and analytical structure.',
  opinionated:
    'Style directive (opinionated): take a clear stance, defend it with reasoning, and avoid hedging.',
  storytelling:
    'Style directive (storytelling): foreground scene and momentum, then extract practical insight at each turn.',
};

const FALLBACK_STYLE_DIRECTIVE =
  'Style directive: keep the tone consistent, intentional, and aligned with the requested audience and channel.';

export function buildWritingFrameworkInstruction(): string {
  return [BASE_WRITING_FRAMEWORK, DO_AVOID_EXAMPLES].join(' ');
}

export function buildStyleDirective(style: string): string {
  return STYLE_DIRECTIVES[style] ?? FALLBACK_STYLE_DIRECTIVE;
}

export function buildRunContextDirective(contentTypes: string[]): string {
  const normalizedTypes = contentTypes.length > 0 ? contentTypes.join(', ') : 'article';
  return `Run context: requested content types are ${normalizedTypes}. Keep the output aligned with this distribution plan.`;
}