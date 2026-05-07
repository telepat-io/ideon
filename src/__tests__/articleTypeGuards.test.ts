import { isLongFormContentType, isLongFormPlan, type ArticlePlan, type PrimaryPlan } from '../types/article.js';

describe('isLongFormContentType', () => {
  it('returns true for all long-form content types', () => {
    expect(isLongFormContentType('article')).toBe(true);
    expect(isLongFormContentType('blog-post')).toBe(true);
    expect(isLongFormContentType('newsletter')).toBe(true);
    expect(isLongFormContentType('press-release')).toBe(true);
    expect(isLongFormContentType('science-paper')).toBe(true);
  });

  it('returns false for short-form content types', () => {
    expect(isLongFormContentType('x-post')).toBe(false);
    expect(isLongFormContentType('x-thread')).toBe(false);
    expect(isLongFormContentType('linkedin-post')).toBe(false);
    expect(isLongFormContentType('reddit-post')).toBe(false);
  });

  it('returns false for unknown content types', () => {
    expect(isLongFormContentType('unknown')).toBe(false);
    expect(isLongFormContentType('')).toBe(false);
  });
});

describe('isLongFormPlan', () => {
  it('returns true when contentType is long-form and sections exist', () => {
    const plan: PrimaryPlan = {
      contentType: 'article',
      title: 'Test Article',
      slug: 'test-article',
      description: 'Description',
      coverImageDescription: 'Cover description',
      subtitle: 'Subtitle',
      keywords: ['a', 'b', 'c'],
      introBrief: 'Intro',
      outroBrief: 'Outro',
      sections: [
        { title: 'Section 1', description: 'Desc 1' },
        { title: 'Section 2', description: 'Desc 2' },
      ],
      inlineImages: [{ description: 'Image 1', anchorAfterSection: 2 }],
    };

    expect(isLongFormPlan(plan)).toBe(true);
  });

  it('returns false for short-form content type even with sections', () => {
    const plan: PrimaryPlan = {
      contentType: 'x-post',
      title: 'Test Post',
      slug: 'test-post',
      description: 'Description',
      coverImageDescription: 'Cover description',
      angle: 'Sharp angle',
      sections: [
        { title: 'Section 1', description: 'Desc 1' },
      ],
    };

    expect(isLongFormPlan(plan)).toBe(false);
  });

  it('returns false for long-form content type without sections', () => {
    const plan: PrimaryPlan = {
      contentType: 'article',
      title: 'Test Article',
      slug: 'test-article',
      description: 'Description',
      coverImageDescription: 'Cover description',
    };

    expect(isLongFormPlan(plan)).toBe(false);
  });

  it('returns false for long-form content type with empty sections array', () => {
    const plan: PrimaryPlan = {
      contentType: 'article',
      title: 'Test Article',
      slug: 'test-article',
      description: 'Description',
      coverImageDescription: 'Cover description',
      sections: [],
    };

    expect(isLongFormPlan(plan)).toBe(false);
  });

  it('returns false for short-form plan without sections', () => {
    const plan: PrimaryPlan = {
      contentType: 'linkedin-post',
      title: 'Test Post',
      slug: 'test-post',
      description: 'Description',
      coverImageDescription: 'Cover description',
      angle: 'Angle',
    };

    expect(isLongFormPlan(plan)).toBe(false);
  });
});
