import { describe, expect, it } from '@jest/globals';
import type { MetaJson } from '../../types/meta.js';
import { renderFormatPreview, supportsSectionOutline } from './index.js';
import {
  resolveAuthorIdentity,
  splitThreadHtml,
  splitThreadSegments,
} from './shared.js';

const baseMeta: MetaJson = {
  version: 1,
  title: 'Sample Title',
  slug: 'sample-title',
  idea: 'Sample idea',
  description: 'Sample description for the preview.',
  subtitle: null,
  keywords: ['alpha', 'beta'],
  contentType: 'article',
  style: 'professional',
  intent: 'guide',
  targetLength: 'medium',
  angle: null,
  cover: null,
  sections: [{ title: 'Intro', description: 'Opening section' }],
  images: [],
  outputs: [],
  generatedAt: '2026-03-28T12:00:00.000Z',
  generationDir: '/tmp/output/sample',
  publication: 'tech-blog',
};

const baseInput = {
  htmlBody: '<h1>Sample Title</h1><p>Body copy.</p>',
  markdownBody: '# Sample Title\n\nBody copy.',
  title: 'Sample Title',
  generationId: '20260328-sample',
  metaJson: baseMeta,
  publicationName: 'Tech Blog',
  publicationSlug: 'tech-blog',
};

describe('supportsSectionOutline', () => {
  it('returns true only for long-form types', () => {
    expect(supportsSectionOutline('article')).toBe(true);
    expect(supportsSectionOutline('blog-post')).toBe(true);
    expect(supportsSectionOutline('science-paper')).toBe(true);
    expect(supportsSectionOutline('x-post')).toBe(false);
    expect(supportsSectionOutline('newsletter')).toBe(false);
  });
});

describe('resolveAuthorIdentity', () => {
  it('derives identity from publication', () => {
    expect(resolveAuthorIdentity('Tech Blog', 'tech-blog')).toEqual({
      displayName: 'Tech Blog',
      initials: 'TB',
      handle: 'tech-blog',
    });
  });

  it('falls back to neutral identity', () => {
    expect(resolveAuthorIdentity(null, null)).toEqual({
      displayName: 'Content Preview',
      initials: 'CP',
      handle: 'content-preview',
    });
  });
});

describe('splitThreadSegments', () => {
  it('splits on horizontal rules', () => {
    expect(splitThreadSegments('First tweet\n---\nSecond tweet')).toEqual([
      'First tweet',
      'Second tweet',
    ]);
  });

  it('splits on blank lines when no horizontal rules', () => {
    expect(splitThreadSegments('First tweet\n\nSecond tweet')).toEqual([
      'First tweet',
      'Second tweet',
    ]);
  });

  it('returns empty array for empty markdown', () => {
    expect(splitThreadSegments('   ')).toEqual([]);
  });
});

describe('splitThreadHtml', () => {
  it('splits html on hr when markdown uses horizontal rules', () => {
    const html = '<p>One</p><hr><p>Two</p>';
    const markdown = 'One\n---\nTwo';
    expect(splitThreadHtml(html, markdown)).toEqual(['<p>One</p>', '<p>Two</p>']);
  });
});

describe('renderFormatPreview', () => {
  it('renders article shell with supplementary chrome and body', () => {
    const html = renderFormatPreview({ ...baseInput, contentType: 'article' });
    expect(html).toContain('class="fmt-article"');
    expect(html).toContain('class="fmt-byline"');
    expect(html).toContain('class="fmt-tag"');
    expect(html).toContain('class="fmt-lead"');
    expect(html).toContain('class="fmt-content-body"');
    expect(html).toContain('<h1>Sample Title</h1>');
    expect(html).toContain('Tech Blog');
  });

  it('renders x-post shell with publication-derived header', () => {
    const html = renderFormatPreview({
      ...baseInput,
      contentType: 'x-post',
      htmlBody: '<p>Social takeaway.</p>',
      markdownBody: 'Social takeaway.',
    });
    expect(html).toContain('class="fmt-x-post"');
    expect(html).toContain('class="fmt-x-header"');
    expect(html).toContain('@tech-blog');
    expect(html).toContain('Social takeaway.');
  });

  it('renders x-thread with multiple cards', () => {
    const html = renderFormatPreview({
      ...baseInput,
      contentType: 'x-thread',
      htmlBody: '<p>Lead tweet</p><hr><p>Reply tweet</p>',
      markdownBody: 'Lead tweet\n---\nReply tweet',
    });
    expect(html).toContain('class="fmt-x-thread"');
    expect(html).toContain('fmt-thread-label');
    expect(html).toContain('fmt-thread-num');
    expect(html).toContain('Lead tweet');
    expect(html).toContain('Reply tweet');
  });

  it('renders linkedin-post shell', () => {
    const html = renderFormatPreview({ ...baseInput, contentType: 'linkedin-post' });
    expect(html).toContain('class="fmt-linkedin"');
    expect(html).toContain('class="fmt-li-header"');
  });

  it('renders science-paper without fake references', () => {
    const html = renderFormatPreview({ ...baseInput, contentType: 'science-paper' });
    expect(html).toContain('class="fmt-paper"');
    expect(html).toContain('ABSTRACT');
    expect(html).not.toContain('REFERENCES');
    expect(html).not.toContain('fmt-paper-refs');
  });

  it('falls back to generic wrapper for unknown types', () => {
    const html = renderFormatPreview({ ...baseInput, contentType: 'custom-channel' });
    expect(html).toContain('class="fmt-generic rendered-content"');
    expect(html).toContain('class="fmt-content-body"');
  });
});
