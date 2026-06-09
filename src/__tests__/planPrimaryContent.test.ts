import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import type { ContentPlan } from '../types/contentPlan.js';

const resolveUniqueSlugMock = jest.fn<(markdownOutputDir: string, baseSlug: string) => Promise<string>>();

jest.unstable_mockModule('../output/filesystem.js', () => ({
  resolveUniqueSlug: resolveUniqueSlugMock,
}));

const { planPrimaryContent } = await import('../generation/planPrimaryContent.js');

const contentPlan: ContentPlan = {
  title: 'Practical Workflow Guide For Builders',
  description: 'A practical workflow guide.',
  targetAudience: 'Builders',
  corePromise: 'Clear next steps.',
  keyPoints: ['Point with detail a', 'Point with detail b', 'Point with detail c'],
  voiceNotes: 'Direct and practical.',
  primaryContentType: 'article',
  secondaryContentTypes: ['x-post'],
  secondaryContentStrategy: 'Secondary content should stand alone while sending readers to the article for full depth.',
};

describe('planPrimaryContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveUniqueSlugMock.mockResolvedValue('unique-slug');
  });

  describe('dry-run path', () => {
    it('produces a full long-form plan when contentType is article', async () => {
      const result = await planPrimaryContent({
        idea: 'building better publishing systems',
        contentType: 'article',
        contentPlan,
        settings: defaultAppSettings,
        markdownOutputDir: '/tmp/out',
        openRouter: null,
        dryRun: false,
      });

      expect(resolveUniqueSlugMock).toHaveBeenCalledWith('/tmp/out', 'building-better-publishing-systems');
      expect(result.slug).toBe('unique-slug');
      expect(result.contentType).toBe('article');
      expect(result.sections).toBeDefined();
      expect(result.sections!.length).toBeGreaterThanOrEqual(4);
      expect(result.keywords).toBeDefined();
      expect(result.keywords!.length).toBeLessThanOrEqual(8);
      expect(result.inlineImages).toBeDefined();
      expect(result.inlineImages!.length).toBeLessThanOrEqual(3);
      expect(result.title).toBe('Building Better Publishing Systems');
    });

    it('produces a minimal short-form plan when contentType is x-post', async () => {
      const result = await planPrimaryContent({
        idea: 'shipping AI workflows',
        contentType: 'x-post',
        contentPlan,
        settings: defaultAppSettings,
        markdownOutputDir: '/tmp/out',
        openRouter: null,
        dryRun: false,
      });

      expect(resolveUniqueSlugMock).toHaveBeenCalledWith('/tmp/out', 'shipping-ai-workflows');
      expect(result.slug).toBe('unique-slug');
      expect(result.contentType).toBe('x-post');
      expect(result.sections).toBeUndefined();
      expect(result.keywords).toBeUndefined();
      expect(result.angle).toBeDefined();
      expect(result.coverImageDescription).toContain('x-post');
    });

    it('falls back to contentPlan.title when idea is empty', async () => {
      const result = await planPrimaryContent({
        idea: '   ',
        contentType: 'x-post',
        contentPlan,
        settings: defaultAppSettings,
        markdownOutputDir: '/tmp/out',
        openRouter: null,
        dryRun: false,
      });

      expect(result.title).toBe(contentPlan.title);
      expect(resolveUniqueSlugMock).toHaveBeenCalledWith('/tmp/out', expect.stringContaining('practical-workflow'));
    });

    it('uses provided keywords in dry-run mode instead of hardcoded defaults', async () => {
      const result = await planPrimaryContent({
        idea: 'provided keywords dry run',
        contentType: 'article',
        contentPlan,
        settings: defaultAppSettings,
        keywords: ['organic marketing', 'content strategy', 'seo'],
        markdownOutputDir: '/tmp/out',
        openRouter: null,
        dryRun: false,
      });

      expect(result.keywords).toEqual(['organic marketing', 'content strategy', 'seo']);
    });
  });

  describe('LLM path', () => {
    it('calls requestStructured with correct schema and messages for long-form', async () => {
      const requestStructured = jest.fn<() => Promise<unknown>>().mockResolvedValue({
        contentType: 'article',
        title: 'Generated Title',
        subtitle: 'Generated Subtitle',
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9'],
        primaryKeyword: 'k1',
        slug: 'generated-title',
        description: 'Generated description',
        introBrief: 'Intro brief',
        outroBrief: 'Outro brief',
        sections: [
          { title: 'S1', description: 'D1', targetKeywords: ['k2'] },
          { title: 'S2', description: 'D2', targetKeywords: ['k3'] },
        ],
        coverImageDescription: 'Cover image',
        inlineImages: [
          { description: 'A', anchorAfterSection: 2 },
          { description: 'B', anchorAfterSection: 2 },
          { description: 'C should be removed', anchorAfterSection: 2 },
          { description: 'D extra', anchorAfterSection: 2 },
        ],
      });

      const openRouter = { requestStructured };

      const result = await planPrimaryContent({
        idea: 'ignored when model output exists',
        contentType: 'article',
        contentPlan,
        settings: defaultAppSettings,
        markdownOutputDir: '/tmp/out',
        openRouter: openRouter as never,
        dryRun: false,
      });

      expect(requestStructured).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArg = (requestStructured.mock.calls[0] as any)[0] as Record<string, unknown>;
      expect(callArg.schemaName).toBe('primary_plan');
      expect(callArg.messages).toBeDefined();
      expect(callArg.parse).toBeDefined();

      expect(resolveUniqueSlugMock).toHaveBeenCalledWith('/tmp/out', 'generated-title');
      expect(result.slug).toBe('unique-slug');
      expect(result.keywords).toHaveLength(8);
      expect(result.inlineImages).toEqual([
        { description: 'A', anchorAfterSection: 2 },
        { description: 'B', anchorAfterSection: 2 },
        { description: 'C should be removed', anchorAfterSection: 2 },
      ]);
    });

    it('calls requestStructured with correct schema and messages for short-form', async () => {
      const requestStructured = jest.fn<() => Promise<unknown>>().mockResolvedValue({
        contentType: 'x-post',
        title: 'Generated Title',
        slug: 'generated-title',
        description: 'Generated description',
        coverImageDescription: 'Cover image',
        angle: 'Sharp angle',
      });

      const openRouter = { requestStructured };

      const result = await planPrimaryContent({
        idea: 'ignored when model output exists',
        contentType: 'x-post',
        contentPlan,
        settings: defaultAppSettings,
        markdownOutputDir: '/tmp/out',
        openRouter: openRouter as never,
        dryRun: false,
      });

      expect(requestStructured).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArg = (requestStructured.mock.calls[0] as any)[0] as Record<string, unknown>;
      expect(callArg.schemaName).toBe('primary_plan');

      expect(result.slug).toBe('unique-slug');
      expect(result.contentType).toBe('x-post');
      expect(result.sections).toBeUndefined();
      expect(result.angle).toBe('Sharp angle');
    });

    it('executes parse callback and validates through longFormPlanSchema for article', async () => {
      const validPlan = {
        contentType: 'article',
        title: 'Generated Title',
        subtitle: 'Generated Subtitle',
        keywords: ['k1', 'k2', 'k3'],
        primaryKeyword: 'k1',
        slug: 'generated-title',
        description: 'Generated description with enough detail for schema validation checks.',
        introBrief: 'Intro brief with enough detail for schema validation checks.',
        outroBrief: 'Outro brief with enough detail for schema validation checks.',
        sections: [
          { title: 'S1', description: 'Section description one is detailed enough.', targetKeywords: ['k2'] },
          { title: 'S2', description: 'Section description two is detailed enough.', targetKeywords: [] },
          { title: 'S3', description: 'Section description three is detailed enough.', targetKeywords: ['k3'] },
          { title: 'S4', description: 'Section description four is detailed enough.', targetKeywords: [] },
        ],
        coverImageDescription: 'Cover image description with enough detail.',
        inlineImages: [
          { description: 'Inline description one with enough detail.', anchorAfterSection: 2 },
          { description: 'Inline description two with enough detail.', anchorAfterSection: 4 },
        ],
      };

      const requestStructured = jest
        .fn<(args: { parse?: (data: unknown) => unknown }) => Promise<unknown>>()
        .mockImplementation(async ({ parse }: { parse?: (data: unknown) => unknown }) => {
          const parsed = parse ? parse(validPlan) : validPlan;
          return parsed;
        });

      await planPrimaryContent({
        idea: 'parse callback check',
        contentType: 'article',
        contentPlan,
        settings: defaultAppSettings,
        markdownOutputDir: '/tmp/out',
        openRouter: { requestStructured } as never,
        dryRun: false,
      });

      expect(requestStructured).toHaveBeenCalledTimes(1);
    });

    it('executes parse callback and validates through shortFormPlanSchema for x-post', async () => {
      const validPlan = {
        contentType: 'x-post',
        title: 'Generated Title',
        slug: 'generated-title',
        description: 'Generated description.',
        coverImageDescription: 'Cover image description.',
        angle: 'Sharp angle.',
      };

      const requestStructured = jest
        .fn<(args: { parse?: (data: unknown) => unknown }) => Promise<unknown>>()
        .mockImplementation(async ({ parse }: { parse?: (data: unknown) => unknown }) => {
          const parsed = parse ? parse(validPlan) : validPlan;
          return parsed;
        });

      await planPrimaryContent({
        idea: 'parse callback check short form',
        contentType: 'x-post',
        contentPlan,
        settings: defaultAppSettings,
        markdownOutputDir: '/tmp/out',
        openRouter: { requestStructured } as never,
        dryRun: false,
      });

      expect(requestStructured).toHaveBeenCalledTimes(1);
    });

    it('clamps anchorAfterSection to valid range for long-form', async () => {
      const requestStructured = jest.fn<() => Promise<unknown>>().mockResolvedValue({
        contentType: 'article',
        title: 'Generated Title',
        subtitle: 'Generated Subtitle',
        keywords: ['k1', 'k2', 'k3'],
        primaryKeyword: 'k1',
        slug: 'generated-title',
        description: 'Generated description',
        introBrief: 'Intro brief',
        outroBrief: 'Outro brief',
        sections: [
          { title: 'S1', description: 'D1', targetKeywords: ['k2'] },
          { title: 'S2', description: 'D2', targetKeywords: ['k3'] },
        ],
        coverImageDescription: 'Cover image',
        inlineImages: [
          { description: 'A', anchorAfterSection: 0 },
          { description: 'B', anchorAfterSection: 5 },
          { description: 'C', anchorAfterSection: 2 },
        ],
      });

      const openRouter = { requestStructured };

      const result = await planPrimaryContent({
        idea: 'anchor clamping test',
        contentType: 'article',
        contentPlan,
        settings: defaultAppSettings,
        markdownOutputDir: '/tmp/out',
        openRouter: openRouter as never,
        dryRun: false,
      });

      expect(result.inlineImages).toEqual([
        { description: 'A', anchorAfterSection: 1 },
        { description: 'B', anchorAfterSection: 2 },
        { description: 'C', anchorAfterSection: 2 },
      ]);
    });

    it('injects provided keywords and removes keywords from schema requirement', async () => {
      const requestStructured = jest.fn<() => Promise<unknown>>().mockResolvedValue({
        contentType: 'article',
        title: 'Generated Title',
        subtitle: 'Generated Subtitle',
        slug: 'generated-title',
        description: 'Generated description',
        primaryKeyword: 'organic marketing',
        introBrief: 'Intro brief',
        outroBrief: 'Outro brief',
        sections: [
          { title: 'S1', description: 'D1', targetKeywords: ['content strategy'] },
          { title: 'S2', description: 'D2', targetKeywords: ['seo'] },
        ],
        coverImageDescription: 'Cover image',
        inlineImages: [
          { description: 'A', anchorAfterSection: 1 },
        ],
      });

      const openRouter = { requestStructured };

      const result = await planPrimaryContent({
        idea: 'provided keywords llm',
        contentType: 'article',
        contentPlan,
        settings: defaultAppSettings,
        keywords: ['organic marketing', 'content strategy', 'seo'],
        markdownOutputDir: '/tmp/out',
        openRouter: openRouter as never,
        dryRun: false,
      });

      expect(requestStructured).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArg = (requestStructured.mock.calls[0] as any)[0] as Record<string, unknown>;
      // Schema should not have keywords in required or properties when provided
      const schema = callArg.schema as Record<string, unknown>;
      expect((schema.required as string[])).not.toContain('keywords');
      expect((schema.properties as Record<string, unknown>)).not.toHaveProperty('keywords');

      // Provided keywords should be injected into the result
      expect(result.keywords).toEqual(['organic marketing', 'content strategy', 'seo']);
    });
  });

  it('uses dry-run mode even when OpenRouter exists when dryRun=true', async () => {
    const openRouter = {
      requestStructured: jest.fn(),
    };

    await planPrimaryContent({
      idea: 'dry run wins',
      contentType: 'article',
      contentPlan,
      settings: defaultAppSettings,
      markdownOutputDir: '/tmp/out',
      openRouter: openRouter as never,
      dryRun: true,
    });

    expect(openRouter.requestStructured).not.toHaveBeenCalled();
  });

  it('collects SEO warnings for long title and description', async () => {
    const longContentPlan: ContentPlan = {
      ...contentPlan,
      title: 'This Is A Very Long Title That Exceeds Sixty Characters For SEO Warning Test',
      description: 'Short',
    };

    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await planPrimaryContent({
      idea: 'seo warnings test',
      contentType: 'article',
      contentPlan: longContentPlan,
      settings: defaultAppSettings,
      markdownOutputDir: '/tmp/out',
      openRouter: null,
      dryRun: false,
    });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('collects SEO warnings for short description', async () => {
    const shortDescPlan: ContentPlan = {
      ...contentPlan,
      description: 'Too short',
    };

    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await planPrimaryContent({
      idea: 'short desc test',
      contentType: 'article',
      contentPlan: shortDescPlan,
      settings: defaultAppSettings,
      markdownOutputDir: '/tmp/out',
      openRouter: null,
      dryRun: false,
    });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('collects SEO warnings for keywords duplicating headings', async () => {
    const dupPlan: ContentPlan = {
      ...contentPlan,
    };

    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await planPrimaryContent({
      idea: 'duplicate keywords test',
      contentType: 'article',
      contentPlan: dupPlan,
      settings: defaultAppSettings,
      markdownOutputDir: '/tmp/out',
      openRouter: null,
      dryRun: false,
    });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
