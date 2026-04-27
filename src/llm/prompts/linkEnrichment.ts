import type { ChatMessage } from '../openRouterClient.js';

export function buildLinkCandidatesJsonSchema(maxLinks = 10) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['expressions'],
    properties: {
      expressions: {
        type: 'array',
        minItems: 0,
        maxItems: maxLinks,
        items: { type: 'string', minLength: 2 },
      },
    },
  } as const;
}

export function buildLinkCandidatesMessages(content: string, contentType: string, maxLinks = 10): ChatMessage[] {
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
        `Select up to ${maxLinks} expressions that should become links in this content.`,
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
        'Use web search to find the best single URL to attach as a link to the provided text in context.',
        'Start with the exact input text as the search phrase before trying broader variants.',
        'Reject results that do not directly match the topic and paragraph meaning.',
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
        `Text to add link to (input text): "${options.expression}"`,
        '',
        'Paragraph context:',
        options.paragraph,
        '',
        'Search the web and choose the best URL for this inline link in this context.',
        'Output format: URL only, or "none".',
      ].join('\n'),
    },
  ];
}
