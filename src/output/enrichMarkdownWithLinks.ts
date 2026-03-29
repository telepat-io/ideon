import type { LinkEntry } from '../types/article.js';

/**
 * Returns a copy of `markdown` with each link entry injected as a Markdown
 * hyperlink on its first occurrence. Longer expressions are matched first so
 * multi-word phrases take precedence over their constituent words. An
 * expression is skipped when its match position falls inside an already-
 * existing `[text](url)` span, preventing double-linking.
 */
export function enrichMarkdownWithLinks(markdown: string, links: LinkEntry[]): string {
  if (links.length === 0) {
    return markdown;
  }

  const sorted = [...links].sort((left, right) => right.expression.length - left.expression.length);
  let updated = markdown;

  for (const link of sorted) {
    const escapedExpression = escapeRegExp(link.expression);
    const leadBoundary = /^\w/.test(link.expression) ? '\\b' : '';
    const trailBoundary = /\w$/.test(link.expression) ? '\\b' : '';
    // Use a global regex so we can advance past protected spans (e.g. existing
    // links, inline code) without giving up on the expression entirely.
    const expressionRegex = new RegExp(`${leadBoundary}${escapedExpression}${trailBoundary}`, 'g');
    let match: RegExpExecArray | null;
    while ((match = expressionRegex.exec(updated)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (isInProtectedSpan(updated, start, end)) {
        continue;
      }
      updated = `${updated.slice(0, start)}[${match[0]}](${link.url})${updated.slice(end)}`;
      break;
    }
  }

  return updated;
}

/**
 * Returns true only when the character range [start, end) falls within the
 * span of an existing `[text](url)` construct on the same line. This is
 * intentionally precise — a word that merely shares a line with a link (but
 * is not part of it) is still eligible for linking.
 */
/**
 * Returns true when the character range [start, end) falls within a span
 * that must not be altered:
 *   - an existing `[text](url)` or `![alt](url)` Markdown link/image
 *   - an inline code span delimited by backticks
 *
 * Only the line containing the match is inspected — Markdown links and
 * inline code spans cannot span line boundaries.
 */
function isInProtectedSpan(content: string, start: number, end: number): boolean {
  const lineStart = content.lastIndexOf('\n', start) + 1;
  const lineEndIdx = content.indexOf('\n', end);
  const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;
  const line = content.slice(lineStart, lineEnd);

  // Match [text](url) — covers both regular links and image alt texts since
  // `![alt](url)` contains `[alt](url)` as a substring.
  const linkPattern = /\[[^\]]*\]\([^)]*\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkPattern.exec(line)) !== null) {
    const absStart = lineStart + m.index;
    const absEnd = absStart + m[0].length;
    if (start >= absStart && end <= absEnd) {
      return true;
    }
  }

  // Match inline code spans: `code` (single-backtick delimited).
  const codePattern = /`[^`]+`/g;
  while ((m = codePattern.exec(line)) !== null) {
    const absStart = lineStart + m.index;
    const absEnd = absStart + m[0].length;
    if (start >= absStart && end <= absEnd) {
      return true;
    }
  }

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
