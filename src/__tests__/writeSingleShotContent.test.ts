import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import { writeSingleShotContent } from '../generation/writeSingleShotContent.js';

const contentBrief = {
  description: 'Shared campaign brief',
  targetAudience: 'Builders',
  corePromise: 'Clear execution',
  keyPoints: ['p1', 'p2'],
  voiceNotes: 'Practical tone',
};

describe('writeSingleShotContent', () => {
  it('returns dry-run content with article anchor note when anchor exists', async () => {
    const result = await writeSingleShotContent({
      idea: 'Idea',
      contentType: 'linkedin-post',
      style: 'professional',
      outputIndex: 1,
      outputCountForType: 3,
      xMode: undefined,
      articleReferenceMarkdown: '# Article context',
      contentBrief,
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: true,
    });

    expect(result).toContain('# linkedin-post draft 1');
    expect(result).toContain('Variant: 1/3');
    expect(result).toContain('Anchored to generated article context from this run.');
  });

  it('returns dry-run content without article anchor note when no anchor exists', async () => {
    const result = await writeSingleShotContent({
      idea: 'Idea',
      contentType: 'x-post',
      style: 'professional',
      outputIndex: 2,
      outputCountForType: 2,
      xMode: 'thread',
      articleReferenceMarkdown: undefined,
      contentBrief,
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: false,
    });

    expect(result).toContain('No article anchor available; generated directly from idea.');
  });

  it('uses OpenRouter text generation when dry-run is disabled', async () => {
    const requestText = jest.fn<() => Promise<string>>().mockResolvedValue('generated channel copy');

    const result = await writeSingleShotContent({
      idea: 'Idea',
      contentType: 'article',
      style: 'technical',
      outputIndex: 1,
      outputCountForType: 1,
      xMode: undefined,
      articleReferenceMarkdown: undefined,
      contentBrief,
      settings: defaultAppSettings,
      openRouter: { requestText } as never,
      dryRun: false,
    });

    expect(requestText).toHaveBeenCalledTimes(1);
    expect(result).toBe('generated channel copy');
  });
});
