import { readFile } from 'node:fs/promises';
import type { AppSettings } from '../config/schema.js';
import {
  buildLinkCandidatesJsonSchema,
  buildLinkCandidatesMessages,
  buildUrlResolutionMessages,
} from '../llm/prompts/linkEnrichment.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { LlmInteractionRecord } from '../pipeline/events.js';
import type { ContentItemLinks, LinkEntry } from '../types/article.js';

const SHORT_FORM_CONTENT_TYPES = new Set(['x-post', 'x-thread']);
const LINKS_REASONING_SETTINGS = {
  effort: 'none',
  exclude: true,
} as const;

export type LinkEnrichmentProgressPhase =
  | 'selecting-expressions'
  | 'resolving-expression'
  | 'resolving-complete'
  | 'completed';

export interface LinkEnrichmentProgressEvent {
  fileId: string;
  phase: LinkEnrichmentProgressPhase;
  detail: string;
  currentExpression?: number;
  totalExpressions?: number;
  expression?: string;
}

export async function enrichLinks({
  markdownFiles,
  articleTitle,
  articleDescription,
  openRouter,
  settings,
  dryRun,
  onLlmMetrics,
  onItemProgress,
  onInteraction,
}: {
  markdownFiles: Array<{ markdownPath: string; fileId: string; contentType: string }>;
  articleTitle: string;
  articleDescription: string;
  openRouter: OpenRouterClient | null;
  settings: AppSettings;
  dryRun: boolean;
  onLlmMetrics?: (fileId: string, metrics: LlmCallMetrics) => void;
  onItemProgress?: (event: LinkEnrichmentProgressEvent) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<ContentItemLinks[]> {
  const results: ContentItemLinks[] = [];

  for (const item of markdownFiles) {
    if (SHORT_FORM_CONTENT_TYPES.has(item.contentType)) {
      continue;
    }

    const markdown = await readFile(item.markdownPath, 'utf8');
    const content = stripFrontmatter(markdown).trim();
    if (!content) {
      onItemProgress?.({
        fileId: item.fileId,
        phase: 'completed',
        detail: 'No content to enrich.',
      });
      results.push({
        fileId: item.fileId,
        contentType: item.contentType,
        markdownPath: item.markdownPath,
        links: [],
      });
      continue;
    }

    if (dryRun || !openRouter) {
      onItemProgress?.({
        fileId: item.fileId,
        phase: 'selecting-expressions',
        detail: 'Selecting expressions.',
      });
      onItemProgress?.({
        fileId: item.fileId,
        phase: 'completed',
        detail: 'Dry run: skipped URL resolution.',
      });
      results.push({
        fileId: item.fileId,
        contentType: item.contentType,
        markdownPath: item.markdownPath,
        links: [],
      });
      continue;
    }

    onItemProgress?.({
      fileId: item.fileId,
      phase: 'selecting-expressions',
      detail: 'Selecting expressions.',
    });

    const candidateResult = await openRouter.requestStructured<{ expressions: string[] }>({
      schemaName: 'link_candidates',
      schema: buildLinkCandidatesJsonSchema(),
      messages: buildLinkCandidatesMessages(content, item.contentType),
      settings,
      reasoning: LINKS_REASONING_SETTINGS,
      interactionContext: {
        stageId: 'links',
        operationId: `links:${item.fileId}:select-expressions`,
      },
      onInteraction,
      parse(data) {
        const record = data as { expressions?: unknown };
        const expressions = Array.isArray(record.expressions)
          ? record.expressions.filter((value): value is string => typeof value === 'string')
          : [];

        return { expressions: dedupeExpressions(expressions).slice(0, 10) };
      },
      onMetrics(metrics) {
        onLlmMetrics?.(item.fileId, metrics);
      },
    });

    const paragraphs = splitParagraphs(content);
    const links: LinkEntry[] = [];
    const totalExpressions = candidateResult.expressions.length;

    if (totalExpressions === 0) {
      onItemProgress?.({
        fileId: item.fileId,
        phase: 'resolving-complete',
        detail: 'No link expressions selected.',
        totalExpressions,
      });
    }

    for (const [index, expression] of candidateResult.expressions.entries()) {
      onItemProgress?.({
        fileId: item.fileId,
        phase: 'resolving-expression',
        detail: `${index + 1}/${totalExpressions}: finding the perfect link for "${toExpressionPreview(expression)}"`,
        currentExpression: index + 1,
        totalExpressions,
        expression,
      });

      const paragraph = findContainingParagraph(paragraphs, expression);
      if (!paragraph) {
        continue;
      }

      const webResult = await openRouter.requestWebSearch({
        messages: buildUrlResolutionMessages({
          articleTitle,
          articleDescription,
          paragraph,
          expression,
        }),
        settings,
        reasoning: LINKS_REASONING_SETTINGS,
        interactionContext: {
          stageId: 'links',
          operationId: `links:${item.fileId}:resolve-${index + 1}`,
        },
        onInteraction,
        onMetrics(metrics) {
          onLlmMetrics?.(item.fileId, metrics);
        },
      });

      const url = normalizeResolvedUrl(webResult.firstCitationUrl ?? webResult.text);
      if (!url) {
        continue;
      }

      if (links.some((entry) => entry.url === url || equalInsensitive(entry.expression, expression))) {
        continue;
      }

      links.push({
        expression,
        url,
        title: webResult.firstCitationTitle,
      });
    }

    onItemProgress?.({
      fileId: item.fileId,
      phase: 'resolving-complete',
      detail: `Resolved ${links.length} links from ${totalExpressions} expressions.`,
      totalExpressions,
    });

    onItemProgress?.({
      fileId: item.fileId,
      phase: 'completed',
      detail: 'Resolution complete. Writing sidecar file.',
      totalExpressions,
    });

    results.push({
      fileId: item.fileId,
      contentType: item.contentType,
      markdownPath: item.markdownPath,
      links,
    });
  }

  return results;
}

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---\n')) {
    return markdown;
  }

  const endIndex = markdown.indexOf('\n---\n', 4);
  if (endIndex < 0) {
    return markdown;
  }

  return markdown.slice(endIndex + 5);
}

function splitParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function findContainingParagraph(paragraphs: string[], expression: string): string | null {
  const needle = expression.trim().toLowerCase();
  if (!needle) {
    return null;
  }

  for (const paragraph of paragraphs) {
    if (paragraph.toLowerCase().includes(needle)) {
      return paragraph;
    }
  }

  return null;
}

function dedupeExpressions(expressions: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const expression of expressions) {
    const normalized = expression.trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function normalizeResolvedUrl(candidate: string): string | null {
  const trimmed = candidate.trim();
  if (!trimmed || /^none$/i.test(trimmed)) {
    return null;
  }

  const extracted = trimmed.match(/https?:\/\/[^\s)]+/i)?.[0] ?? trimmed;
  try {
    const parsed = new URL(extracted);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function equalInsensitive(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function toExpressionPreview(expression: string, maxLength = 60): string {
  const normalized = expression.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}
