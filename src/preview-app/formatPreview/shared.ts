import type { MetaJson } from '../../types/meta.js';
import { generationAssetUrl } from '../format.js';
import type { AuthorIdentity } from './types.js';

const WORDS_PER_MINUTE = 200;

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildAuthorIdentity(displayName: string, handleSource: string): AuthorIdentity {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CP';

  const handle = handleSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'content-preview';

  return { displayName, initials, handle };
}

export function resolveAuthorIdentity(
  publicationName: string | null,
  publicationSlug: string | null,
  authorName: string | null = null,
  authorSlug: string | null = null,
): AuthorIdentity {
  if (authorName?.trim()) {
    return buildAuthorIdentity(
      authorName.trim(),
      authorSlug?.trim() || authorName.trim(),
    );
  }

  if (publicationName?.trim()) {
    return buildAuthorIdentity(
      publicationName.trim(),
      publicationSlug ?? publicationName.trim(),
    );
  }

  return {
    displayName: 'Content Preview',
    initials: 'CP',
    handle: 'content-preview',
  };
}

export function formatPreviewDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) {
    return 'recently';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'recently';
  }

  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60_000));
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  return formatPreviewDate(iso);
}

export function estimateReadTime(markdownBody: string): string {
  const words = markdownBody.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}

export function resolveCoverImage(
  meta: MetaJson | null,
  generationId: string,
): { url: string; description: string } | null {
  if (meta?.cover?.relativePath) {
    return {
      url: generationAssetUrl(generationId, meta.cover.relativePath),
      description: meta.cover.description,
    };
  }

  const inline = meta?.images.find((image) => image.kind === 'inline');
  if (inline?.relativePath) {
    return {
      url: generationAssetUrl(generationId, inline.relativePath),
      description: inline.description,
    };
  }

  return null;
}

export function splitThreadSegments(markdown: string): string[] {
  const trimmed = markdown.trim();
  if (!trimmed) {
    return [];
  }

  if (/(^|\n)---(\n|$)/.test(trimmed)) {
    return trimmed
      .split(/\n---\n/)
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  return trimmed
    .split(/\n\s*\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function markdownSegmentToHtml(segment: string): string {
  const paragraphs = segment
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return '';
  }

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function splitThreadHtml(htmlBody: string, markdownBody: string): string[] {
  const markdownSegments = splitThreadSegments(markdownBody);
  if (markdownSegments.length <= 1) {
    return [htmlBody];
  }

  const htmlSegments = htmlBody
    .split(/<hr\s*\/?>/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (htmlSegments.length === markdownSegments.length) {
    return htmlSegments;
  }

  return markdownSegments.map((segment) => markdownSegmentToHtml(segment));
}

export function wrapContentBody(htmlBody: string): string {
  return `<div class="fmt-content-body">${htmlBody}</div>`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripDuplicateCoverImageFromHtml(
  htmlBody: string,
  coverUrl: string | null,
): string {
  if (!coverUrl) {
    return htmlBody;
  }

  const escapedUrl = escapeRegExp(coverUrl);
  const imgPattern = `<img[^>]*\\ssrc=["']${escapedUrl}["'][^>]*>`;
  const paragraphWrapped = new RegExp(`<p>\\s*${imgPattern}\\s*</p>\\s*`, 'i');
  const standalone = new RegExp(`${imgPattern}\\s*`, 'i');

  if (paragraphWrapped.test(htmlBody)) {
    return htmlBody.replace(paragraphWrapped, '');
  }

  if (standalone.test(htmlBody)) {
    return htmlBody.replace(standalone, '');
  }

  return htmlBody;
}

export function renderKeywordTags(keywords: string[]): string {
  if (keywords.length === 0) {
    return '';
  }

  const tags = keywords
    .map((keyword) => `<span class="fmt-tag">${escapeHtml(keyword)}</span>`)
    .join(' ');

  return `<div class="fmt-tags">${tags}</div>`;
}

export function renderCoverBlock(cover: { url: string; description: string } | null): string {
  if (!cover) {
    return '';
  }

  return `<div class="fmt-cover"><img src="${escapeHtml(cover.url)}" alt="${escapeHtml(cover.description)}" /></div>`;
}

export function renderCoverPlaceholder(description: string): string {
  return `<div class="fmt-cover"><div class="fmt-cover-inner">${escapeHtml(description)}</div></div>`;
}

export function renderImageAttachment(
  cover: { url: string; description: string } | null,
  className: string,
): string {
  if (!cover) {
    return '';
  }

  return `<div class="${className}"><img src="${escapeHtml(cover.url)}" alt="${escapeHtml(cover.description)}" /></div>`;
}

export function renderImagePlaceholder(description: string, className: string): string {
  return `<div class="${className}"><span>${escapeHtml(description)}</span></div>`;
}

export const X_VERIFIED_BADGE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-brand-violet)"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

export function renderXHeader(identity: AuthorIdentity, relativeTime: string, verified = true): string {
  const badge = verified ? ` ${X_VERIFIED_BADGE}` : '';
  return `<div class="fmt-x-header">
    <div class="fmt-x-avatar">${escapeHtml(identity.initials)}</div>
    <div class="fmt-x-user">
      <div class="fmt-x-name">${escapeHtml(identity.displayName)}${badge}</div>
      <div class="fmt-x-handle">@${escapeHtml(identity.handle)} · ${escapeHtml(relativeTime)}</div>
    </div>
  </div>`;
}

export function renderXActions(): string {
  return `<div class="fmt-x-actions">
    <span>💬 <strong>12</strong></span>
    <span>🔄 <strong>45</strong></span>
    <span>❤️ <strong>234</strong></span>
    <span>👁 <strong>12K</strong></span>
    <span>🔖</span>
  </div>`;
}

export function publicationLabel(
  publicationName: string | null,
  publicationSlug: string | null,
  meta: MetaJson | null,
): string {
  return publicationName ?? meta?.publication ?? publicationSlug ?? 'Publication';
}
