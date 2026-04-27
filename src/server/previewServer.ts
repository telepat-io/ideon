import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { watch as fsWatch } from 'node:fs';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { marked } from 'marked';
import { resolveLinksPath } from '../output/filesystem.js';
import { enrichMarkdownWithLinks } from '../output/enrichMarkdownWithLinks.js';
import type { LinkEntry } from '../types/article.js';
import type {
  PreviewArticleContent,
  PreviewAnalyticsSummary,
  PreviewBootstrapData,
  PreviewInteractionsPayload,
  PreviewLlmInteraction,
  PreviewT2IInteraction,
} from '../types/preview.js';
import { stripFrontmatter, listAllGenerations, deriveGenerationId } from './previewHelpers.js';

const execFileAsync = promisify(execFile);

export interface PreviewServerOptions {
  markdownPath: string;
  assetDir: string;
  markdownOutputDir: string;
  port: number;
  openBrowser: boolean;
  watch?: boolean;
}

export interface StartedPreviewServer {
  url: string;
  close: () => Promise<void>;
}

type ArticleContent = PreviewArticleContent;

interface ResolvedPreviewArticle {
  slug: string;
  title: string;
  sourcePath: string;
}

class MissingArticleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingArticleError';
  }
}

export async function startPreviewServer(options: PreviewServerOptions): Promise<StartedPreviewServer> {
  const app = express();
  const previewClientDir = await resolvePreviewClientBuildDir();
  app.disable('x-powered-by');
  app.use('/assets', express.static(options.assetDir));
  if (previewClientDir) {
    app.use(express.static(previewClientDir, { index: false }));
  }

  // SSE reload endpoint — only active in watch mode
  const reloadSubscribers = new Set<ServerResponse>();
  if (options.watch) {
    app.get('/api/__reload', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      reloadSubscribers.add(res);
      req.on('close', () => { reloadSubscribers.delete(res); });
    });

    if (previewClientDir) {
      let debounceTimer: ReturnType<typeof setTimeout> | undefined;
      fsWatch(previewClientDir, { recursive: true }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          for (const subscriber of reloadSubscribers) {
            subscriber.write('data: reload\n\n');
          }
        }, 120);
      });
    }
  }

  app.get('/api/generations/:generationId/assets/*assetPath', async (req, res) => {
    try {
      const generationId = req.params.generationId;
      const assetPathParam = req.params.assetPath;
      const rawAssetPath = Array.isArray(assetPathParam) ? assetPathParam.join('/') : (assetPathParam ?? '');
      const resolvedAssetPath = await resolveGenerationAssetPath(generationId, rawAssetPath, options.markdownOutputDir);
      res.sendFile(resolvedAssetPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error loading generation asset';
      const status = error instanceof MissingArticleError ? 404 : 400;
      res.status(status).type('application/json').json({ error: message });
    }
  });

  // API endpoints
  app.get('/api/articles', async (_req, res) => {
    try {
      const generations = await listAllGenerations(options.markdownOutputDir);
      const articles = generations.map((generation) => ({
        slug: generation.id,
        title: generation.title,
        mtime: generation.mtime,
        previewSnippet: generation.previewSnippet,
        coverImageUrl: generation.coverImageUrl
          ? toGenerationAssetUrl(generation.coverImageUrl, generation.id)
          : null,
      }));
      res.status(200).type('application/json').json(articles);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error listing articles';
      res.status(500).type('application/json').json({ error: message });
    }
  });

  app.get('/api/articles/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const content = await getArticleContent(slug, options.markdownOutputDir);
      res.status(200).type('application/json').json(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error loading article';
      const status = error instanceof MissingArticleError ? 404 : 500;
      res.status(status).type('application/json').json({ error: message });
    }
  });

  app.get('/api/bootstrap', async (_req, res) => {
    try {
      const bootstrap = await getPreviewBootstrapData(options.markdownPath, options.markdownOutputDir);
      res.status(200).type('application/json').json(bootstrap);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown preview bootstrap error.';
      res.status(500).type('application/json').json({ error: message });
    }
  });

  // Main preview page
  app.get('/', async (_req, res) => {
    try {
      if (previewClientDir) {
        if (options.watch) {
          let html: string;
          try {
            html = await readFile(path.join(previewClientDir, 'index.html'), 'utf8');
          } catch {
            // Vite is mid-rebuild — serve a placeholder that reconnects via SSE.
            res.status(200).type('html').send(
              '<!doctype html><html><head><meta charset="utf-8">'
              + '<title>Rebuilding\u2026</title>'
              + '<style>body{margin:0;display:flex;align-items:center;justify-content:center;'
              + 'height:100vh;font-family:sans-serif;background:#101820;color:#e0eaf0}'
              + 'p{font-size:15px;opacity:.7}</style>'
              + '</head><body><p>Rebuilding\u2026</p>'
              + "<script>const s=new EventSource('/api/__reload');s.onmessage=function(){location.reload()};</script>"
              + '</body></html>',
            );
            return;
          }

          const reloadScript = "<script>const __r=new EventSource('/api/__reload');__r.onmessage=function(){location.reload()};</script>";
          const injected = html.replace('</body>', `${reloadScript}</body>`);
          res.status(200).type('html').send(injected);
        } else {
          res.status(200).sendFile(path.join(previewClientDir, 'index.html'));
        }
        return;
      }

      const bootstrap = await getPreviewBootstrapData(options.markdownPath, options.markdownOutputDir);
      const html = renderShell(bootstrap);
      res.status(200).type('html').send(html);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown preview rendering error.';
      res.status(500).type('text').send(`Failed to render preview: ${message}`);
    }
  });

  const server = await new Promise<import('node:http').Server>((resolve, reject) => {
    const instance = app.listen(options.port, () => {
      resolve(instance);
    });

    instance.on('error', (error) => {
      reject(error);
    });
  });

  const serverAddress = server.address();
  const boundPort = typeof serverAddress === 'object' && serverAddress ? serverAddress.port : options.port;
  const url = `http://localhost:${boundPort}`;
  if (options.openBrowser) {
    void tryOpenBrowser(url);
  }

  return {
    url,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

async function getArticleContent(generationId: string, markdownOutputDir: string): Promise<ArticleContent> {
  const generations = await listAllGenerations(markdownOutputDir);
  const generation = generations.find((item) => item.id === generationId);

  if (!generation) {
    throw new MissingArticleError(`Generation "${generationId}" no longer exists.`);
  }

  const sourcePath = resolveGenerationSourcePath(generation, markdownOutputDir);

  const canonicalSlug = generation.outputs.find((output) => output.contentType === generation.primaryContentType)?.slug
    ?? generation.outputs[0]?.slug
    ?? generation.id;

  const outputs = await Promise.all(
    generation.outputs.map(async (output) => {
      let markdown = '';
      try {
        markdown = await readFile(output.sourcePath, 'utf8');
      } catch (error) {
        if (isMissingFileError(error)) {
          throw new MissingArticleError(`Generation "${generationId}" no longer exists.`);
        }

        throw error;
      }

      return {
        id: output.id,
        contentType: output.contentType,
        contentTypeLabel: output.contentTypeLabel,
        index: output.index,
        slug: canonicalSlug,
        title: output.title,
        htmlBody: await renderArticleHtml(markdown, generationId, output.sourcePath),
      };
    }),
  );

  const generationDir = path.dirname(generation.outputs[0]?.sourcePath ?? '');
  const interactions = generationDir ? await loadSavedInteractions(generationDir) : { llmCalls: [], t2iCalls: [] };
  const analyticsSummary = generationDir ? await loadSavedAnalyticsSummary(generationDir) : null;

  return {
    title: generation.title,
    generationId: generation.id,
    sourcePath,
    interactions,
    analyticsSummary,
    outputs,
  };
}

async function resolveActivePreviewArticle(
  preferredMarkdownPath: string,
  markdownOutputDir: string,
): Promise<ResolvedPreviewArticle | null> {
  const generations = await listAllGenerations(markdownOutputDir);
  if (generations.length === 0) {
    return null;
  }

  const preferredSlug = deriveGenerationId(preferredMarkdownPath, markdownOutputDir);
  const activeArticle = generations.find((article) => article.id === preferredSlug) ?? generations[0];
  if (!activeArticle) {
    return null;
  }

  return {
    slug: activeArticle.id,
    title: activeArticle.title,
    sourcePath: resolveGenerationSourcePath(activeArticle, markdownOutputDir),
  };
}

function resolveGenerationSourcePath(
  generation: { id: string; primaryContentType: string; outputs: Array<{ contentType: string; sourcePath: string }> },
  markdownOutputDir: string,
): string {
  return generation.outputs.find((output) => output.contentType === generation.primaryContentType)?.sourcePath
    ?? generation.outputs[0]?.sourcePath
    ?? path.join(markdownOutputDir, generation.id);
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

async function renderArticleHtml(markdown: string, generationId: string, sourcePath: string): Promise<string> {
  let content = stripFrontmatter(markdown);
  const links = await loadSavedLinks(sourcePath);
  content = enrichMarkdownWithLinks(content, links);
  const html = await marked.parse(content);
  return rewriteRelativeAssetUrls(html, generationId);
}

async function loadSavedLinks(markdownPath: string): Promise<LinkEntry[]> {
  const linksPath = resolveLinksPath(markdownPath);

  try {
    const raw = await readFile(linksPath, 'utf8');
    const parsed = JSON.parse(raw) as { links?: unknown };
    if (!Array.isArray(parsed.links)) {
      return [];
    }

    return parsed.links
      .filter((entry): entry is LinkEntry => {
        if (typeof entry !== 'object' || entry === null) {
          return false;
        }

        const record = entry as { expression?: unknown; url?: unknown; title?: unknown };
        return typeof record.expression === 'string'
          && typeof record.url === 'string'
          && (record.title === null || typeof record.title === 'string');
      })
      .map((entry) => ({
        expression: entry.expression.trim(),
        url: entry.url.trim(),
        title: entry.title,
      }))
      .filter((entry) => entry.expression.length > 0 && entry.url.length > 0);
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }

    return [];
  }
}

async function loadSavedInteractions(generationDir: string): Promise<PreviewInteractionsPayload> {
  const interactionsPath = path.join(generationDir, 'model.interactions.json');

  try {
    const raw = await readFile(interactionsPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      llmCalls?: unknown;
      t2iCalls?: unknown;
    };

    const llmCalls = Array.isArray(parsed.llmCalls)
      ? parsed.llmCalls.filter(isPreviewLlmInteraction)
      : [];
    const t2iCalls = Array.isArray(parsed.t2iCalls)
      ? parsed.t2iCalls.filter(isPreviewT2IInteraction)
      : [];

    return {
      llmCalls,
      t2iCalls,
    };
  } catch {
    return {
      llmCalls: [],
      t2iCalls: [],
    };
  }
}

async function loadSavedAnalyticsSummary(generationDir: string): Promise<PreviewAnalyticsSummary | null> {
  const analyticsPath = path.join(generationDir, 'generation.analytics.json');

  try {
    const raw = await readFile(analyticsPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      summary?: {
        totalDurationMs?: unknown;
        totalCostUsd?: unknown;
        totalCostSource?: unknown;
      };
    };

    const summary = parsed.summary;
    if (!summary || typeof summary !== 'object') {
      return null;
    }

    const totalDurationMs = typeof summary.totalDurationMs === 'number'
      ? summary.totalDurationMs
      : null;
    const totalCostUsd = typeof summary.totalCostUsd === 'number'
      ? summary.totalCostUsd
      : null;
    const totalCostSource = typeof summary.totalCostSource === 'string'
      ? summary.totalCostSource
      : null;

    if (totalDurationMs === null && totalCostUsd === null && totalCostSource === null) {
      return null;
    }

    return {
      totalDurationMs,
      totalCostUsd,
      totalCostSource,
    };
  } catch {
    return null;
  }
}

async function getPreviewBootstrapData(
  preferredMarkdownPath: string,
  markdownOutputDir: string,
): Promise<PreviewBootstrapData> {
  const activeArticle = await resolveActivePreviewArticle(preferredMarkdownPath, markdownOutputDir);
  const emptyStateMessage = activeArticle
    ? null
    : `No generated content found in ${markdownOutputDir}. Run ideon write "your idea" first.`;

  return {
    title: activeArticle?.title ?? 'Ideon Preview',
    sourcePath: activeArticle?.sourcePath ?? markdownOutputDir,
    currentSlug: activeArticle?.slug ?? '',
    emptyStateMessage,
  };
}

async function resolvePreviewClientBuildDir(): Promise<string | null> {
  // Resolve relative to this file so the path is correct in all contexts:
  //   - Compiled tsup bundle (dist/ideon.js): currentDir = dist/
  //       → dist/preview/ ✓
  //   - tsx dev run (src/server/previewServer.ts): currentDir = src/server/
  //       → ../../dist/preview/ = dist/preview/ ✓
  //   - Globally installed: /usr/local/.../dist/ideon.js
  //       → /usr/local/.../dist/preview/ ✓
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(currentDir, 'preview'),
    path.resolve(currentDir, '../../dist/preview'),
  ];

  for (const candidate of candidates) {
    try {
      const indexStat = await stat(path.join(candidate, 'index.html'));
      if (indexStat.isFile()) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function isPreviewLlmInteraction(value: unknown): value is PreviewLlmInteraction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.stageId === 'string'
    && typeof record.operationId === 'string'
    && (record.requestType === 'structured' || record.requestType === 'text' || record.requestType === 'web-search')
    && record.provider === 'openrouter'
    && typeof record.modelId === 'string'
    && typeof record.startedAt === 'string'
    && typeof record.endedAt === 'string'
    && typeof record.durationMs === 'number'
    && typeof record.attempts === 'number'
    && typeof record.retries === 'number'
    && typeof record.retryBackoffMs === 'number'
    && (record.status === 'succeeded' || record.status === 'failed')
    && typeof record.requestBody === 'string'
    && (record.responseBody === null || typeof record.responseBody === 'string')
    && (record.errorMessage === null || typeof record.errorMessage === 'string');
}

function isPreviewT2IInteraction(value: unknown): value is PreviewT2IInteraction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.stageId === 'images'
    && typeof record.operationId === 'string'
    && (record.provider === 'replicate' || record.provider === 'replicate-dry-run')
    && typeof record.modelId === 'string'
    && (record.kind === 'cover' || record.kind === 'inline')
    && typeof record.startedAt === 'string'
    && typeof record.endedAt === 'string'
    && typeof record.durationMs === 'number'
    && typeof record.attempts === 'number'
    && typeof record.retries === 'number'
    && typeof record.retryBackoffMs === 'number'
    && (record.status === 'succeeded' || record.status === 'failed')
    && typeof record.prompt === 'string'
    && typeof record.input === 'object'
    && record.input !== null
    && (record.errorMessage === null || typeof record.errorMessage === 'string');
}

function rewriteRelativeAssetUrls(html: string, generationId: string): string {
  const replaceAttribute = (source: string, attribute: 'src' | 'href'): string => {
    const doubleQuotePattern = new RegExp(`${attribute}="([^"]+)"`, 'gi');
    const singleQuotePattern = new RegExp(`${attribute}='([^']+)'`, 'gi');

    let updated = source.replace(doubleQuotePattern, (_match, rawValue: string) => {
      const rewritten = toGenerationAssetUrl(rawValue, generationId);
      return `${attribute}="${rewritten}"`;
    });

    updated = updated.replace(singleQuotePattern, (_match, rawValue: string) => {
      const rewritten = toGenerationAssetUrl(rawValue, generationId);
      return `${attribute}='${rewritten}'`;
    });

    return updated;
  };

  return replaceAttribute(replaceAttribute(html, 'src'), 'href');
}

function toGenerationAssetUrl(rawValue: string, generationId: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (
    trimmed.startsWith('http://')
    || trimmed.startsWith('https://')
    || trimmed.startsWith('/')
    || trimmed.startsWith('#')
    || trimmed.startsWith('data:')
    || trimmed.startsWith('mailto:')
    || trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }

  const [pathPart, hashPart = ''] = trimmed.split('#', 2);
  const [basePath, queryPart = ''] = pathPart.split('?', 2);
  const normalizedPath = basePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const prefix = `/api/generations/${encodeURIComponent(generationId)}/assets/${normalizedPath}`;
  const querySuffix = queryPart.length > 0 ? `?${queryPart}` : '';
  const hashSuffix = hashPart.length > 0 ? `#${hashPart}` : '';
  return `${prefix}${querySuffix}${hashSuffix}`;
}

async function resolveGenerationAssetPath(
  generationId: string,
  rawAssetPath: string,
  markdownOutputDir: string,
): Promise<string> {
  const generations = await listAllGenerations(markdownOutputDir);
  const generation = generations.find((item) => item.id === generationId);
  if (!generation) {
    throw new MissingArticleError(`Generation "${generationId}" no longer exists.`);
  }

  const decodedAssetPath = decodeURIComponent(rawAssetPath);
  const normalizedRelative = path.posix.normalize(decodedAssetPath.replace(/\\/g, '/'));
  if (
    normalizedRelative.length === 0
    || normalizedRelative === '.'
    || normalizedRelative.startsWith('../')
    || normalizedRelative.includes('/../')
    || path.posix.isAbsolute(normalizedRelative)
  ) {
    throw new Error('Invalid generation asset path.');
  }

  const generationDir = path.dirname(generation.outputs[0]?.sourcePath ?? '');
  if (!generationDir) {
    throw new MissingArticleError(`Generation "${generationId}" has no source directory.`);
  }

  const resolvedPath = path.resolve(generationDir, normalizedRelative);
  const relativeToGeneration = path.relative(generationDir, resolvedPath);
  if (relativeToGeneration.startsWith('..') || path.isAbsolute(relativeToGeneration)) {
    throw new Error('Invalid generation asset path.');
  }

  try {
    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) {
      throw new Error('Invalid generation asset path.');
    }
  } catch {
    throw new MissingArticleError(`Asset "${normalizedRelative}" no longer exists.`);
  }

  return resolvedPath;
}

function renderShell({
  title,
  sourcePath,
  currentSlug,
  emptyStateMessage,
}: {
  title: string;
  sourcePath: string;
  currentSlug: string;
  emptyStateMessage?: string | null;
}): string {
  const initialArticleClass = emptyStateMessage ? '' : 'loading preview-empty';
  const initialArticleMarkup = emptyStateMessage
    ? `<div style="padding: 2rem; color: var(--muted);">${escapeHtml(emptyStateMessage)}</div>`
    : 'Loading generation...';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | Ideon Preview</title>
    <script>
      (() => {
        const storageKey = 'ideon-preview-theme';
        try {
          const storedTheme = localStorage.getItem(storageKey);
          if (storedTheme === 'light' || storedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', storedTheme);
          }
        } catch {
          // Ignore storage access errors and fall back to OS-level preference.
        }
      })();
    </script>
    <style>
      :root {
        --bg: #f4efe6;
        --paper: #fffdf9;
        --text: #1f1c18;
        --muted: #6c6257;
        --accent: #0b6e4f;
        --border: #d9cfbf;
        --elevated: #f9f4ed;
        --hover: #f0e9de;
        --tab-bg: #f7f0e4;
        --variant-bg: #fff8ef;
        --variant-border: #b9ad9c;
        --variant-text: #695f54;
        --variant-active-border: #244f75;
        --variant-active-bg: #eef4fb;
        --variant-active-text: #244f75;
        --blockquote-border: #c4b299;
        --blockquote-bg: #faf5ed;
        --slug-bg: #f0ebe2;
        --copy-disabled-bg: #e4f0ea;
        --copy-disabled-border: #b8d9c8;
        --status-error: #b42318;
        --x-bg: #000;
        --x-text: #e7e9ea;
        --x-border: #2f3336;
        --x-link: #6cb8ff;
        --linkedin-bg: #ffffff;
        --linkedin-header-bg: #f0f7ff;
        --linkedin-border: #0a66c2;
        --reddit-bg: #fff8f3;
        --reddit-header-bg: #fff1e7;
        --reddit-border: #ff4500;
        --newsletter-bg: #fffdf4;
        --newsletter-header-bg: #fff5cc;
        --newsletter-border: #cfb95a;
        color-scheme: light;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #1a1712;
          --paper: #241f18;
          --text: #efe7dc;
          --muted: #b8aa98;
          --accent: #c9973c;
          --border: #504336;
          --elevated: #211c15;
          --hover: #2d271f;
          --tab-bg: #32291f;
          --variant-bg: #2a231b;
          --variant-border: #6d5d4b;
          --variant-text: #c7b7a5;
          --variant-active-border: #7db9f1;
          --variant-active-bg: #1f3040;
          --variant-active-text: #bfe1ff;
          --blockquote-border: #8e7454;
          --blockquote-bg: #2d2418;
          --slug-bg: #2b241b;
          --copy-disabled-bg: #1f3830;
          --copy-disabled-border: #2c6450;
          --status-error: #ff8a80;
          --x-bg: #0d1116;
          --x-text: #e9edf2;
          --x-border: #33404a;
          --x-link: #8bc6ff;
          --linkedin-bg: #1b252f;
          --linkedin-header-bg: #1f313f;
          --linkedin-border: #4f96da;
          --reddit-bg: #2a221b;
          --reddit-header-bg: #34271d;
          --reddit-border: #ff7d45;
          --newsletter-bg: #2e291b;
          --newsletter-header-bg: #3b331e;
          --newsletter-border: #d6b25f;
          color-scheme: dark;
        }
      }

      html[data-theme='light'] {
        --bg: #f4efe6;
        --paper: #fffdf9;
        --text: #1f1c18;
        --muted: #6c6257;
        --accent: #0b6e4f;
        --border: #d9cfbf;
        --elevated: #f9f4ed;
        --hover: #f0e9de;
        --tab-bg: #f7f0e4;
        --variant-bg: #fff8ef;
        --variant-border: #b9ad9c;
        --variant-text: #695f54;
        --variant-active-border: #244f75;
        --variant-active-bg: #eef4fb;
        --variant-active-text: #244f75;
        --blockquote-border: #c4b299;
        --blockquote-bg: #faf5ed;
        --slug-bg: #f0ebe2;
        --copy-disabled-bg: #e4f0ea;
        --copy-disabled-border: #b8d9c8;
        --status-error: #b42318;
        --x-bg: #000;
        --x-text: #e7e9ea;
        --x-border: #2f3336;
        --x-link: #6cb8ff;
        --linkedin-bg: #ffffff;
        --linkedin-header-bg: #f0f7ff;
        --linkedin-border: #0a66c2;
        --reddit-bg: #fff8f3;
        --reddit-header-bg: #fff1e7;
        --reddit-border: #ff4500;
        --newsletter-bg: #fffdf4;
        --newsletter-header-bg: #fff5cc;
        --newsletter-border: #cfb95a;
        color-scheme: light;
      }

      html[data-theme='dark'] {
        --bg: #1a1712;
        --paper: #241f18;
        --text: #efe7dc;
        --muted: #b8aa98;
        --accent: #c9973c;
        --border: #504336;
        --elevated: #211c15;
        --hover: #2d271f;
        --tab-bg: #32291f;
        --variant-bg: #2a231b;
        --variant-border: #6d5d4b;
        --variant-text: #c7b7a5;
        --variant-active-border: #7db9f1;
        --variant-active-bg: #1f3040;
        --variant-active-text: #bfe1ff;
        --blockquote-border: #8e7454;
        --blockquote-bg: #2d2418;
        --slug-bg: #2b241b;
        --copy-disabled-bg: #1f3830;
        --copy-disabled-border: #2c6450;
        --status-error: #ff8a80;
        --x-bg: #0d1116;
        --x-text: #e9edf2;
        --x-border: #33404a;
        --x-link: #8bc6ff;
        --linkedin-bg: #1b252f;
        --linkedin-header-bg: #1f313f;
        --linkedin-border: #4f96da;
        --reddit-bg: #2a221b;
        --reddit-header-bg: #34271d;
        --reddit-border: #ff7d45;
        --newsletter-bg: #2e291b;
        --newsletter-header-bg: #3b331e;
        --newsletter-border: #d6b25f;
        color-scheme: dark;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        color: var(--text);
        background:
          radial-gradient(circle at 0% 0%, #7a5838 0%, transparent 45%),
          radial-gradient(circle at 100% 0%, #dceadf 0%, transparent 35%),
          var(--bg);
        background-attachment: fixed;
        font-family: "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif;
        line-height: 1.65;
      }

      main {
        display: flex;
        min-height: 100vh;
      }

      aside {
        width: 320px;
        background: var(--elevated);
        border-right: 1px solid var(--border);
        overflow-y: auto;
        padding: 1.5rem 0;
        flex-shrink: 0;
      }

      @media (min-width: 1200px) {
        aside {
          width: 400px;
        }

        .sidebar-header {
          padding: 0 1.75rem;
        }

        .article-item {
          margin: 0.25rem 0.75rem;
        }

        .article-item button {
          padding: 1rem 1.25rem;
        }
      }

      @media (min-width: 1600px) {
        aside {
          width: 460px;
        }
      }

      .sidebar-header {
        padding: 0 1.5rem;
        margin-bottom: 0.75rem;
        font-size: 0.9rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }

      .sidebar-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0 1.5rem;
        margin-bottom: 0.8rem;
      }

      .theme-toggle-btn {
        font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
        font-size: 0.72rem;
        letter-spacing: 0.25px;
        text-transform: uppercase;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--paper);
        color: var(--muted);
        padding: 0.22rem 0.6rem;
        cursor: pointer;
      }

      .theme-toggle-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
      }

      .article-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .article-item {
        margin: 0.25rem 0.5rem;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .article-item:hover {
        background: var(--hover);
      }

      .article-item.active {
        background: var(--accent);
      }

      .article-item button {
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        padding: 0.75rem 1rem;
        cursor: pointer;
        color: inherit;
        font: inherit;
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
      }

      .article-item.active button {
        color: white;
      }

      .article-thumb {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 8px;
        flex-shrink: 0;
        border: 1px solid var(--border);
        background: var(--border);
        display: block;
      }

      .article-item.active .article-thumb {
        border-color: rgba(255, 255, 255, 0.3);
      }

      .article-text {
        flex: 1;
        min-width: 0;
      }

      .article-title {
        display: block;
        font-weight: 600;
        font-size: 0.95rem;
        margin: 0 0 0.25rem 0;
        line-height: 1.3;
      }

      .article-meta {
        display: block;
        font-size: 0.75rem;
        color: var(--muted);
        margin: 0 0 0.5rem 0;
      }

      .article-item.active .article-meta {
        color: rgba(255, 255, 255, 0.8);
      }

      .article-snippet {
        display: block;
        font-size: 0.8rem;
        color: var(--muted);
        margin: 0;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .article-item.active .article-snippet {
        color: rgba(255, 255, 255, 0.7);
      }

      .content-wrapper {
        flex: 1;
        overflow-y: auto;
      }

      .preview-empty {
        min-height: 240px;
      }

      .container {
        max-width: 860px;
        margin: 2.5rem auto;
        padding: 0 1.25rem;
      }

      .card {
        background: var(--paper);
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: 0 10px 40px rgba(21, 18, 12, 0.08);
        overflow: hidden;
      }

      .meta {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        color: var(--muted);
        font-size: 0.92rem;
      }

      article {
        padding: 1.75rem 1.5rem 2rem;
      }

      .type-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0 0 0.9rem;
      }

      .type-tabs-spacer {
        flex: 1;
      }

      .type-tab-btn {
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--tab-bg);
        color: var(--muted);
        font-size: 0.82rem;
        font-weight: 600;
        letter-spacing: 0.15px;
        padding: 0.35rem 0.7rem;
        cursor: pointer;
      }

      .type-tab-btn.active {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
      }

      .logs-tab-btn {
        border: 1px solid var(--variant-active-border);
        border-radius: 999px;
        background: var(--variant-active-bg);
        color: var(--variant-active-text);
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.15px;
        padding: 0.35rem 0.8rem;
        cursor: pointer;
      }

      .logs-tab-btn.active {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
      }

      .variant-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin: 0 0 1.25rem;
      }

      .variant-tab-btn {
        border: 1px dashed var(--variant-border);
        border-radius: 8px;
        background: var(--variant-bg);
        color: var(--variant-text);
        font-size: 0.78rem;
        padding: 0.3rem 0.55rem;
        cursor: pointer;
      }

      .variant-tab-btn.active {
        border-style: solid;
        border-color: var(--variant-active-border);
        color: var(--variant-active-text);
        background: var(--variant-active-bg);
      }

      .interactions-layout {
        display: grid;
        grid-template-columns: minmax(220px, 280px) 1fr;
        gap: 0.85rem;
      }

      .interactions-list {
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--elevated);
        padding: 0.7rem;
        max-height: 70vh;
        overflow: auto;
      }

      .interaction-stage {
        margin-bottom: 0.8rem;
      }

      .interaction-stage-title {
        margin: 0 0 0.35rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.35px;
      }

      .interaction-items {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.35rem;
      }

      .interaction-item-btn {
        width: 100%;
        text-align: left;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--paper);
        color: var(--text);
        padding: 0.4rem 0.5rem;
        cursor: pointer;
      }

      .interaction-item-btn.active {
        border-color: var(--accent);
        background: color-mix(in srgb, var(--accent) 12%, var(--paper));
      }

      .interaction-item-line {
        display: block;
        font-size: 0.76rem;
        color: var(--muted);
      }

      .interaction-item-line.primary {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text);
      }

      .interactions-detail {
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--paper);
        overflow: hidden;
      }

      .interactions-detail-header {
        border-bottom: 1px solid var(--border);
        padding: 0.7rem 0.85rem;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }

      .interactions-detail-title {
        margin: 0;
        font-size: 0.95rem;
        font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
      }

      .interactions-mode-toggle {
        display: flex;
        gap: 0.35rem;
      }

      .interactions-mode-btn {
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--variant-bg);
        color: var(--muted);
        font-size: 0.72rem;
        padding: 0.22rem 0.55rem;
        cursor: pointer;
      }

      .interactions-mode-btn.active {
        border-color: var(--variant-active-border);
        color: var(--variant-active-text);
        background: var(--variant-active-bg);
      }

      .interactions-detail-body {
        padding: 0.85rem;
        display: grid;
        gap: 0.75rem;
      }

      .interactions-kv {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 0.25rem 0.6rem;
        font-size: 0.8rem;
      }

      .interactions-kv dt {
        color: var(--muted);
      }

      .interactions-kv dd {
        margin: 0;
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        word-break: break-word;
      }

      .interaction-block-title {
        margin: 0 0 0.25rem;
        font-size: 0.8rem;
        color: var(--muted);
      }

      .interaction-pre {
        margin: 0;
        padding: 0.7rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--elevated);
        max-height: 46vh;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 0.78rem;
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      }

      .channel-shell {
        border-radius: 14px;
        border: 1px solid var(--border);
        overflow: hidden;
      }

      .channel-header {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .channel-title {
        font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
        font-size: 0.92rem;
        font-weight: 700;
      }

      .channel-meta {
        font-size: 0.76rem;
        color: var(--muted);
      }

      .channel-body {
        padding: 1rem 1rem 1.2rem;
      }

      .channel-x-post,
      .channel-x-thread {
        background: var(--x-bg);
        color: var(--x-text);
        border-color: var(--x-border);
      }

      .channel-x-post .channel-header,
      .channel-x-thread .channel-header {
        border-bottom-color: var(--x-border);
      }

      .channel-x-post .channel-meta,
      .channel-x-post a,
      .channel-x-thread .channel-meta,
      .channel-x-thread a {
        color: var(--x-link);
      }

      .channel-linkedin-post {
        background: var(--linkedin-bg);
        border-color: var(--linkedin-border);
      }

      .channel-linkedin-post .channel-header {
        background: var(--linkedin-header-bg);
      }

      .channel-reddit-post {
        background: var(--reddit-bg);
        border-color: var(--reddit-border);
      }

      .channel-reddit-post .channel-header {
        background: var(--reddit-header-bg);
      }

      .channel-newsletter {
        background: var(--newsletter-bg);
        border-color: var(--newsletter-border);
      }

      .channel-newsletter .channel-header {
        background: var(--newsletter-header-bg);
      }

      .channel-article,
      .channel-blog-post {
        background: var(--paper);
      }

      article h1,
      article h2,
      article h3 {
        font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
        line-height: 1.2;
        margin-top: 1.8rem;
        margin-bottom: 0.8rem;
      }

      article h1 {
        font-size: clamp(2rem, 5vw, 3rem);
        margin-top: 0;
      }

      article h2 {
        font-size: clamp(1.35rem, 3vw, 1.8rem);
      }

      article p {
        margin: 1rem 0;
        font-size: 1.08rem;
      }

      article img {
        display: block;
        width: 100%;
        height: auto;
        border-radius: 12px;
        margin: 1.25rem 0;
        border: 1px solid var(--border);
      }

      article a {
        color: var(--accent);
      }

      article blockquote {
        margin: 1.2rem 0;
        padding: 0.5rem 1rem;
        border-left: 4px solid var(--blockquote-border);
        background: var(--blockquote-bg);
      }

      .slug-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0.35rem 0 0.45rem;
        justify-content: flex-start;
      }

      .slug-text {
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 0.82rem;
        background: var(--slug-bg);
        color: var(--muted);
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        border: 1px solid var(--border);
        user-select: all;
      }

      .copy-btn {
        font-family: inherit;
        font-size: 0.8rem;
        background: none;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.25rem 0.6rem;
        cursor: pointer;
        color: var(--muted);
        transition: background 0.15s, color 0.15s;
      }

      .copy-btn:hover {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      .copy-btn:disabled {
        cursor: default;
        background: var(--copy-disabled-bg);
        color: var(--accent);
        border-color: var(--copy-disabled-border);
      }

      .list-status {
        padding: 1rem;
        color: var(--muted);
        font-size: 0.9rem;
      }

      .error-text {
        color: var(--status-error);
      }

      .empty-message {
        padding: 2rem;
        color: var(--muted);
      }

      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--muted);
      }

      @media (max-width: 700px) {
        main {
          flex-direction: column;
        }

        aside {
          width: 100%;
          border-right: none;
          border-bottom: 1px solid var(--border);
          max-height: 200px;
          display: none;
        }

        aside.visible {
          display: block;
        }

        .container {
          margin: 1.25rem auto;
          padding: 0 0.75rem;
        }

        article {
          padding: 1.2rem 1rem 1.5rem;
        }

        .type-tabs,
        .variant-tabs {
          gap: 0.35rem;
        }

        .interactions-layout {
          grid-template-columns: 1fr;
        }

        .interactions-list {
          max-height: 42vh;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <aside id="sidebar">
        <div class="sidebar-header-row">
          <div class="sidebar-header">Generations</div>
          <button id="themeToggle" type="button" class="theme-toggle-btn" aria-label="Toggle theme"></button>
        </div>
        <ul class="article-list" id="articleList">
          <li class="list-status">Loading...</li>
        </ul>
      </aside>
      <div class="content-wrapper">
        <div class="container">
          <section class="card">
            <div class="meta">Source: ${escapeHtml(sourcePath)}</div>
            <article id="article" class="${initialArticleClass}">
              ${initialArticleMarkup}
            </article>
          </section>
        </div>
      </div>
    </main>

    <script>
      const THEME_STORAGE_KEY = 'ideon-preview-theme';
      const currentSlug = '${escapeHtml(currentSlug)}';
      const articleElement = document.getElementById('article');
      const articleListElement = document.getElementById('articleList');
      const themeToggleButton = document.getElementById('themeToggle');
      const typeOrder = ['article', 'blog-post', 'x-thread', 'x-post', 'linkedin-post', 'reddit-post', 'newsletter'];
      const stageOrder = ['shared-brief', 'planning', 'sections', 'image-prompts', 'images', 'output', 'links'];

      let currentGeneration = null;
      let activeType = '';
      let activeOutputId = '';
      let activeTopView = 'content';
      let selectedInteractionId = '';
      let interactionViewMode = 'text';

      function getStoredTheme() {
        try {
          const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
          return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
        } catch {
          return null;
        }
      }

      function setStoredTheme(theme) {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
          // Ignore storage access errors.
        }
      }

      function systemPrefersDarkMode() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      function getEffectiveTheme() {
        const explicitTheme = document.documentElement.getAttribute('data-theme');
        if (explicitTheme === 'light' || explicitTheme === 'dark') {
          return explicitTheme;
        }

        return systemPrefersDarkMode() ? 'dark' : 'light';
      }

      function updateThemeToggleLabel(theme) {
        if (!(themeToggleButton instanceof HTMLButtonElement)) {
          return;
        }

        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        themeToggleButton.textContent = 'Theme: ' + theme;
        themeToggleButton.setAttribute('aria-label', 'Switch to ' + nextTheme + ' theme');
      }

      function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeToggleLabel(theme);
      }

      function initializeThemeControls() {
        const initialTheme = getEffectiveTheme();
        updateThemeToggleLabel(initialTheme);

        if (!(themeToggleButton instanceof HTMLButtonElement)) {
          return;
        }

        themeToggleButton.addEventListener('click', () => {
          const nextTheme = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
          applyTheme(nextTheme);
          setStoredTheme(nextTheme);
        });

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
          if (!getStoredTheme()) {
            updateThemeToggleLabel(mediaQuery.matches ? 'dark' : 'light');
          }
        });
      }

      async function loadArticles() {
        try {
          const response = await fetch('/api/articles');
          if (!response.ok) throw new Error('Failed to load articles');
          const articles = await response.json();

          if (articles.length === 0) {
            articleListElement.innerHTML = '<li class="list-status">No generations yet</li>';
            return;
          }

          articleListElement.innerHTML = articles
            .map(
              (article) =>
                \`<li class="article-item\${article.slug === currentSlug ? ' active' : ''}" data-slug="\${escapeHtml(article.slug)}">
              <button onclick="loadArticle(this.parentElement.dataset.slug); return false;">
                \${article.coverImageUrl ? \`<img class="article-thumb" src="\${article.coverImageUrl}" alt="" loading="lazy">\` : ''}
                <div class="article-text">
                  <span class="article-title">\${escapeHtml(article.title)}</span>
                  <span class="article-meta">\${formatDate(new Date(article.mtime))}</span>
                  <span class="article-snippet">\${escapeHtml(article.previewSnippet)}</span>
                </div>
              </button>
            </li>\`
            )
            .join('');
        } catch (error) {
          console.error('Error loading articles:', error);
          articleListElement.innerHTML = '<li class="list-status error-text">Error loading articles</li>';
        }
      }

      async function loadArticle(slug) {
        articleElement.innerHTML = '<div class="loading">Loading generation...</div>';

        try {
          const response = await fetch(\`/api/articles/\${encodeURIComponent(slug)}\`);
          if (!response.ok) throw new Error('Generation not found');
          const payload = await response.json();

          currentGeneration = payload;
          const firstOutput = currentGeneration.outputs?.[0];
          activeType = firstOutput?.contentType ?? '';
          activeOutputId = firstOutput?.id ?? '';
          activeTopView = 'content';
          selectedInteractionId = '';
          interactionViewMode = 'text';
          renderGeneration();
          articleElement.classList.remove('loading', 'preview-empty');

          // Update active state in sidebar by matching data-slug attribute
          document.querySelectorAll('.article-item').forEach((item) => {
            if (item.dataset.slug === slug) {
              item.classList.add('active');
            } else {
              item.classList.remove('active');
            }
          });

          // Update document title
          document.title = \`\${payload.title} | Ideon Preview\`;

          // Scroll to top
          window.scrollTo(0, 0);
        } catch (error) {
          console.error('Error loading article:', error);
          articleElement.innerHTML = '<div class="empty-message error-text">Error loading article</div>';
          articleElement.classList.remove('loading');
        }
      }

      function renderGeneration() {
        if (!currentGeneration || !Array.isArray(currentGeneration.outputs) || currentGeneration.outputs.length === 0) {
          articleElement.classList.add('preview-empty');
          articleElement.innerHTML = '<div class="empty-message">No content outputs found for this generation.</div>';
          return;
        }

        const grouped = groupOutputsByType(currentGeneration.outputs);
        const availableTypes = Object.keys(grouped).sort((left, right) => {
          const leftIndex = typeOrder.indexOf(left);
          const rightIndex = typeOrder.indexOf(right);
          const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
          const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
          if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
          return left.localeCompare(right);
        });

        if (!grouped[activeType]) {
          activeType = availableTypes[0] || '';
        }

        const variants = grouped[activeType] || [];
        if (!variants.some((item) => item.id === activeOutputId)) {
          activeOutputId = variants[0]?.id || '';
        }

        const activeOutput = variants.find((item) => item.id === activeOutputId) || variants[0];

        const typeTabs = availableTypes
          .map((type) => {
            const label = grouped[type]?.[0]?.contentTypeLabel || type;
            const className = type === activeType ? 'type-tab-btn active' : 'type-tab-btn';
            return \`<button type="button" class="\${className}" data-type-tab="\${escapeHtml(type)}">\${escapeHtml(label)}</button>\`;
          })
          .join('')
          + '<span class="type-tabs-spacer"></span>'
          + '<button type="button" class="' + (activeTopView === 'logs' ? 'logs-tab-btn active' : 'logs-tab-btn') + '" data-logs-tab="true">Logs</button>';

        const variantTabs = variants
          .map((item) => {
            const className = item.id === activeOutputId ? 'variant-tab-btn active' : 'variant-tab-btn';
            return \`<button type="button" class="\${className}" data-output-id="\${escapeHtml(item.id)}">\${escapeHtml(item.contentTypeLabel)} \${item.index}</button>\`;
          })
          .join('');

        if (activeTopView === 'logs') {
          articleElement.innerHTML = [
            '<div class="type-tabs">',
            typeTabs,
            '</div>',
            renderInteractionsPanel(currentGeneration.interactions),
          ].join('');
          return;
        }

        articleElement.innerHTML = [
          '<div class="type-tabs">',
          typeTabs,
          '</div>',
          '<div class="variant-tabs">',
          variantTabs,
          '</div>',
          activeOutput ? renderOutputShell(activeOutput) : '<div class="error-text">Missing output payload.</div>',
        ].join('');
      }

      function renderInteractionsPanel(interactionsPayload) {
        const interactions = normalizeInteractions(interactionsPayload);
        if (interactions.length === 0) {
          return '<div class="empty-message">No interactions captured for this generation.</div>';
        }

        if (!interactions.some((entry) => entry.id === selectedInteractionId)) {
          selectedInteractionId = interactions[0]?.id || '';
        }

        const selected = interactions.find((entry) => entry.id === selectedInteractionId) || interactions[0];
        if (!selected) {
          return '<div class="empty-message">No interactions captured for this generation.</div>';
        }

        const grouped = interactions.reduce((acc, interaction) => {
          const key = interaction.stageId || 'unknown';
          if (!acc[key]) {
            acc[key] = [];
          }

          acc[key].push(interaction);
          return acc;
        }, {});

        const stageNames = Object.keys(grouped).sort((left, right) => {
          const leftIndex = stageOrder.indexOf(left);
          const rightIndex = stageOrder.indexOf(right);
          const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
          const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
          if (normalizedLeft !== normalizedRight) {
            return normalizedLeft - normalizedRight;
          }

          return left.localeCompare(right);
        });

        const stageMarkup = stageNames.map((stageName) => {
          const items = grouped[stageName] || [];
          const itemsMarkup = items.map((item, index) => {
            const itemClass = item.id === selected.id ? 'interaction-item-btn active' : 'interaction-item-btn';
            const label = item.operationId || (item.source + ' ' + (index + 1));
            const lineTwo = item.source === 'llm'
              ? ((item.requestType || 'text') + ' • ' + (item.status || 'unknown'))
              : ((item.provider || 'replicate') + ' • ' + (item.status || 'unknown'));
            return [
              '<li>',
              '<button type="button" class="' + itemClass + '" data-interaction-id="' + escapeHtml(item.id) + '">',
              '<span class="interaction-item-line primary">' + escapeHtml(label) + '</span>',
              '<span class="interaction-item-line">' + escapeHtml(lineTwo) + '</span>',
              '</button>',
              '</li>',
            ].join('');
          }).join('');

          return [
            '<section class="interaction-stage">',
            '<h3 class="interaction-stage-title">' + escapeHtml(stageName) + '</h3>',
            '<ul class="interaction-items">' + itemsMarkup + '</ul>',
            '</section>',
          ].join('');
        }).join('');

        const metadata = [
          '<dl class="interactions-kv">',
          '<dt>Stage</dt><dd>' + escapeHtml(selected.stageId) + '</dd>',
          '<dt>Operation</dt><dd>' + escapeHtml(selected.operationId || 'unknown') + '</dd>',
          '<dt>Source</dt><dd>' + escapeHtml(selected.source) + '</dd>',
          '<dt>Status</dt><dd>' + escapeHtml(selected.status || 'unknown') + '</dd>',
          '<dt>Model</dt><dd>' + escapeHtml(selected.modelId || 'unknown') + '</dd>',
          '<dt>Duration</dt><dd>' + escapeHtml(String(selected.durationMs || 0)) + ' ms</dd>',
          '</dl>',
        ].join('');

        const modeToggle = [
          '<div class="interactions-mode-toggle">',
          '<button type="button" class="' + (interactionViewMode === 'text' ? 'interactions-mode-btn active' : 'interactions-mode-btn') + '" data-interaction-mode="text">Prompt/Response</button>',
          '<button type="button" class="' + (interactionViewMode === 'json' ? 'interactions-mode-btn active' : 'interactions-mode-btn') + '" data-interaction-mode="json">Full JSON</button>',
          '</div>',
        ].join('');

        const detailBody = interactionViewMode === 'json'
          ? '<pre class="interaction-pre">' + escapeHtml(JSON.stringify(selected.raw, null, 2)) + '</pre>'
          : renderInteractionTextBlocks(selected);

        return [
          '<div class="interactions-layout">',
          '<div class="interactions-list">',
          stageMarkup,
          '</div>',
          '<div class="interactions-detail">',
          '<div class="interactions-detail-header">',
          '<h3 class="interactions-detail-title">Interaction Inspector</h3>',
          modeToggle,
          '</div>',
          '<div class="interactions-detail-body">',
          metadata,
          detailBody,
          '</div>',
          '</div>',
          '</div>',
        ].join('');
      }

      function renderInteractionTextBlocks(interaction) {
        const textSnapshot = extractInteractionTextSnapshot(interaction);

        const promptBlock = [
          '<section>',
          '<h4 class="interaction-block-title">Prompt / Request</h4>',
          '<pre class="interaction-pre">' + escapeHtml(textSnapshot.promptText || 'No prompt text found.') + '</pre>',
          '</section>',
        ].join('');

        const responseBlock = [
          '<section>',
          '<h4 class="interaction-block-title">Response</h4>',
          '<pre class="interaction-pre">' + escapeHtml(textSnapshot.responseText || 'No response text found.') + '</pre>',
          '</section>',
        ].join('');

        return promptBlock + responseBlock;
      }

      function normalizeInteractions(interactionsPayload) {
        const llmCalls = Array.isArray(interactionsPayload?.llmCalls) ? interactionsPayload.llmCalls : [];
        const t2iCalls = Array.isArray(interactionsPayload?.t2iCalls) ? interactionsPayload.t2iCalls : [];

        const normalizedLlm = llmCalls.map((call, index) => ({
          id: 'llm-' + index,
          source: 'llm',
          stageId: String(call.stageId || 'unknown'),
          operationId: String(call.operationId || ''),
          status: String(call.status || ''),
          requestType: String(call.requestType || ''),
          provider: String(call.provider || ''),
          modelId: String(call.modelId || ''),
          durationMs: Number(call.durationMs || 0),
          raw: call,
        }));

        const normalizedT2I = t2iCalls.map((call, index) => ({
          id: 't2i-' + index,
          source: 't2i',
          stageId: String(call.stageId || 'images'),
          operationId: String(call.operationId || ''),
          status: String(call.status || ''),
          requestType: 't2i',
          provider: String(call.provider || ''),
          modelId: String(call.modelId || ''),
          durationMs: Number(call.durationMs || 0),
          raw: call,
        }));

        return normalizedLlm.concat(normalizedT2I).sort((left, right) => {
          const leftTime = new Date(left.raw?.startedAt || 0).getTime();
          const rightTime = new Date(right.raw?.startedAt || 0).getTime();
          if (leftTime !== rightTime) {
            return leftTime - rightTime;
          }

          return left.id.localeCompare(right.id);
        });
      }

      function extractInteractionTextSnapshot(interaction) {
        if (interaction.source === 't2i') {
          return {
            promptText: String(interaction.raw?.prompt || ''),
            responseText: interaction.raw?.errorMessage
              ? ('Error: ' + String(interaction.raw.errorMessage))
              : 'Image request completed. Inspect Full JSON for resolved input payload.',
          };
        }

        const requestBody = parseJsonSafely(interaction.raw?.requestBody);
        const responseBody = parseJsonSafely(interaction.raw?.responseBody);
        const promptText = Array.isArray(requestBody?.messages)
          ? requestBody.messages
            .map((message) => '[' + String(message.role || 'unknown') + ']\\n' + String(message.content || ''))
            .join('\\n\\n---\\n\\n')
          : String(interaction.raw?.requestBody || '');
        const responseText = typeof responseBody?.choices?.[0]?.message?.content === 'string'
          ? responseBody.choices[0].message.content
          : (typeof responseBody?.error?.message === 'string'
              ? ('Error: ' + responseBody.error.message)
              : String(interaction.raw?.responseBody || interaction.raw?.errorMessage || ''));

        return {
          promptText,
          responseText,
        };
      }

      function parseJsonSafely(value) {
        if (typeof value !== 'string' || value.length === 0) {
          return null;
        }

        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }

      function renderOutputShell(output) {
        const channelClass = \`channel-shell channel-\${sanitizeClassName(output.contentType)}\`;
        return [
          \`<div class="\${channelClass}">\`,
          '<div class="channel-header">',
          '<div>',
          \`<div class="channel-title">\${escapeHtml(output.title || output.contentTypeLabel)}</div>\`,
          '<div class="slug-row">',
          \`<code class="slug-text">\${escapeHtml(output.slug)}</code>\`,
          \`<button class="copy-btn" data-copy-slug="\${escapeHtml(output.slug)}" type="button">Copy slug</button>\`,
          '</div>',
          \`<div class="channel-meta">\${escapeHtml(output.contentTypeLabel)} • Variant \${output.index}</div>\`,
          '</div>',
          '</div>',
          \`<div class="channel-body">\${output.htmlBody}</div>\`,
          '</div>',
        ].join('');
      }

      function groupOutputsByType(outputs) {
        return outputs.reduce((acc, output) => {
          const key = output.contentType || 'article';
          if (!acc[key]) {
            acc[key] = [];
          }

          acc[key].push(output);
          acc[key].sort((left, right) => (left.index || 1) - (right.index || 1));
          return acc;
        }, {});
      }

      function copySlug(btn, slug) {
        navigator.clipboard.writeText(slug).then(() => {
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          btn.disabled = true;
          setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1500);
        });
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      function sanitizeClassName(value) {
        return String(value || '')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      articleElement.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const typeButton = target.closest('[data-type-tab]');
        if (typeButton instanceof HTMLElement) {
          const nextType = typeButton.dataset.typeTab;
          if (nextType) {
            activeType = nextType;
            activeTopView = 'content';
            const grouped = currentGeneration ? groupOutputsByType(currentGeneration.outputs || []) : {};
            activeOutputId = grouped[activeType]?.[0]?.id || '';
            renderGeneration();
          }

          return;
        }

        const logsButton = target.closest('[data-logs-tab]');
        if (logsButton instanceof HTMLElement) {
          activeTopView = 'logs';
          renderGeneration();

          return;
        }

        const interactionButton = target.closest('[data-interaction-id]');
        if (interactionButton instanceof HTMLElement) {
          const nextInteractionId = interactionButton.dataset.interactionId;
          if (nextInteractionId) {
            selectedInteractionId = nextInteractionId;
            renderGeneration();
          }

          return;
        }

        const modeButton = target.closest('[data-interaction-mode]');
        if (modeButton instanceof HTMLElement) {
          const nextMode = modeButton.dataset.interactionMode;
          if (nextMode === 'text' || nextMode === 'json') {
            interactionViewMode = nextMode;
            renderGeneration();
          }

          return;
        }

        const outputButton = target.closest('[data-output-id]');
        if (outputButton instanceof HTMLElement) {
          const nextOutputId = outputButton.dataset.outputId;
          if (nextOutputId) {
            activeOutputId = nextOutputId;
            renderGeneration();
          }

          return;
        }

        const copyButton = target.closest('[data-copy-slug]');
        if (copyButton instanceof HTMLElement && copyButton.dataset.copySlug) {
          copySlug(copyButton, copyButton.dataset.copySlug);
        }
      });

      // Load articles and initial content
      initializeThemeControls();
      loadArticles();
      if (currentSlug) {
        loadArticle(currentSlug);
      }
    </script>
  </body>
</html>`;
}

async function tryOpenBrowser(url: string): Promise<void> {
  // Never launch a real browser while running unit tests.
  if (process.env.JEST_WORKER_ID) {
    return;
  }

  try {
    if (process.platform === 'darwin') {
      await execFileAsync('open', [url]);
      return;
    }

    if (process.platform === 'win32') {
      await execFileAsync('cmd', ['/c', 'start', '', url]);
      return;
    }

    await execFileAsync('xdg-open', [url]);
  } catch {
    // Browser auto-open is best-effort and should not block preview server startup.
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const __testInternals = {
  getArticleContent,
  getPreviewBootstrapData,
  resolveActivePreviewArticle,
  resolvePreviewClientBuildDir,
  isMissingFileError,
  renderArticleHtml,
  rewriteRelativeAssetUrls,
  toGenerationAssetUrl,
  resolveGenerationAssetPath,
  renderShell,
  tryOpenBrowser,
  escapeHtml,
};
