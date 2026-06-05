import {
  escapeHtml,
  formatPreviewDate,
  publicationLabel,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderNewsletterPreview(input: FormatPreviewInput): string {
  const meta = input.metaJson;
  const pub = publicationLabel(input.publicationName, input.publicationSlug, meta);
  const date = formatPreviewDate(meta?.generatedAt);

  return `<div class="fmt-newsletter">
    <div class="fmt-nl-header">
      <div class="fmt-nl-brand">${escapeHtml(pub.toUpperCase())}</div>
      <div class="fmt-nl-date">${date}</div>
    </div>
    <div class="fmt-nl-subject">${escapeHtml(input.title)}</div>
    <p>Hello there —</p>
    ${wrapContentBody(input.htmlBody)}
    <div class="fmt-nl-cta"><span>Read the full article →</span></div>
    <div class="fmt-nl-sponsor">
      <div class="fmt-nl-sponsor-label">SPONSORED</div>
      <p>This issue is supported by <strong>${escapeHtml(pub)}</strong> — content operations for lean editorial teams.</p>
    </div>
    <div class="fmt-nl-footer">
      <p>${escapeHtml(pub)} · Sent to your inbox weekly</p>
      <p><a>Unsubscribe</a> · <a>Preferences</a> · <a>View online</a></p>
    </div>
  </div>`;
}
