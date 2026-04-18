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
    const requestArgs = requestStructured.mock.calls[0]?.[0] as {
      messages?: Array<{ role?: string; content?: string }>;
      settings?: {
        modelSettings?: {
          maxTokens?: number;
          temperature?: number;
          topP?: number;
        };
      };
    } | undefined;
    expect(requestArgs?.settings?.modelSettings?.maxTokens).toBe(8000);
    expect(requestArgs?.settings?.modelSettings?.temperature).toBe(defaultAppSettings.modelSettings.temperature);
    expect(requestArgs?.settings?.modelSettings?.topP).toBe(defaultAppSettings.modelSettings.topP);
    const userMessage = requestArgs?.messages?.find((message: { role?: string }) => message.role === 'user') as
      | { content?: string }
      | undefined;
    expect(userMessage?.content).toContain('Audience seed (optional user guidance): A general, non-specific audience.');
    expect(result).toEqual(expected);
  });

  it('injects provided audience seed into prompt and dry-run brief', async () => {
    const requestStructured = jest
      .fn<
        (args: {
          parse?: (data: unknown) => unknown;
          messages?: Array<{ role?: string; content?: string }>;
        }) => Promise<unknown>
      >()
      .mockImplementation(async ({ parse }) => {
        const payload = {
          title: 'Audience Seed Coverage',
          description: 'Checks audience propagation through prompt composition.',
          targetAudience: 'Refined audience response from model.',
          corePromise: 'Concrete outcomes with context.',
          keyPoints: ['Point one', 'Point two', 'Point three'],
          voiceNotes: 'Direct and practical.',
          primaryContentType: 'article',
          secondaryContentTypes: ['linkedin-post'],
          secondaryContentStrategy: 'Standalone secondary outputs with bridge to primary.',
        };

        return parse ? parse(payload) : payload;
      });

    const audienceSeed = 'Romanian startup operators building thought leadership from scratch';

    await planContentBrief({
      idea: 'model idea with audience',
      targetAudienceHint: audienceSeed,
      settings: defaultAppSettings,
      openRouter: { requestStructured } as never,
      dryRun: false,
    });

    const requestArgs = requestStructured.mock.calls[0]?.[0] as { messages?: Array<{ role?: string; content?: string }> } | undefined;
    const userMessage = requestArgs?.messages?.find((message: { role?: string }) => message.role === 'user') as
      | { content?: string }
      | undefined;
    expect(userMessage?.content).toContain(`Audience seed (optional user guidance): ${audienceSeed}`);
    expect(userMessage?.content).toContain('Enrich it with concrete context');

    const dryRunResult = await planContentBrief({
      idea: 'dry-run audience propagation',
      targetAudienceHint: audienceSeed,
      settings: defaultAppSettings,
      openRouter: null,
      dryRun: true,
    });
    expect(dryRunResult.targetAudience).toContain(audienceSeed);
  });

  it('allows empty secondary strategy for primary-only runs', async () => {
    const requestStructured = jest
      .fn<
        (args: {
          parse?: (data: unknown) => unknown;
          messages?: Array<{ role?: string; content?: string }>;
        }) => Promise<unknown>
      >()
      .mockImplementation(async ({ parse }) => {
        const payload = {
          title: 'Primary-Only Shared Brief',
          description: 'Primary-only run where no secondary content guidance is required in the brief output.',
          targetAudience: 'Operators publishing one long-form piece with no social derivatives this run.',
          corePromise: 'Readers gain concrete execution guidance for a single, primary output workflow.',
          keyPoints: ['Point one with detail', 'Point two with detail', 'Point three with detail'],
          voiceNotes: 'Direct, practical guidance that avoids fluff or generic abstractions.',
          primaryContentType: 'article',
          secondaryContentTypes: [],
          secondaryContentStrategy: '',
        };

        return parse ? parse(payload) : payload;
      });

    const result = await planContentBrief({
      idea: 'primary-only generation',
      settings: defaultAppSettings,
      openRouter: { requestStructured } as never,
      dryRun: false,
    });

    const requestArgs = requestStructured.mock.calls[0]?.[0] as { messages?: Array<{ role?: string; content?: string }> } | undefined;
    const userMessage = requestArgs?.messages?.find((message: { role?: string }) => message.role === 'user') as
      | { content?: string }
      | undefined;

    expect(userMessage?.content).toContain('secondaryContentTypes: include these types exactly: none.');
    expect(userMessage?.content).toContain('secondaryContentStrategy: set to an empty string because this run has no secondary outputs.');
    expect(result.secondaryContentStrategy).toBe('');
  });
});
