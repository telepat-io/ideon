import {
  escapeHtml,
  formatRelativeTime,
  renderImageAttachment,
  renderImagePlaceholder,
  resolveAuthorIdentity,
  resolveCoverImage,
  publicationLabel,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderLinkedinPostPreview(input: FormatPreviewInput): string {
  const meta = input.metaJson;
  const identity = resolveAuthorIdentity(input.publicationName, input.publicationSlug);
  const pub = publicationLabel(input.publicationName, input.publicationSlug, meta);
  const relativeTime = formatRelativeTime(meta?.generatedAt);
  const cover = resolveCoverImage(meta, input.generationId);
  const imageHtml = cover
    ? renderImageAttachment(cover, 'fmt-li-image')
    : meta?.cover?.description
      ? renderImagePlaceholder(`📷 ${meta.cover.description}`, 'fmt-li-image')
      : '';

  return `<div class="fmt-linkedin">
    <div class="fmt-li-header">
      <div class="fmt-li-avatar">${escapeHtml(identity.initials)}</div>
      <div>
        <div class="fmt-li-name">${escapeHtml(identity.displayName)} · <span style="color:var(--color-brand-violet);font-size:var(--fs-meta);">1st</span></div>
        <div class="fmt-li-title">Content at ${escapeHtml(pub)}</div>
        <div class="fmt-li-time">${escapeHtml(relativeTime)} · 🌍</div>
      </div>
    </div>
    ${wrapContentBody(input.htmlBody)}
    ${imageHtml}
    <div class="fmt-li-reactions">
      <span>👍 124</span><span>💡 8</span><span>❤️ 23</span>
      <span class="fmt-li-comment-count">34 comments · 12 reposts</span>
    </div>
    <div class="fmt-li-comments">
      <div style="font-size:var(--fs-body-sm);color:var(--color-fg-muted);margin-bottom:8px;">Most relevant ▼</div>
      <div class="fmt-comment"><strong>Sarah Park</strong> · VP Content · 2d<br>This resonates. We've been on a similar journey and the governance layer is often the hardest part. Would love to compare notes.</div>
      <div class="fmt-comment fmt-comment-nested"><strong>${escapeHtml(identity.displayName)}</strong> · 2d<br>Thanks Sarah! Governance is definitely the long pole. Happy to jump on a call.</div>
    </div>
  </div>`;
}
