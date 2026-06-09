import {
  formatRelativeTime,
  renderImageAttachment,
  renderImagePlaceholder,
  renderXActions,
  renderXHeader,
  resolveAuthorIdentity,
  resolveCoverImage,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderXPostPreview(input: FormatPreviewInput): string {
  const identity = resolveAuthorIdentity(
    input.publicationName,
    input.publicationSlug,
    input.authorName,
    input.authorSlug,
  );
  const relativeTime = formatRelativeTime(input.metaJson?.generatedAt);
  const cover = resolveCoverImage(input.metaJson, input.generationId);
  const imageHtml = cover
    ? renderImageAttachment(cover, 'fmt-x-image')
    : input.metaJson?.cover?.description
      ? renderImagePlaceholder(input.metaJson.cover.description, 'fmt-x-image')
      : '';

  return `<div class="fmt-x-post">
    ${renderXHeader(identity, relativeTime)}
    <div class="fmt-x-body">
      ${wrapContentBody(input.htmlBody)}
      ${imageHtml}
    </div>
    ${renderXActions()}
  </div>`;
}
