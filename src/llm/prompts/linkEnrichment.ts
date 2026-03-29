import type { ChatMessage } from '../openRouterClient.js';

export function buildLinkCandidatesJsonSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['expressions'],
    properties: {
      expressions: {
        type: 'array',
        minItems: 0,
        maxItems: 10,
        items: { type: 'string', minLength: 2 },
      },
    },
  } as const;
}

export function buildLinkCandidatesMessages(content: string, contentType: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a senior editor selecting candidate phrases for editorial links.',
        'Pick only expressions that materially improve reader understanding when linked to a high-quality source.',
        'Prefer named entities, standards, tools, places, institutions, and specific technical concepts.',
        'Reject generic nouns, fluff, and phrases too broad to map to one authoritative URL.',
        'Return strict JSON only.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Content type: ${contentType}`,
        'Select up to 10 expressions that should become links in this content.',
        'Each expression must be copied exactly from the text and be useful to link.',
        '',
        'Content:',
        content,
        '',
        'Return JSON: {"expressions": ["..."] }',
      ].join('\n'),
    },
  ];
}

export function buildUrlResolutionMessages(options: {
  articleTitle: string;
  articleDescription: string;
  paragraph: string;
  expression: string;
}): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a web research assistant for editorial linking.',
        'Use web search to find the best single URL for the requested expression in context.',
        'Start with the exact expression as the search phrase before trying broader variants.',
        'Reject results that do not directly match the expression and paragraph meaning.',
        'Prefer canonical, trustworthy, stable sources that match the paragraph intent.',
        'Return only one line: the selected URL, or "none" when no strong match exists.',
        'Do not return markdown, explanations, bullets, or extra text.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Article title: ${options.articleTitle}`,
        `Article description: ${options.articleDescription}`,
        `Exact expression token: "${options.expression}"`,
        `Expression to link: ${options.expression}`,
        '',
        'Paragraph context:',
        options.paragraph,
        '',
        'Search the web and choose the best URL for this inline link in this context.',
        'Use the exact expression first, then only accept close canonical variants when meaning is unchanged.',
        'If search evidence does not clearly support this expression in this paragraph context, return "none".',
        'Output format: URL only, or "none".',
      ].join('\n'),
    },
  ];
}
