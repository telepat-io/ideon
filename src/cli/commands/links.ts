import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveRunInput } from '../../config/resolver.js';
import { enrichLinks, type LinkEnrichmentProgressEvent } from '../../generation/enrichLinks.js';
import { OpenRouterClient } from '../../llm/openRouterClient.js';
import { listMarkdownFilesRecursively, resolveLinksPath, resolveOutputPaths, writeLinksFile } from '../../output/filesystem.js';
import type { AppSettings } from '../../config/schema.js';
import type { LinkEntry } from '../../types/article.js';
import { ReportedError } from '../reportedError.js';

interface LinksCommandOptions {
  slug: string;
  mode: string;
}

type LinksMergeMode = 'fresh' | 'append';

interface LinksCommandDependencies {
  log: (message: string) => void;
  cwd: string;
}

interface ParsedFrontmatter {
  slug: string | null;
  title: string | null;
  description: string | null;
}

interface LinksSidecar {
  version: number;
  links: LinkEntry[];
}

export async function runLinksCommand(
  options: LinksCommandOptions,
  dependencies: Partial<LinksCommandDependencies> = {},
): Promise<void> {
  const slug = normalizeSlug(options.slug);
  const mode = normalizeMode(options.mode);
  const cwd = dependencies.cwd ?? process.cwd();
  const log = dependencies.log ?? ((message: string) => console.log(message));

  const resolved = await resolveRunInput({
    idea: `Enrich links for ${slug}`,
  });

  const markdownPath = await resolveMarkdownPathForSlug(resolved.config.settings, slug, cwd);
  const frontmatter = await readFrontmatter(markdownPath);
  const fileId = path.parse(markdownPath).name;
  const articleTitle = frontmatter.title ?? toTitleFromSlug(slug);
  const articleDescription = frontmatter.description ?? '';
  const openRouterApiKey = resolved.config.secrets.openRouterApiKey;

  if (!openRouterApiKey) {
    throw new ReportedError(
      'Missing OpenRouter API key. Run `ideon settings` to configure credentials or set IDEON_OPENROUTER_API_KEY.',
    );
  }

  const openRouter = new OpenRouterClient(openRouterApiKey);
  const linksResult = await enrichLinks({
    markdownFiles: [{ markdownPath, fileId, contentType: 'article' }],
    articleTitle,
    articleDescription,
    openRouter,
    settings: resolved.config.settings,
    dryRun: false,
    onItemProgress(event) {
      logProgress(event, log);
    },
  });

  const generatedLinks = linksResult[0]?.links ?? [];
  const linksPath = resolveLinksPath(markdownPath);
  const existing = await readExistingLinks(linksPath);
  const mergedLinks = mode === 'append' ? mergeLinks(existing?.links ?? [], generatedLinks) : generatedLinks;
  const appendedCount = Math.max(0, mergedLinks.length - (existing?.links.length ?? 0));

  await writeLinksFile(markdownPath, {
    version: 1,
    links: mergedLinks,
  } satisfies LinksSidecar);

  const relativeMarkdownPath = formatRelativePath(cwd, markdownPath);
  const relativeLinksPath = formatRelativePath(cwd, linksPath);

  if (mode === 'fresh') {
    const replaced = existing ? 'Replaced existing links.' : 'Created links sidecar.';
    log(`Enriched links for "${slug}".`);
    log(`${replaced} Saved ${generatedLinks.length} links to ${relativeLinksPath} (${relativeMarkdownPath}).`);
    return;
  }

  const baseCount = existing?.links.length ?? 0;
  const verb = existing ? 'Appended and deduplicated links.' : 'Created links sidecar.';
  log(`Enriched links for "${slug}".`);
  log(`${verb} Base ${baseCount}, added ${appendedCount}, total ${mergedLinks.length} in ${relativeLinksPath} (${relativeMarkdownPath}).`);
}

function normalizeMode(rawMode: string): LinksMergeMode {
  const normalized = rawMode.trim().toLowerCase();
  if (normalized === 'fresh' || normalized === 'append') {
    return normalized;
  }

  throw new ReportedError(`Unsupported --mode value "${rawMode}". Use "fresh" or "append".`);
}

function normalizeSlug(rawSlug: string): string {
  const slug = rawSlug.trim();

  if (!slug) {
    throw new ReportedError('Slug cannot be empty. Pass the generated article slug, for example `ideon links my-article-slug`.');
  }

  if (slug.toLowerCase().endsWith('.md')) {
    throw new ReportedError(`Expected a slug, not a markdown filename: ${slug}. Pass the slug without .md.`);
  }

  if (slug === '.' || slug === '..' || /[/\\]/.test(slug)) {
    throw new ReportedError(`Invalid slug "${slug}". Pass the article slug only, without any path separators.`);
  }

  return slug;
}

async function resolveMarkdownPathForSlug(settings: AppSettings, slug: string, cwd: string): Promise<string> {
  const outputPaths = resolveOutputPaths(settings, cwd);
  const directPath = path.join(outputPaths.markdownOutputDir, `${slug}.md`);
  if (await isReadableFile(directPath)) {
    return directPath;
  }

  const markdownFiles = await listMarkdownFilesRecursively(outputPaths.markdownOutputDir);
  const matches: string[] = [];

  for (const candidate of markdownFiles) {
    if (path.basename(candidate) === `${slug}.md`) {
      matches.push(candidate);
      continue;
    }

    const frontmatter = await readFrontmatter(candidate);
    if (frontmatter.slug === slug) {
      matches.push(candidate);
    }
  }

  if (matches.length === 0) {
    throw new ReportedError(
      `Could not find article "${slug}". Expected a markdown file in ${outputPaths.markdownOutputDir} with frontmatter slug "${slug}".`,
    );
  }

  return newestPath(matches);
}

async function newestPath(paths: string[]): Promise<string> {
  let latestPath = paths[0] as string;
  let latestMtime = 0;

  for (const candidate of paths) {
    const candidateStat = await stat(candidate);
    if (candidateStat.mtimeMs >= latestMtime) {
      latestMtime = candidateStat.mtimeMs;
      latestPath = candidate;
    }
  }

  return latestPath;
}

async function readFrontmatter(markdownPath: string): Promise<ParsedFrontmatter> {
  const markdown = await readFile(markdownPath, 'utf8');
  return parseFrontmatter(markdown);
}

function parseFrontmatter(markdown: string): ParsedFrontmatter {
  if (!markdown.startsWith('---\n')) {
    return { slug: null, title: null, description: null };
  }

  const frontmatterEnd = markdown.indexOf('\n---\n', 4);
  if (frontmatterEnd < 0) {
    return { slug: null, title: null, description: null };
  }

  const block = markdown.slice(4, frontmatterEnd);
  return {
    slug: parseFrontmatterValue(block, 'slug'),
    title: parseFrontmatterValue(block, 'title'),
    description: parseFrontmatterValue(block, 'description'),
  };
}

function parseFrontmatterValue(block: string, key: 'slug' | 'title' | 'description'): string | null {
  const pattern = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const match = block.match(pattern);
  if (!match || !match[1]) {
    return null;
  }

  const rawValue = match[1].trim();
  if (!rawValue) {
    return null;
  }

  if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function toTitleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

async function isReadableFile(filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function readExistingLinks(linksPath: string): Promise<LinksSidecar | null> {
  try {
    const raw = await readFile(linksPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: unknown; links?: unknown };
    const links = Array.isArray(parsed.links)
      ? parsed.links
        .filter((entry): entry is LinkEntry => isValidLinkEntry(entry))
        .map((entry) => ({
          expression: entry.expression.trim(),
          url: entry.url.trim(),
          title: typeof entry.title === 'string' ? entry.title : null,
        }))
      : null;

    if (!links) {
      throw new ReportedError(`Invalid links sidecar format at ${linksPath}. Expected { version, links[] }.`);
    }

    return {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      links,
    };
  } catch (error) {
    if (readErrorCode(error) === 'ENOENT') {
      return null;
    }

    if (error instanceof ReportedError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown links sidecar read error.';
    throw new ReportedError(`Failed to read existing links from ${linksPath}: ${message}`);
  }
}

function mergeLinks(existingLinks: LinkEntry[], generatedLinks: LinkEntry[]): LinkEntry[] {
  const merged: LinkEntry[] = [];
  const seen = new Set<string>();

  for (const entry of [...existingLinks, ...generatedLinks]) {
    const key = `${entry.expression.trim().toLowerCase()}::${entry.url.trim().toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(entry);
  }

  return merged;
}

function isValidLinkEntry(value: unknown): value is LinkEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as { expression?: unknown; url?: unknown; title?: unknown };
  return typeof record.expression === 'string'
    && typeof record.url === 'string'
    && (typeof record.title === 'string' || record.title === null || record.title === undefined);
}

function readErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function formatRelativePath(cwd: string, targetPath: string): string {
  const relativePath = path.relative(cwd, targetPath);
  return relativePath.length > 0 ? relativePath : targetPath;
}

function logProgress(event: LinkEnrichmentProgressEvent, log: (message: string) => void): void {
  if (event.phase === 'resolving-expression' || event.phase === 'selecting-expressions') {
    return;
  }

  log(event.detail);
}
