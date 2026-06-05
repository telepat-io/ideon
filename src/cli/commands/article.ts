import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveOutputPaths } from '../../output/filesystem.js';
import { stripFrontmatter } from '../../server/previewHelpers.js';
import type { MetaJson } from '../../types/meta.js';

interface ArticleEntry {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  contentType: string;
  publication?: string;
  series?: string;
  idea: string;
  generationDir: string;
  mtime: number;
  markdownBody: string;
}

export interface ArticleListOptions {
  search?: string;
  publication?: string;
  series?: string;
  contentType?: string;
  limit?: number;
  json: boolean;
  verbose: boolean;
}

export async function runArticleListCommand(
  options: ArticleListOptions,
  dependencies: { log?: (message: string) => void; cwd?: string } = {},
): Promise<void> {
  const log = dependencies.log ?? ((message: string) => console.log(message));
  const outputPaths = resolveOutputPaths();
  const limit = options.limit ?? 50;

  const entries = await scanArticleEntries(outputPaths.markdownOutputDir);

  let filtered = entries;

  if (options.publication) {
    filtered = filtered.filter((entry) => entry.publication === options.publication);
  }

  if (options.series) {
    filtered = filtered.filter((entry) => entry.series === options.series);
  }

  if (options.contentType) {
    filtered = filtered.filter((entry) => entry.contentType === options.contentType);
  }

  if (options.search) {
    filtered = applySearch(filtered, options.search);
  }

  filtered = filtered.slice(0, limit);

  if (options.json) {
    const output = filtered.map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      keywords: entry.keywords,
      contentType: entry.contentType,
      publication: entry.publication,
      series: entry.series,
      idea: entry.idea,
      generationDir: entry.generationDir,
      mtime: new Date(entry.mtime).toISOString(),
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (filtered.length === 0) {
    log('No articles found. Generate one with `ideon write <idea>`.');
    return;
  }

  if (options.verbose) {
    for (const entry of filtered) {
      log(`\n  ${entry.slug}`);
      log(`    Title: ${entry.title}`);
      if (entry.description) log(`    Description: ${entry.description.slice(0, 120)}${entry.description.length > 120 ? '...' : ''}`);
      if (entry.keywords.length > 0) log(`    Keywords: ${entry.keywords.join(', ')}`);
      if (entry.contentType !== 'article') log(`    Type: ${entry.contentType}`);
      if (entry.publication) log(`    Publication: ${entry.publication}`);
      if (entry.series) log(`    Series: ${entry.series}`);
      if (entry.idea) log(`    Idea: ${entry.idea.slice(0, 100)}${entry.idea.length > 100 ? '...' : ''}`);
      log(`    Generated: ${new Date(entry.mtime).toISOString()}`);
    }
    return;
  }

  const slugWidth = Math.max(6, ...filtered.map((e) => e.slug.length));
  const titleWidth = Math.max(6, ...filtered.map((e) => truncate(e.title, 40).length));
  const typeWidth = Math.max(6, ...filtered.map((e) => e.contentType.length));
  const pubWidth = Math.max(6, ...filtered.map((e) => (e.publication ?? '-').length));
  const seriesWidth = Math.max(6, ...filtered.map((e) => (e.series ?? '-').length));

  log(
    '  ' +
    'Slug'.padEnd(slugWidth) + '  ' +
    'Title'.padEnd(titleWidth) + '  ' +
    'Type'.padEnd(typeWidth) + '  ' +
    'Publication'.padEnd(pubWidth) + '  ' +
    'Series'.padEnd(seriesWidth) + '  ' +
    'Generated',
  );

  log('  ' + '-'.repeat(slugWidth + titleWidth + typeWidth + pubWidth + seriesWidth + 32));

  for (const entry of filtered) {
    const title = truncate(entry.title, 40);
    const pub = entry.publication ?? '-';
    const series = entry.series ?? '-';
    const date = formatDate(entry.mtime);
    log(
      '  ' +
      entry.slug.padEnd(slugWidth) + '  ' +
      title.padEnd(titleWidth) + '  ' +
      entry.contentType.padEnd(typeWidth) + '  ' +
      pub.padEnd(pubWidth) + '  ' +
      series.padEnd(seriesWidth) + '  ' +
      date,
    );
  }
}

function applySearch(entries: ArticleEntry[], query: string): ArticleEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return entries;
  }

  const exactMatches = entries.filter((entry) => matchesPhrase(entry, normalizedQuery));
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  const words = normalizedQuery.split(/\s+/).filter((w) => w.length > 0);
  return entries.filter((entry) => matchesAllWords(entry, words));
}

function matchesPhrase(entry: ArticleEntry, phrase: string): boolean {
  return entry.title.toLowerCase().includes(phrase)
    || entry.slug.toLowerCase().includes(phrase)
    || entry.description.toLowerCase().includes(phrase)
    || entry.keywords.some((kw) => kw.toLowerCase().includes(phrase))
    || entry.markdownBody.toLowerCase().includes(phrase);
}

function matchesAllWords(entry: ArticleEntry, words: string[]): boolean {
  const haystack = [
    entry.title,
    entry.slug,
    entry.description,
    ...entry.keywords,
    entry.markdownBody,
  ].join(' ').toLowerCase();

  return words.every((word) => haystack.includes(word));
}

async function scanArticleEntries(markdownOutputDir: string): Promise<ArticleEntry[]> {
  const generationDirs = await listGenerationDirectories(markdownOutputDir);
  const entries: ArticleEntry[] = [];

  for (const dir of generationDirs) {
    try {
      const entry = await readGenerationEntry(dir);
      if (entry) {
        entries.push(entry);
      }
    } catch {
      // Skip directories that fail to parse
    }
  }

  entries.sort((a, b) => b.mtime - a.mtime);
  return entries;
}

async function listGenerationDirectories(rootDir: string): Promise<string[]> {
  let dirEntries;
  try {
    dirEntries = await readdir(rootDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs: Array<{ path: string; mtime: number }> = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = path.join(rootDir, entry.name);
    try {
      const dirStat = await stat(fullPath);
      dirs.push({ path: fullPath, mtime: dirStat.mtimeMs });
    } catch {
      continue;
    }
  }

  dirs.sort((a, b) => b.mtime - a.mtime);
  return dirs.map((d) => d.path);
}

async function readGenerationEntry(generationDir: string): Promise<ArticleEntry | null> {
  const metaJsonPath = path.join(generationDir, 'meta.json');
  const meta = await tryReadMetaJson(metaJsonPath);

  const primaryMarkdown = await findPrimaryMarkdown(generationDir);
  if (!primaryMarkdown) {
    return null;
  }

  const markdown = await readFile(primaryMarkdown, 'utf8');
  const fileStat = await stat(primaryMarkdown);
  const slug = extractFrontmatterSlug(markdown) ?? path.basename(primaryMarkdown, '.md');

  const body = stripFrontmatter(markdown);
  const headingMatch = body.match(/^#\s+(.+)$/m);
  const title = headingMatch?.[1]?.trim() ?? meta?.title ?? slug;
  const description = meta?.description ?? '';
  const keywords = meta?.keywords ?? [];
  const contentType = meta?.contentType ?? 'article';
  const publication = meta?.publication;
  const series = meta?.series;
  const idea = meta?.idea ?? '';

  return {
    slug,
    title,
    description,
    keywords,
    contentType,
    publication,
    series,
    idea,
    generationDir,
    mtime: fileStat.mtimeMs,
    markdownBody: body,
  };
}

async function tryReadMetaJson(metaJsonPath: string): Promise<MetaJson | null> {
  try {
    const raw = await readFile(metaJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
      return parsed as MetaJson;
    }
    return null;
  } catch {
    return null;
  }
}

async function findPrimaryMarkdown(generationDir: string): Promise<string | null> {
  let entries;
  try {
    entries = await readdir(generationDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  // Prefer article-1.md as primary
  const articleFile = mdFiles.find((name) => /^article-\d+\.md$/.test(name));
  if (articleFile) {
    return path.join(generationDir, articleFile);
  }

  // Fallback to first .md file
  return mdFiles.length > 0 ? path.join(generationDir, mdFiles[0]!) : null;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

function formatDate(mtimeMs: number): string {
  const d = new Date(mtimeMs);
  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractFrontmatterSlug(markdown: string): string | null {
  const frontmatterMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const block = frontmatterMatch?.[1];
  if (!block) {
    return null;
  }

  const slugMatch = block.match(/^slug:\s*(.+)$/m);
  const rawSlug = slugMatch?.[1]?.trim();
  if (!rawSlug) {
    return null;
  }

  const unquoted = rawSlug.replace(/^['"']|['"']$/g, '').trim();
  return unquoted.length > 0 ? unquoted : null;
}
