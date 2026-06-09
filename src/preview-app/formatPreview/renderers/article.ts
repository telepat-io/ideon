import {
  escapeHtml,
  estimateReadTime,
  formatPreviewDate,
  renderCoverBlock,
  renderCoverPlaceholder,
  renderKeywordTags,
  resolveAuthorIdentity,
  resolveCoverImage,
  stripDuplicateCoverImageFromHtml,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderArticlePreview(input: FormatPreviewInput): string {
  const meta = input.metaJson;
  const identity = resolveAuthorIdentity(
    input.publicationName,
    input.publicationSlug,
    input.authorName,
    input.authorSlug,
  );
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

  const bodyHtml = cover
    ? stripDuplicateCoverImageFromHtml(input.htmlBody, cover.url)
    : input.htmlBody;

  return `<div class="fmt-article">
    ${coverHtml}
    <div class="fmt-byline">By <strong>${escapeHtml(identity.displayName)}</strong> · ${date} · ${readTime}</div>
    ${renderKeywordTags(keywords)}
    ${lead}
    ${wrapContentBody(bodyHtml)}
  </div>`;
}
