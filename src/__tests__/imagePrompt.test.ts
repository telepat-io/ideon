import { buildImagePromptMessages, imagePromptSchema } from '../llm/prompts/imagePrompt.js';

describe('image prompt helpers', () => {
  it('exposes a strict prompt schema', () => {
    expect(imagePromptSchema).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['prompt'],
      properties: {
        prompt: { type: 'string' },
      },
    });
  });

  it('builds image prompt messages with article and image context', () => {
    const messages = buildImagePromptMessages(
      {
        title: 'Romanian Food Guide',
        subtitle: 'Regional Flavors',
        description: 'A guide to regional cuisine',
      },
      {
        id: 'inline-1',
        kind: 'inline',
        prompt: '',
        description: 'A rustic meal on a wooden table',
        anchorAfterSection: 1,
      },
    );

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
    expect(messages[1]?.content).toContain('Article title: Romanian Food Guide');
    expect(messages[1]?.content).toContain('Image kind: inline');
    expect(messages[1]?.content).toContain('Image description: A rustic meal on a wooden table');
    expect(messages[1]?.content).not.toContain('Section title');
  });

  it('includes section context in user message for inline images when provided', () => {
    const messages = buildImagePromptMessages(
      {
        title: 'Romanian Food Guide',
        subtitle: 'Regional Flavors',
        description: 'A guide to regional cuisine',
      },
      {
        id: 'inline-1',
        kind: 'inline',
        prompt: '',
        description: 'A rustic meal on a wooden table',
        anchorAfterSection: 2,
      },
      { title: 'Traditional Recipes', body: 'This section covers classic Romanian dishes including sarmale and mămăligă.' },
    );

    expect(messages[1]?.content).toContain('Section title: Traditional Recipes');
    expect(messages[1]?.content).toContain('Section excerpt: This section covers');
  });
});
