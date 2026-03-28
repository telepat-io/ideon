import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import { writeArticleSections } from '../generation/writeSections.js';

const plan = {
  title: 'Test Plan',
  subtitle: 'Subtitle',
  keywords: ['a', 'b', 'c'],
  slug: 'test-plan',
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
  modelId: 'moonshotai/kimi-k2.5',
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
    expect(onSectionStart).toHaveBeenCalledWith('Writing introduction');
    expect(onSectionStart).toHaveBeenCalledWith('Writing conclusion');
  });

  it('uses OpenRouter for intro/sections/outro and normalizes fenced markdown', async () => {
    const requestText = jest
      .fn<(args: { onMetrics?: (metrics: typeof llmMetrics) => void }) => Promise<string>>()
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

    expect(requestText).toHaveBeenCalledTimes(4);
    expect(result.intro).toBe('Generated body');
    expect(result.sections[0]?.body).toBe('Generated body');
    expect(result.sections[1]?.body).toBe('Generated body');
    expect(result.outro).toBe('Generated body');
    expect(onLlmMetrics).toHaveBeenCalledWith('intro', llmMetrics);
    expect(onLlmMetrics).toHaveBeenCalledWith('section', llmMetrics, 0);
    expect(onLlmMetrics).toHaveBeenCalledWith('section', llmMetrics, 1);
    expect(onLlmMetrics).toHaveBeenCalledWith('outro', llmMetrics);
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
});
