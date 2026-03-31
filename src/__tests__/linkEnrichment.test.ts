import {
  buildLinkCandidatesJsonSchema,
  buildLinkCandidatesMessages,
  buildUrlResolutionMessages,
} from '../llm/prompts/linkEnrichment.js';

describe('linkEnrichment prompts', () => {
  it('builds a strict candidate schema with bounded expressions', () => {
    expect(buildLinkCandidatesJsonSchema()).toEqual({
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
    });
  });

  it('builds candidate selection messages with content type and editorial constraints', () => {
    const messages = buildLinkCandidatesMessages('OpenRouter improves routing.', 'article');

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[0]?.content).toContain('senior editor selecting candidate phrases');
    expect(messages[0]?.content).toContain('Return strict JSON only.');
    expect(messages[1]?.role).toBe('user');
    expect(messages[1]?.content).toContain('Content type: article');
    expect(messages[1]?.content).toContain('OpenRouter improves routing.');
    expect(messages[1]?.content).toContain('Return JSON: {"expressions": ["..."] }');
  });

  it('builds URL resolution messages with article and paragraph context', () => {
    const messages = buildUrlResolutionMessages({
      articleTitle: 'Editorial Linking',
      articleDescription: 'How to enrich content responsibly.',
      paragraph: 'OpenRouter can route requests across providers.',
      expression: 'OpenRouter',
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.content).toContain('Return only one line: the selected URL, or "none"');
    expect(messages[1]?.content).toContain('Article title: Editorial Linking');
    expect(messages[1]?.content).toContain('Article description: How to enrich content responsibly.');
    expect(messages[1]?.content).toContain('Text to add link to (input text): "OpenRouter"');
    expect(messages[1]?.content).toContain('OpenRouter can route requests across providers.');
    expect(messages[1]?.content).toContain('Output format: URL only, or "none".');
  });
});