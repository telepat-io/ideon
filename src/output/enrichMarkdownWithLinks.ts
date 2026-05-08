import { readFile } from 'node:fs/promises';
import { resolveLinksPath } from './filesystem.js';
import type { LinkEntry } from '../types/article.js';

/**
 * Loads links from a `.links.json` sidecar file. Returns combined custom +
 * generated links (customLinks take precedence). Returns an empty array
 * when the sidecar is missing or unparseable.
 */
export async function loadLinksFromSidecar(markdownPath: string): Promise<LinkEntry[]> {
  const linksPath = resolveLinksPath(markdownPath);

  let raw: string;
  try {
    raw = await readFile(linksPath, 'utf8');
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return [];
  }

  const record = parsed as Record<string, unknown>;
  const links = Array.isArray(record.links) ? record.links : [];
  const customLinks = Array.isArray(record.customLinks) ? record.customLinks : [];

  const filterAndMap = (entries: unknown[], isCustom: boolean): LinkEntry[] =>
    entries
      .filter((entry): entry is LinkEntry => {
        if (typeof entry !== 'object' || entry === null) {
          return false;
        }

        const e = entry as Record<string, unknown>;
        return typeof e.expression === 'string'
          && typeof e.url === 'string'
          && (e.title === null || typeof e.title === 'string');
      })
      .map((entry) => ({
        expression: entry.expression.trim(),
        url: entry.url.trim(),
        title: entry.title,
        isCustom,
      }))
      .filter((entry) => entry.expression.length > 0 && entry.url.length > 0);

  return [...filterAndMap(customLinks, true), ...filterAndMap(links, false)];
}

/**
 * Returns a copy of `markdown` with each link entry injected as a Markdown
 * hyperlink. Longer expressions are matched first so multi-word phrases take
 * precedence over their constituent words. An expression is skipped when its
 * match position falls inside an already-existing `[text](url)` span,
 * preventing double-linking.
 *
 * Content inside headings (`# ...`, `## ...`, etc.) is never linked.
 *
 * By default, only the first unprotected occurrence of each expression is
 * linked. When a link entry carries `isCustom: true` (user-supplied custom
 * links), every unprotected occurrence is linked.
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
      const replacement = `[${match[0]}](${link.url})`;
      updated = `${updated.slice(0, start)}${replacement}${updated.slice(end)}`;
      // For custom links continue replacing every unprotected occurrence;
      // generated links stop after the first hit.
      if (link.isCustom) {
        expressionRegex.lastIndex = start + replacement.length;
      } else {
        break;
      }
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

  // ATX-style headings: #[#... ]text — the entire line is protected.
  if (/^#{1,6}\s/.test(line)) {
    return true;
  }

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^{}()|[\]\\]/g, '\\$&');
}

/**
 * Enriches markdown with links while preserving YAML frontmatter. Links are
 * only injected into the body (below the `---` delimiter), never into the
 * frontmatter block itself.
 */
export function enrichWithFrontmatterGuard(markdown: string, links: LinkEntry[]): string {
  if (links.length === 0) {
    return markdown;
  }

  const frontmatterMatch = markdown.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  if (!frontmatterMatch) {
    return enrichMarkdownWithLinks(markdown, links);
  }

  const frontmatter = frontmatterMatch[0];
  const body = markdown.slice(frontmatter.length);
  return `${frontmatter}${enrichMarkdownWithLinks(body, links)}`;
}
