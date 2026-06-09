import {
  estimateReadTime,
  escapeHtml,
  formatPreviewDate,
  renderKeywordTags,
  resolveAuthorIdentity,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderBlogPostPreview(input: FormatPreviewInput): string {
  const meta = input.metaJson;
  const identity = resolveAuthorIdentity(
    input.publicationName,
    input.publicationSlug,
    input.authorName,
    input.authorSlug,
  );
  const date = formatPreviewDate(meta?.generatedAt);
  const readTime = estimateReadTime(input.markdownBody);
  const keywords = meta?.keywords ?? [];

  return `<div class="fmt-blog">
    <div class="fmt-blog-meta">
      <span class="fmt-avatar">${escapeHtml(identity.initials)}</span>
      <div><strong>${escapeHtml(identity.displayName)}</strong><br><span style="color:var(--color-fg-muted);font-size:var(--fs-meta);">${date} · ${readTime}</span></div>
    </div>
    ${renderKeywordTags(keywords)}
    ${wrapContentBody(input.htmlBody)}
    <div class="fmt-cta"><strong>Try it yourself:</strong> Start with a single content piece and measure the time savings. <a>Read the full guide →</a></div>
    <div class="fmt-comments">
      <h3>Comments (2)</h3>
      <div class="fmt-comment"><strong>Jordan M.</strong> · 2h ago<br>Really helpful framework. This validates the approach we've been iterating on.</div>
      <div class="fmt-comment"><strong>Priya K.</strong> · 5h ago<br>Would love a follow-up on how this scales beyond larger teams. The governance challenges multiply.</div>
    </div>
  </div>`;
}
