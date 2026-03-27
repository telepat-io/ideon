import { readdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_PORT = 4173;

export interface ArticleMetadata {
  slug: string;
  title: string;
  mtime: number;
  previewSnippet: string;
  coverImageUrl: string | null;
}

export function parsePort(portOption: string | undefined): number {
  if (!portOption) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(portOption, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port \"${portOption}\". Choose a value between 1 and 65535.`);
  }

  return port;
}

export function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
}

export function extractHeadingTitle(markdown: string): string | null {
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (!headingMatch || !headingMatch[1]) {
    return null;
  }

  return headingMatch[1].trim();
}

export async function resolveMarkdownPath(
  markdownPathArg: string | undefined,
  markdownOutputDir: string,
  cwd: string,
): Promise<string> {
  if (markdownPathArg) {
    const resolved = path.isAbsolute(markdownPathArg) ? markdownPathArg : path.resolve(cwd, markdownPathArg);

    if (path.extname(resolved).toLowerCase() !== '.md') {
      throw new Error(`Expected a markdown file (.md), received: ${resolved}`);
    }

    await assertFileExists(resolved, 'Could not find markdown file');
    return resolved;
  }

  return await resolveLatestMarkdown(markdownOutputDir);
}

export async function resolveLatestMarkdown(markdownOutputDir: string): Promise<string> {
  const entries = await readdir(markdownOutputDir, { withFileTypes: true });
  const markdownCandidates = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => path.join(markdownOutputDir, entry.name));

  if (markdownCandidates.length === 0) {
    throw new Error(
      `No generated articles found in ${markdownOutputDir}. Run ideon write \"your idea\" first or pass a markdown path.`,
    );
  }

  let latestPath = markdownCandidates[0] as string;
  let latestMtime = 0;

  for (const candidate of markdownCandidates) {
    const fileStat = await stat(candidate);
    if (fileStat.mtimeMs >= latestMtime) {
      latestMtime = fileStat.mtimeMs;
      latestPath = candidate;
    }
  }

  return latestPath;
}

async function assertFileExists(filePath: string, errorPrefix: string): Promise<void> {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error(`${errorPrefix}: ${filePath}`);
    }
  } catch {
    throw new Error(`${errorPrefix}: ${filePath}`);
  }
}

export function extractCoverImageUrl(markdown: string): string | null {
  const body = stripFrontmatter(markdown);
  const match = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match?.[1] ?? null;
}

export async function extractArticleMetadata(markdownPath: string): Promise<ArticleMetadata> {
  const markdown = await readFile(markdownPath, 'utf8');
  const fileStat = await stat(markdownPath);
  const slug = path.basename(markdownPath, '.md');
  const title = extractHeadingTitle(stripFrontmatter(markdown)) ?? slug;
  const body = stripFrontmatter(markdown);
  const previewSnippet = body.replace(/[#\[\]()!\-*_`]/g, '').trim().substring(0, 150);
  const coverImageUrl = extractCoverImageUrl(markdown);

  return {
    slug,
    title,
    mtime: fileStat.mtimeMs,
    previewSnippet,
    coverImageUrl,
  };
}

export async function listAllArticles(markdownOutputDir: string): Promise<ArticleMetadata[]> {
  const entries = await readdir(markdownOutputDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => path.join(markdownOutputDir, entry.name));

  const articles: ArticleMetadata[] = [];

  for (const filePath of markdownFiles) {
    try {
      const metadata = await extractArticleMetadata(filePath);
      articles.push(metadata);
    } catch {
      // Skip files that fail to parse
    }
  }

  // Sort by mtime descending (newest first)
  articles.sort((a, b) => b.mtime - a.mtime);

  return articles;
}
