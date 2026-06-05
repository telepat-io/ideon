import {
  formatRelativeTime,
  renderXActions,
  renderXHeader,
  resolveAuthorIdentity,
  splitThreadHtml,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

function renderThreadCard(
  bodyHtml: string,
  identity: ReturnType<typeof resolveAuthorIdentity>,
  relativeTime: string,
  options: { isLead?: boolean; index?: number; total?: number },
): string {
  const replyClass = options.isLead ? '' : ' fmt-thread-reply';
  const verified = options.isLead ?? false;
  const label = options.isLead
    ? '<span class="fmt-thread-label">🧵 THREAD</span> '
    : options.index !== undefined && options.total !== undefined
      ? `<span class="fmt-thread-num">${options.index}/${options.total}</span> `
      : '';

  let wrappedBody = wrapContentBody(bodyHtml);
  if (label) {
    wrappedBody = wrappedBody.replace(
      '<div class="fmt-content-body">',
      `<div class="fmt-content-body"><p>${label}</p>`,
    );
  }

  return `<div class="fmt-x-post${replyClass}">
    ${renderXHeader(identity, relativeTime, verified)}
    <div class="fmt-x-body">${wrappedBody}</div>
    ${renderXActions()}
  </div>`;
}

export function renderXThreadPreview(input: FormatPreviewInput): string {
  const identity = resolveAuthorIdentity(input.publicationName, input.publicationSlug);
  const relativeTime = formatRelativeTime(input.metaJson?.generatedAt);
  const segments = splitThreadHtml(input.htmlBody, input.markdownBody);
  const total = segments.length;

  const cards = segments.map((segment, index) => {
    const separator = index > 0 ? '<div class="fmt-thread-sep"></div>' : '';
    const card = renderThreadCard(segment, identity, relativeTime, {
      isLead: index === 0,
      index: index + 1,
      total,
    });
    return `${separator}${card}`;
  }).join('');

  return `<div class="fmt-x-thread">${cards}</div>`;
}
