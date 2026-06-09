import {
  escapeHtml,
  publicationLabel,
  renderKeywordTags,
  resolveAuthorIdentity,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderSciencePaperPreview(input: FormatPreviewInput): string {
  const meta = input.metaJson;
  const identity = resolveAuthorIdentity(
    input.publicationName,
    input.publicationSlug,
    input.authorName,
    input.authorSlug,
  );
  const pub = publicationLabel(input.publicationName, input.publicationSlug, meta);
  const keywords = meta?.keywords ?? [];
  const year = meta?.generatedAt ? new Date(meta.generatedAt).getFullYear() : new Date().getFullYear();

  const abstract = meta?.description
    ? `<div class="fmt-paper-abstract">
      <h3>ABSTRACT</h3>
      <p>${escapeHtml(meta.description)}</p>
    </div>`
    : '';

  const keywordLine = keywords.length > 0
    ? `<div class="fmt-paper-keywords"><strong>Keywords:</strong> ${escapeHtml(keywords.join(', '))}</div>`
    : renderKeywordTags(keywords);

  return `<div class="fmt-paper">
    <div class="fmt-paper-journal">Journal of Content Engineering (${year})</div>
    <h1 class="fmt-paper-title">${escapeHtml(input.title)}</h1>
    <div class="fmt-paper-authors">
      <div>${escapeHtml(identity.displayName)}¹*</div>
      <div class="fmt-paper-affils">
        <div>¹ ${escapeHtml(pub)} Research Division</div>
        <div>* Corresponding author: ${escapeHtml(identity.handle)}@${escapeHtml(pub.toLowerCase().replace(/\s+/g, ''))}.org</div>
      </div>
    </div>
    ${abstract}
    ${keywordLine}
    ${wrapContentBody(input.htmlBody)}
  </div>`;
}
