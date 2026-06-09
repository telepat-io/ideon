import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import { writeArticleSections } from '../generation/writeSections.js';

const plan = {
  title: 'Test Plan',
  subtitle: 'Subtitle',
  keywords: ['a', 'b', 'c'],
  primaryKeyword: 'a',
  slug: 'test-plan',
  contentType: 'article',
  description: 'Description',
  introBrief: 'Intro brief',
  outroBrief: 'Outro brief',
  sections: [
    { title: 'Section One', description: 'Section one description' },
    { title: 'Section Two', description: 'Section two description' },
  ],
  coverImageDescription: 'Cover',
  inlineImages: [],
};

const llmMetrics = {
  durationMs: 10,
  attempts: 1,
  retries: 0,
  retryBackoffMs: 0,
  modelId: 'deepseek/deepseek-v4-pro',
  usage: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
    providerTotalCostUsd: null,
  },
};

describe('writeArticleSections', () => {
  it('generates dry-run sections when openRouter is unavailable', async () => {
    const onSectionStart = jest.fn();

    const result = await writeArticleSections({
      plan,
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: false,
      onSectionStart,
    });

    expect(result.intro).toContain('Test Plan is the kind of topic');
    expect(result.sections).toHaveLength(2);
    expect(result.outro).toContain('Strong articles rarely emerge from a single pass.');
    expect(result.faq).toContain('### What is the main takeaway from this article?');
    expect(onSectionStart).toHaveBeenCalledWith('Writing introduction');
    expect(onSectionStart).toHaveBeenCalledWith('Writing conclusion');
    expect(onSectionStart).toHaveBeenCalledWith('Writing FAQ');
  });

  it('uses dry-run FAQ when dryRun=true even if OpenRouter is provided', async () => {
    const requestText = jest.fn<() => Promise<string>>();

    const result = await writeArticleSections({
      plan,
      settings: defaultAppSettings,
      openRouter: { requestText } as never,
      dryRun: true,
    });

    expect(requestText).not.toHaveBeenCalled();
    expect(result.faq).toContain('### What is the main takeaway from this article?');
  });

  it('records dry-run FAQ metrics and interaction callbacks', async () => {
    const onLlmMetrics = jest.fn();
    const onInteraction = jest.fn();

    await writeArticleSections({
      plan,
      settings: defaultAppSettings,
      openRouter: { requestText: jest.fn() } as never,
      dryRun: true,
      onLlmMetrics,
      onInteraction,
    });

    expect(onLlmMetrics).toHaveBeenCalledWith('faq', expect.objectContaining({
      durationMs: 0,
      modelId: defaultAppSettings.model,
    }));
    expect(onInteraction).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'sections:faq',
      modelId: 'dry-run',
      status: 'succeeded',
    }));
  });

  it('skips FAQ generation when faqSection is disabled', async () => {
    const result = await writeArticleSections({
      plan,
      settings: {
        ...defaultAppSettings,
        faqSection: false,
      },
      openRouter: null,
      dryRun: false,
    });

    expect(result.faq).toBeUndefined();
  });

  it('uses OpenRouter for intro/sections/outro and normalizes fenced markdown', async () => {
    const requestText = jest
      .fn<(args: { messages?: Array<{ role?: string; content?: string }>; onMetrics?: (metrics: typeof llmMetrics) => void }) => Promise<string>>()
      .mockImplementation(
      async ({ onMetrics }: { onMetrics?: (metrics: typeof llmMetrics) => void }) => {
        onMetrics?.(llmMetrics);
        return '```markdown\nGenerated body\n```';
      },
    );

    const onLlmMetrics = jest.fn();

    const result = await writeArticleSections({
      plan,
      settings: defaultAppSettings,
      openRouter: { requestText } as never,
      dryRun: false,
      onLlmMetrics,
    });

    expect(requestText).toHaveBeenCalledTimes(5);
    expect(result.intro).toBe('Generated body');
    expect(result.sections[0]?.body).toBe('Generated body');
    expect(result.sections[1]?.body).toBe('Generated body');
    expect(result.outro).toBe('Generated body');
    expect(onLlmMetrics).toHaveBeenCalledWith('intro', llmMetrics);
    expect(onLlmMetrics).toHaveBeenCalledWith('section', llmMetrics, 0);
    expect(onLlmMetrics).toHaveBeenCalledWith('section', llmMetrics, 1);
    expect(onLlmMetrics).toHaveBeenCalledWith('outro', llmMetrics);
    expect(onLlmMetrics).toHaveBeenCalledWith('faq', llmMetrics);

    const firstSectionPrompt = requestText.mock.calls[1]?.[0]?.messages?.[1]?.content;
    const secondSectionPrompt = requestText.mock.calls[2]?.[0]?.messages?.[1]?.content;

    expect(firstSectionPrompt).toContain('Article generated so far:');
    expect(firstSectionPrompt).toContain('## Introduction');
    expect(firstSectionPrompt).toContain('Generated body');
    expect(firstSectionPrompt).not.toContain('## Section One');
    expect(firstSectionPrompt).toContain('Target length: about 338 words.');

    expect(secondSectionPrompt).toContain('## Introduction');
    expect(secondSectionPrompt).toContain('## Section One');
    expect(secondSectionPrompt).toContain('Generated body');
    expect(secondSectionPrompt).toContain('Target length: about 337 words.');
  });

  it('throws when generated intro is empty after normalization', async () => {
    let callCount = 0;
    const requestText = jest.fn<() => Promise<string>>().mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        return '   ';
      }

      return 'Section body';
    });

    await expect(
      writeArticleSections({
        plan,
        settings: defaultAppSettings,
        openRouter: { requestText } as never,
        dryRun: false,
      }),
    ).rejects.toThrow('The model returned an empty introduction draft.');
  });

  it('strips a duplicated leading section heading when it matches the section title', async () => {
    const responses = [
      'Generated intro',
      'Generated section one body',
      '## Section Two\n\nGenerated section two body',
      'Generated outro',
      '### Sample question?\n\nGenerated FAQ answer.',
    ];
    let index = 0;

    const requestText = jest.fn<() => Promise<string>>().mockImplementation(async () => {
      const next = responses[index] ?? 'fallback';
      index += 1;
      return next;
    });

    const result = await writeArticleSections({
      plan,
      settings: defaultAppSettings,
      openRouter: { requestText } as never,
      dryRun: false,
    });

    expect(result.sections[1]?.body).toBe('Generated section two body');
    expect(result.sections[1]?.body).not.toMatch(/^##\s+Section Two/i);
  });

  it('does not strip a leading heading when it does not match the section title', async () => {
    let index = 0;
    const requestText = jest.fn<() => Promise<string>>().mockImplementation(async () => {
      index += 1;
      if (index === 2) {
        return '## Different Heading\n\nSection body with subheading.';
      }
      return 'Generated body';
    });

    const result = await writeArticleSections({
      plan,
      settings: defaultAppSettings,
      openRouter: { requestText } as never,
      dryRun: false,
    });

    expect(result.sections[0]?.body).toContain('## Different Heading');
  });
});
