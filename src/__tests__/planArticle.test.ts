import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import type { ContentBrief } from '../types/contentBrief.js';

const resolveUniqueSlugMock = jest.fn<(markdownOutputDir: string, baseSlug: string) => Promise<string>>();

jest.unstable_mockModule('../output/filesystem.js', () => ({
  resolveUniqueSlug: resolveUniqueSlugMock,
}));

const { planArticle } = await import('../generation/planArticle.js');

const contentBrief: ContentBrief = {
  description: 'A practical workflow guide.',
  targetAudience: 'Builders',
  corePromise: 'Clear next steps.',
  keyPoints: ['point-a', 'point-b'],
  voiceNotes: 'Direct and practical.',
};

describe('planArticle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveUniqueSlugMock.mockResolvedValue('unique-article-slug');
  });

  it('uses dry-run plan when no OpenRouter client is provided', async () => {
    const result = await planArticle({
      idea: '  building better publishing systems  ',
      contentBrief,
      settings: defaultAppSettings,
      markdownOutputDir: '/tmp/out',
      openRouter: null,
      dryRun: false,
    });

    expect(resolveUniqueSlugMock).toHaveBeenCalledWith('/tmp/out', 'building-better-publishing-systems');
    expect(result.slug).toBe('unique-article-slug');
    expect(result.sections.length).toBeGreaterThanOrEqual(4);
    expect(result.keywords.length).toBeLessThanOrEqual(8);
  });

  it('uses dry-run mode even when OpenRouter exists when dryRun=true', async () => {
    const openRouter = {
      requestStructured: jest.fn(),
    };

    await planArticle({
      idea: 'dry run wins',
      contentBrief,
      settings: defaultAppSettings,
      markdownOutputDir: '/tmp/out',
      openRouter: openRouter as never,
      dryRun: true,
    });

    expect(openRouter.requestStructured).not.toHaveBeenCalled();
  });

  it('uses structured response and enforces keyword/image limits', async () => {
    const requestStructured = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      title: 'Generated Title',
      subtitle: 'Generated Subtitle',
      keywords: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9'],
      slug: '',
      description: 'Generated description',
      introBrief: 'Intro brief',
      outroBrief: 'Outro brief',
      sections: [
        { title: 'S1', description: 'D1' },
        { title: 'S2', description: 'D2' },
      ],
      coverImageDescription: 'Cover image',
      inlineImages: [
        { anchorAfterSection: 1, description: 'A' },
        { anchorAfterSection: 2, description: 'B' },
        { anchorAfterSection: 3, description: 'C should be removed' },
        { anchorAfterSection: 1, description: 'D extra' },
      ],
    });

    const openRouter = {
      requestStructured,
    };

    const result = await planArticle({
      idea: 'ignored when model output exists',
      contentBrief,
      settings: defaultAppSettings,
      markdownOutputDir: '/tmp/out',
      openRouter: openRouter as never,
      dryRun: false,
    });

    expect(requestStructured).toHaveBeenCalledTimes(1);
    expect(resolveUniqueSlugMock).toHaveBeenCalledWith('/tmp/out', 'generated-title');
    expect(result.slug).toBe('unique-article-slug');
    expect(result.keywords).toHaveLength(8);
    expect(result.inlineImages).toEqual([
      { anchorAfterSection: 1, description: 'A' },
      { anchorAfterSection: 2, description: 'B' },
      { anchorAfterSection: 1, description: 'D extra' },
    ]);
  });

  it('executes parse callback when structured response is requested', async () => {
    const validPlan = {
      title: 'Generated Title',
      subtitle: 'Generated Subtitle',
      keywords: ['k1', 'k2', 'k3'],
      slug: 'generated-title',
      description: 'Generated description',
      introBrief: 'Intro brief with enough detail to pass schema validation checks.',
      outroBrief: 'Outro brief with enough detail to pass schema validation checks.',
      sections: [
        { title: 'S1', description: 'Section description one is detailed enough.' },
        { title: 'S2', description: 'Section description two is detailed enough.' },
        { title: 'S3', description: 'Section description three is detailed enough.' },
        { title: 'S4', description: 'Section description four is detailed enough.' },
      ],
      coverImageDescription: 'Cover image description with enough detail.',
      inlineImages: [
        { anchorAfterSection: 1, description: 'Inline description one with enough detail.' },
        { anchorAfterSection: 2, description: 'Inline description two with enough detail.' },
      ],
    };

    const requestStructured = jest
      .fn<(args: { parse?: (data: unknown) => unknown }) => Promise<unknown>>()
      .mockImplementation(
      async ({ parse }: { parse?: (data: unknown) => unknown }) => {
        const parsed = parse ? parse(validPlan) : validPlan;
        return parsed;
      },
    );

    await planArticle({
      idea: 'parse callback check',
      contentBrief,
      settings: defaultAppSettings,
      markdownOutputDir: '/tmp/out',
      openRouter: { requestStructured } as never,
      dryRun: false,
    });

    expect(requestStructured).toHaveBeenCalledTimes(1);
  });
});
