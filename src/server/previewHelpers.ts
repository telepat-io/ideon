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

export interface GenerationOutputMetadata {
  id: string;
  generationId: string;
  sourcePath: string;
  slug: string;
  title: string;
  previewSnippet: string;
  coverImageUrl: string | null;
  mtime: number;
  contentType: string;
  contentTypeLabel: string;
  index: number;
}

export interface GenerationMetadata {
  id: string;
  title: string;
  mtime: number;
  previewSnippet: string;
  coverImageUrl: string | null;
  primaryContentType: string;
  outputs: GenerationOutputMetadata[];
}

const CONTENT_TYPE_ORDER = ['article', 'blog-post', 'x-thread', 'x-post', 'linkedin-post', 'reddit-post', 'newsletter'];

const FILE_PREFIX_TO_CONTENT_TYPE: Record<string, string> = {
  article: 'article',
  blog: 'blog-post',
  'x-thread': 'x-thread',
  'x-post': 'x-post',
  x: 'x-post',
  reddit: 'reddit-post',
  linkedin: 'linkedin-post',
  newsletter: 'newsletter',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  article: 'Article',
  'blog-post': 'Blog Post',
  'x-thread': 'X Thread',
  'x-post': 'X Post',
  'reddit-post': 'Reddit Post',
  'linkedin-post': 'LinkedIn Post',
  newsletter: 'Newsletter',
};

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

function extractFrontmatterSlug(markdown: string): string | null {
  const frontmatterMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const frontmatter = frontmatterMatch?.[1];
  if (!frontmatter) {
    return null;
  }

  const slugMatch = frontmatter.match(/^slug:\s*(.+)$/m);
  const rawSlug = slugMatch?.[1]?.trim();
  if (!rawSlug) {
    return null;
  }

  const unquoted = rawSlug.replace(/^['\"]|['\"]$/g, '').trim();
  return unquoted.length > 0 ? unquoted : null;
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
  const markdownCandidates = await findMarkdownFiles(markdownOutputDir);

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
  const slug = extractFrontmatterSlug(markdown) ?? path.basename(markdownPath, '.md');
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
  const markdownFiles = await findMarkdownFiles(markdownOutputDir);

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

export async function listAllGenerations(markdownOutputDir: string): Promise<GenerationMetadata[]> {
  const markdownFiles = await findMarkdownFiles(markdownOutputDir);
  const grouped = new Map<string, GenerationOutputMetadata[]>();

  for (const filePath of markdownFiles) {
    try {
      const metadata = await extractArticleMetadata(filePath);
      const identity = deriveOutputIdentity(filePath, markdownOutputDir);
      const output: GenerationOutputMetadata = {
        id: `${identity.generationId}:${identity.contentType}:${identity.index}`,
        generationId: identity.generationId,
        sourcePath: filePath,
        slug: metadata.slug,
        title: metadata.title,
        previewSnippet: metadata.previewSnippet,
        coverImageUrl: metadata.coverImageUrl,
        mtime: metadata.mtime,
        contentType: identity.contentType,
        contentTypeLabel: toContentTypeLabel(identity.contentType),
        index: identity.index,
      };

      const existing = grouped.get(identity.generationId);
      if (existing) {
        existing.push(output);
      } else {
        grouped.set(identity.generationId, [output]);
      }
    } catch {
      // Skip files that fail to parse
    }
  }

  const generations: GenerationMetadata[] = [];
  for (const [id, outputs] of grouped.entries()) {
    outputs.sort((a, b) => compareContentTypes(a.contentType, b.contentType) || a.index - b.index || b.mtime - a.mtime);
    const primaryContentType = await resolvePrimaryContentType(outputs);
    const primary = outputs.find((output) => output.contentType === primaryContentType) ?? outputs[0];
    if (!primary) {
      continue;
    }

    const newestMtime = outputs.reduce((latest, output) => Math.max(latest, output.mtime), 0);
    generations.push({
      id,
      title: primary.title,
      mtime: newestMtime,
      previewSnippet: primary.previewSnippet,
      coverImageUrl: primary.coverImageUrl ?? outputs.find((output) => Boolean(output.coverImageUrl))?.coverImageUrl ?? null,
      primaryContentType,
      outputs,
    });
  }

  generations.sort((a, b) => b.mtime - a.mtime);
  return generations;
}

export function deriveGenerationId(markdownPath: string, markdownOutputDir: string): string {
  const relative = path.relative(markdownOutputDir, markdownPath);
  const normalized = relative.split(path.sep).join('/');
  if (!normalized || normalized.startsWith('../')) {
    return path.basename(markdownPath, '.md');
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return path.basename(markdownPath, '.md');
  }

  return segments[0] ?? path.basename(markdownPath, '.md');
}

async function findMarkdownFiles(markdownOutputDir: string): Promise<string[]> {
  const files: string[] = [];
  const stack = [markdownOutputDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function deriveOutputIdentity(markdownPath: string, markdownOutputDir: string): {
  generationId: string;
  contentType: string;
  index: number;
} {
  const generationId = deriveGenerationId(markdownPath, markdownOutputDir);
  const fileBase = path.basename(markdownPath, '.md');
  const parsed = fileBase.match(/^([a-z0-9-]+)-(\d+)$/i);

  if (!parsed || !parsed[1] || !parsed[2]) {
    return {
      generationId,
      contentType: 'article',
      index: 1,
    };
  }

  const prefix = parsed[1].toLowerCase();
  const index = Number.parseInt(parsed[2], 10);
  return {
    generationId,
    contentType: FILE_PREFIX_TO_CONTENT_TYPE[prefix] ?? prefix,
    index: Number.isFinite(index) && index > 0 ? index : 1,
  };
}

function compareContentTypes(left: string, right: string): number {
  const leftIndex = CONTENT_TYPE_ORDER.indexOf(left);
  const rightIndex = CONTENT_TYPE_ORDER.indexOf(right);
  const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
  if (normalizedLeft !== normalizedRight) {
    return normalizedLeft - normalizedRight;
  }

  return left.localeCompare(right);
}

function toContentTypeLabel(contentType: string): string {
  const knownLabel = CONTENT_TYPE_LABELS[contentType];
  if (knownLabel) {
    return knownLabel;
  }

  return contentType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function resolvePrimaryContentType(outputs: GenerationOutputMetadata[]): Promise<string> {
  const fallback = outputs.find((output) => output.contentType === 'article')?.contentType
    ?? outputs[0]?.contentType
    ?? 'article';
  const generationDir = path.dirname(outputs[0]?.sourcePath ?? '');
  if (!generationDir) {
    return fallback;
  }

  const jobPath = path.join(generationDir, 'job.json');
  try {
    const raw = await readFile(jobPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      contentTargets?: Array<{ contentType?: unknown; role?: unknown }>;
      settings?: { contentTargets?: Array<{ contentType?: unknown; role?: unknown }> };
    };
    const targets = Array.isArray(parsed.contentTargets)
      ? parsed.contentTargets
      : (Array.isArray(parsed.settings?.contentTargets) ? parsed.settings.contentTargets : []);
    const primary = targets.find((target) => target?.role === 'primary' && typeof target.contentType === 'string');
    if (primary && typeof primary.contentType === 'string') {
      return primary.contentType;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
