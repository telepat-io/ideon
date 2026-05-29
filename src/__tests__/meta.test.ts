import { describe, it, expect } from '@jest/globals';
import { buildMetaJson } from '../output/meta.js';
import type { ArticlePlan, RenderedArticleImage } from '../types/article.js';
import type { ContentPlan } from '../types/contentPlan.js';
import {
  metaJsonCoverImageSchema,
  metaJsonSectionSchema,
  metaJsonImageSchema,
  metaJsonOutputSchema,
  metaJsonSchema,
} from '../types/meta.js';

describe('meta.json schemas', () => {
  it('validates a complete meta.json object', () => {
    const valid = {
      version: 1 as const,
      title: 'Title',
      slug: 'slug',
      idea: 'Idea',
      description: 'Description',
      subtitle: null,
      keywords: ['k1'],
      contentType: 'article',
      style: 'professional',
      intent: 'tutorial',
      targetLength: null,
      angle: null,
      cover: null,
      sections: [],
      images: [],
      outputs: [],
      generatedAt: '2026-01-01T00:00:00.000Z',
      generationDir: '/out',
    };
    expect(metaJsonSchema.parse(valid)).toEqual(valid);
  });

  it('rejects invalid version', () => {
    expect(() => metaJsonSchema.parse({ version: 2 })).toThrow();
  });

  it('validates cover image schema', () => {
    const cover = { path: '/img.png', relativePath: 'img.png', description: 'A cover' };
    expect(metaJsonCoverImageSchema.parse(cover)).toEqual(cover);
    expect(() => metaJsonCoverImageSchema.parse({ path: '' })).toThrow();
  });

  it('validates section schema', () => {
    const section = { title: 'Sec', description: 'Desc' };
    expect(metaJsonSectionSchema.parse(section)).toEqual(section);
    expect(() => metaJsonSectionSchema.parse({ title: '' })).toThrow();
  });

  it('validates image schema', () => {
    const image = {
      id: '1', kind: 'inline' as const, path: '/img.png', relativePath: 'img.png',
      description: 'An image', anchorAfterSection: 0,
    };
    expect(metaJsonImageSchema.parse(image)).toEqual(image);
    expect(() => metaJsonImageSchema.parse({ id: '' })).toThrow();
    expect(() => metaJsonImageSchema.parse({ ...image, kind: 'bad' })).toThrow();
  });

  it('validates output schema', () => {
    const output = { fileId: 'f1', contentType: 'article', path: '/a.md', relativePath: 'a.md' };
    expect(metaJsonOutputSchema.parse(output)).toEqual(output);
    expect(() => metaJsonOutputSchema.parse({ ...output, fileId: '' })).toThrow();
  });
});

describe('buildMetaJson', () => {
  const baseContentPlan: ContentPlan = {
    title: 'Shared Plan Title',
    description: 'Shared description',
    targetAudience: 'Developers',
    corePromise: 'Learn fast',
    keyPoints: ['Point 1', 'Point 2'],
    voiceNotes: 'Professional',
    primaryContentType: 'article',
    secondaryContentTypes: ['x-post'],
    secondaryContentStrategy: 'Summarize',
  };

  const basePlan: ArticlePlan = {
    contentType: 'article',
    title: 'Article Title',
    slug: 'article-slug',
    description: 'Article description',
    coverImageDescription: 'A beautiful cover',
    subtitle: 'The subtitle',
    keywords: ['keyword1', 'keyword2'],
    introBrief: 'Intro brief',
    outroBrief: 'Outro brief',
    sections: [
      { title: 'Section One', description: 'First section desc' },
      { title: 'Section Two', description: 'Second section desc' },
    ],
    inlineImages: [
      { description: 'Inline 1', anchorAfterSection: 1 },
    ],
    angle: 'Deep dive',
  };

  const coverImage: RenderedArticleImage = {
    id: 'cover',
    kind: 'cover',
    prompt: 'prompt',
    description: 'A beautiful cover',
    anchorAfterSection: null,
    outputPath: '/output/gen/cover-1.png',
    relativePath: 'cover-1.png',
  };

  const inlineImage: RenderedArticleImage = {
    id: 'inline-1',
    kind: 'inline',
    prompt: 'prompt',
    description: 'Inline 1',
    anchorAfterSection: 1,
    outputPath: '/output/gen/inline-1-2.png',
    relativePath: 'inline-1-2.png',
  };

  it('builds complete meta.json for long-form content', () => {
    const meta = buildMetaJson({
      idea: 'My great idea',
      generationDir: '/output/gen',
      contentPlan: baseContentPlan,
      plan: basePlan,
      renderedImages: [coverImage, inlineImage],
      outputs: [
        { fileId: 'article-1', contentType: 'article', markdownPath: '/output/gen/article-1.md' },
        { fileId: 'x-post-1', contentType: 'x-post', markdownPath: '/output/gen/x-post-1.md' },
      ],
      generatedAt: '2026-05-08T12:00:00.000Z',
      style: 'professional',
      intent: 'tutorial',
      targetLength: 'medium',
    });

    expect(meta.version).toBe(1);
    expect(meta.title).toBe('Article Title');
    expect(meta.slug).toBe('article-slug');
    expect(meta.idea).toBe('My great idea');
    expect(meta.description).toBe('Article description');
    expect(meta.subtitle).toBe('The subtitle');
    expect(meta.keywords).toEqual(['keyword1', 'keyword2']);
    expect(meta.contentType).toBe('article');
    expect(meta.style).toBe('professional');
    expect(meta.intent).toBe('tutorial');
    expect(meta.targetLength).toBe('medium');
    expect(meta.angle).toBe('Deep dive');

    expect(meta.cover).toEqual({
      path: '/output/gen/cover-1.png',
      relativePath: 'cover-1.png',
      description: 'A beautiful cover',
    });

    expect(meta.sections).toEqual([
      { title: 'Section One', description: 'First section desc' },
      { title: 'Section Two', description: 'Second section desc' },
    ]);

    expect(meta.images).toHaveLength(2);
    expect(meta.images[0]).toEqual({
      id: 'cover',
      kind: 'cover',
      path: '/output/gen/cover-1.png',
      relativePath: 'cover-1.png',
      description: 'A beautiful cover',
      anchorAfterSection: null,
    });
    expect(meta.images[1]).toEqual({
      id: 'inline-1',
      kind: 'inline',
      path: '/output/gen/inline-1-2.png',
      relativePath: 'inline-1-2.png',
      description: 'Inline 1',
      anchorAfterSection: 1,
    });

    expect(meta.outputs).toHaveLength(2);
    expect(meta.outputs[0]).toEqual({
      fileId: 'article-1',
      contentType: 'article',
      path: '/output/gen/article-1.md',
      relativePath: 'article-1.md',
    });
    expect(meta.outputs[1]).toEqual({
      fileId: 'x-post-1',
      contentType: 'x-post',
      path: '/output/gen/x-post-1.md',
      relativePath: 'x-post-1.md',
    });

    expect(meta.generatedAt).toBe('2026-05-08T12:00:00.000Z');
    expect(meta.generationDir).toBe('/output/gen');
  });

  it('falls back to contentPlan when plan is null', () => {
    const meta = buildMetaJson({
      idea: 'Fallback idea',
      generationDir: '/output/gen',
      contentPlan: baseContentPlan,
      plan: null,
      renderedImages: [],
      outputs: [],
      generatedAt: '2026-05-08T12:00:00.000Z',
      style: 'friendly',
      intent: 'opinion-piece',
      targetLength: null,
    });

    expect(meta.title).toBe('Shared Plan Title');
    expect(meta.slug).toBe('');
    expect(meta.description).toBe('Shared description');
    expect(meta.contentType).toBe('article');
    expect(meta.angle).toBeNull();
    expect(meta.subtitle).toBeNull();
    expect(meta.keywords).toEqual([]);
    expect(meta.cover).toBeNull();
    expect(meta.sections).toEqual([]);
  });

  it('falls back to idea when both plan and contentPlan are null', () => {
    const meta = buildMetaJson({
      idea: 'Just an idea',
      generationDir: '/output/gen',
      contentPlan: null,
      plan: null,
      renderedImages: [],
      outputs: [],
      generatedAt: '2026-05-08T12:00:00.000Z',
      style: 'minimalist',
      intent: 'announcement',
      targetLength: 'small',
    });

    expect(meta.title).toBe('Just an idea');
    expect(meta.slug).toBe('');
    expect(meta.description).toBe('');
    expect(meta.contentType).toBe('article');
  });

  it('handles short-form content with empty sections', () => {
    const shortPlan = {
      contentType: 'x-post',
      title: 'X Post Title',
      slug: 'x-post-slug',
      description: 'X post description',
      coverImageDescription: 'X post cover',
    };

    const meta = buildMetaJson({
      idea: 'X post idea',
      generationDir: '/output/gen',
      contentPlan: baseContentPlan,
      plan: shortPlan,
      renderedImages: [coverImage],
      outputs: [{ fileId: 'x-post-1', contentType: 'x-post', markdownPath: '/output/gen/x-post-1.md' }],
      generatedAt: '2026-05-08T12:00:00.000Z',
      style: 'playful',
      intent: 'announcement',
      targetLength: 'small',
    });

    expect(meta.sections).toEqual([]);
    expect(meta.contentType).toBe('x-post');
    expect(meta.outputs).toHaveLength(1);
  });
});
