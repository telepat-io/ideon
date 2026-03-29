import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import { planContentBrief } from '../generation/planContentBrief.js';

describe('planContentBrief', () => {
  it('uses dry-run content brief when dryRun=true', async () => {
    const openRouter = {
      requestStructured: jest.fn(),
    };

    const result = await planContentBrief({
      idea: '   ai editorial system   ',
      settings: defaultAppSettings,
      openRouter: openRouter as never,
      dryRun: true,
    });

    expect(openRouter.requestStructured).not.toHaveBeenCalled();
    expect(result.description).toContain('ai editorial system');
  });

  it('uses dry-run content brief when OpenRouter is unavailable', async () => {
    const result = await planContentBrief({
      idea: 'fallback idea',
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: false,
    });

    expect(result.description).toContain('fallback idea');
    expect(result.keyPoints.length).toBeGreaterThan(0);
  });

  it('requests structured brief from OpenRouter when enabled', async () => {
    const expected = {
      title: 'Reliable Output And Links Behavior',
      description: 'Generated brief with concrete execution details and practical examples for teams.',
      targetAudience: 'Creators and operators',
      corePromise: 'Readers gain a clear and actionable plan they can apply immediately.',
      keyPoints: [
        'Start with clear constraints before drafting.',
        'Use specific examples to remove ambiguity.',
        'Adapt framing to each destination channel.',
      ],
      voiceNotes: 'Keep the voice direct, practical, and focused on implementation details.',
      primaryContentType: 'article',
      secondaryContentTypes: ['linkedin-post'],
      secondaryContentStrategy: 'Keep secondary content useful on its own and make it a strong invitation to the primary content.',
    };

    const requestStructured = jest
      .fn<
        (args: {
          parse?: (data: unknown) => unknown;
          settings?: {
            modelSettings?: {
              maxTokens?: number;
              temperature?: number;
              topP?: number;
            };
          };
        }) => Promise<unknown>
      >()
      .mockImplementation(
      async ({ parse }: { parse?: (data: unknown) => unknown }) => {
        const parsed = parse ? parse(expected) : expected;
        return parsed;
      },
    );

    const result = await planContentBrief({
      idea: 'model idea',
      settings: defaultAppSettings,
      openRouter: { requestStructured } as never,
      dryRun: false,
    });

    expect(requestStructured).toHaveBeenCalledTimes(1);
    const requestArgs = requestStructured.mock.calls[0]?.[0];
    expect(requestArgs?.settings?.modelSettings?.maxTokens).toBe(8000);
    expect(requestArgs?.settings?.modelSettings?.temperature).toBe(defaultAppSettings.modelSettings.temperature);
    expect(requestArgs?.settings?.modelSettings?.topP).toBe(defaultAppSettings.modelSettings.topP);
    expect(result).toEqual(expected);
  });
});
