import { renderArticlePreview } from './renderers/article.js';
import { renderBlogPostPreview } from './renderers/blogPost.js';
import { renderGenericPreview } from './renderers/generic.js';
import { renderLinkedinPostPreview } from './renderers/linkedinPost.js';
import { renderNewsletterPreview } from './renderers/newsletter.js';
import { renderPressReleasePreview } from './renderers/pressRelease.js';
import { renderRedditPostPreview } from './renderers/redditPost.js';
import { renderSciencePaperPreview } from './renderers/sciencePaper.js';
import { renderXPostPreview } from './renderers/xPost.js';
import { renderXThreadPreview } from './renderers/xThread.js';
import type { FormatPreviewInput } from './types.js';

const outlineContentTypes = new Set(['article', 'blog-post', 'science-paper']);

const rendererByType: Record<string, (input: FormatPreviewInput) => string> = {
  article: renderArticlePreview,
  'blog-post': renderBlogPostPreview,
  newsletter: renderNewsletterPreview,
  'x-post': renderXPostPreview,
  'x-thread': renderXThreadPreview,
  'reddit-post': renderRedditPostPreview,
  'linkedin-post': renderLinkedinPostPreview,
  'press-release': renderPressReleasePreview,
  'science-paper': renderSciencePaperPreview,
};

export function supportsSectionOutline(contentType: string): boolean {
  return outlineContentTypes.has(contentType);
}

export function renderFormatPreview(input: FormatPreviewInput): string {
  const renderer = rendererByType[input.contentType];
  if (!renderer) {
    return renderGenericPreview(input);
  }

  return renderer(input);
}

export type { FormatPreviewContext, FormatPreviewInput } from './types.js';
