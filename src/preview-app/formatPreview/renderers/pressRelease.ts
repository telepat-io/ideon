import {
  escapeHtml,
  formatPreviewDate,
  publicationLabel,
  resolveAuthorIdentity,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderPressReleasePreview(input: FormatPreviewInput): string {
  const meta = input.metaJson;
  const identity = resolveAuthorIdentity(
    input.publicationName,
    input.publicationSlug,
    input.authorName,
    input.authorSlug,
  );
  const pub = publicationLabel(input.publicationName, input.publicationSlug, meta);
  const date = formatPreviewDate(meta?.generatedAt);
  const emailDomain = pub.toLowerCase().replace(/\s+/g, '');

  return `<div class="fmt-press">
    <div class="fmt-press-label">FOR IMMEDIATE RELEASE</div>
    <div class="fmt-press-contact">
      <div class="fmt-press-contact-title">Media Contact:</div>
      <div>${escapeHtml(identity.displayName)}</div>
      <div>Communications, ${escapeHtml(pub)}</div>
      <div>press@${escapeHtml(emailDomain)}.com</div>
    </div>
    <h1 class="fmt-press-headline">${escapeHtml(input.title.toUpperCase())}</h1>
    <div class="fmt-press-dateline">${date} —</div>
    ${wrapContentBody(input.htmlBody)}
    <h3>About ${escapeHtml(pub)}</h3>
    <p>${escapeHtml(pub)} publishes in-depth guides, tutorials, and analysis for professional audiences.</p>
    <div class="fmt-press-close"># # #</div>
  </div>`;
}
