import {
  escapeHtml,
  estimateReadTime,
  formatPreviewDate,
  renderCoverBlock,
  renderCoverPlaceholder,
  renderKeywordTags,
  resolveAuthorIdentity,
  resolveCoverImage,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderArticlePreview(input: FormatPreviewInput): string {
  const meta = input.metaJson;
  const identity = resolveAuthorIdentity(input.publicationName, input.publicationSlug);
  const cover = resolveCoverImage(meta, input.generationId);
  const date = formatPreviewDate(meta?.generatedAt);
  const readTime = estimateReadTime(input.markdownBody);
  const keywords = meta?.keywords ?? [];

  const coverHtml = cover
    ? renderCoverBlock(cover)
    : meta?.cover?.description
      ? renderCoverPlaceholder(meta.cover.description)
      : '';

  const lead = meta?.description
    ? `<p class="fmt-lead">${escapeHtml(meta.description)}</p>`
    : '';

  return `<div class="fmt-article">
    ${coverHtml}
    <div class="fmt-byline">By <strong>${escapeHtml(identity.displayName)}</strong> · ${date} · ${readTime}</div>
    ${renderKeywordTags(keywords)}
    ${lead}
    ${wrapContentBody(input.htmlBody)}
  </div>`;
}
