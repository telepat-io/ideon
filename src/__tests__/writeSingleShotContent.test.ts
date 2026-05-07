import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import { writeSingleShotContent } from '../generation/writeSingleShotContent.js';

const contentPlan = {
  title: 'Shared Campaign Plan Title',
  description: 'Shared campaign plan',
  targetAudience: 'Builders',
  corePromise: 'Clear execution',
  keyPoints: ['point one', 'point two', 'point three'],
  voiceNotes: 'Practical tone',
  primaryContentType: 'article',
  secondaryContentTypes: ['linkedin-post'],
  secondaryContentStrategy: 'Support the primary angle while standing alone.',
};

describe('writeSingleShotContent', () => {
  it('returns dry-run content with article anchor note when anchor exists', async () => {
    const result = await writeSingleShotContent({
      idea: 'Idea',
      contentType: 'linkedin-post',
      primaryContentType: 'article',
      style: 'professional',
      intent: 'tutorial',
      outputIndex: 1,
      outputCountForType: 3,
      articleReferenceMarkdown: '# Article context',
      contentPlan,
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: true,
    });

    expect(result).toContain('# linkedin-post draft 1');
    expect(result).toContain('Variant: 1/3');
    expect(result).toContain('Anchored to generated primary context from this run.');
  });

  it('returns dry-run content without article anchor note when no anchor exists', async () => {
    const result = await writeSingleShotContent({
      idea: 'Idea',
      contentType: 'x-thread',
      primaryContentType: 'article',
      style: 'professional',
      intent: 'tutorial',
      outputIndex: 2,
      outputCountForType: 2,
      articleReferenceMarkdown: undefined,
      contentPlan,
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: false,
    });

    expect(result).toContain('No primary anchor available; generated directly from idea.');
  });

  it('uses OpenRouter text generation when dry-run is disabled', async () => {
    const requestText = jest.fn<() => Promise<string>>().mockResolvedValue('generated channel copy');

    const result = await writeSingleShotContent({
      idea: 'Idea',
      contentType: 'article',
      primaryContentType: 'article',
      role: 'primary',
      style: 'technical',
      intent: 'deep-dive-analysis',
      outputIndex: 1,
      outputCountForType: 1,
      articleReferenceMarkdown: undefined,
      contentPlan,
      settings: defaultAppSettings,
      openRouter: { requestText } as never,
      dryRun: false,
    });

    expect(requestText).toHaveBeenCalledTimes(1);
    expect(result).toBe('generated channel copy');
  });

  it('includes plan context in dry-run content when plan is provided', async () => {
    const result = await writeSingleShotContent({
      idea: 'Idea',
      contentType: 'x-post',
      primaryContentType: 'x-post',
      role: 'primary',
      style: 'professional',
      intent: 'announcement',
      outputIndex: 1,
      outputCountForType: 1,
      articleReferenceMarkdown: undefined,
      contentPlan,
      plan: {
        contentType: 'x-post',
        title: 'Ship Faster',
        slug: 'ship-faster',
        description: 'A concise post about shipping.',
        coverImageDescription: 'Cover description',
        angle: 'Concrete wins over hype.',
      },
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: true,
    });

    expect(result).toContain('Plan title: Ship Faster');
    expect(result).toContain('Plan description: A concise post about shipping.');
    expect(result).toContain('Angle: Concrete wins over hype.');
  });

  it('omits plan context in dry-run content when plan is not provided', async () => {
    const result = await writeSingleShotContent({
      idea: 'Idea',
      contentType: 'x-post',
      primaryContentType: 'x-post',
      role: 'primary',
      style: 'professional',
      intent: 'announcement',
      outputIndex: 1,
      outputCountForType: 1,
      articleReferenceMarkdown: undefined,
      contentPlan,
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: true,
    });

    expect(result).toContain('No primary plan available.');
    expect(result).not.toContain('Plan title:');
  });

  it('passes plan context to OpenRouter messages when provided', async () => {
    const requestText = jest.fn<() => Promise<string>>().mockResolvedValue('generated copy with plan');

    await writeSingleShotContent({
      idea: 'Idea',
      contentType: 'linkedin-post',
      primaryContentType: 'x-post',
      role: 'secondary',
      style: 'professional',
      intent: 'tutorial',
      outputIndex: 1,
      outputCountForType: 1,
      articleReferenceMarkdown: undefined,
      contentPlan,
      plan: {
        contentType: 'x-post',
        title: 'Ship Faster',
        slug: 'ship-faster',
        description: 'A concise post about shipping.',
        coverImageDescription: 'Cover description',
        angle: 'Concrete wins over hype.',
      },
      settings: defaultAppSettings,
      openRouter: { requestText } as never,
      dryRun: false,
    });

    expect(requestText).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = ((requestText.mock.calls[0] as any)[0] as { messages: Array<{ role: string; content: string }> }).messages;
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage?.content).toContain('Primary content plan (use to guide tone, angle, and structure)');
    expect(userMessage?.content).toContain('title: Ship Faster');
    expect(userMessage?.content).toContain('angle: Concrete wins over hype.');
  });
});
