import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveRunInput } from '../../config/resolver.js';
import { enrichMarkdownWithLinks } from '../../output/enrichMarkdownWithLinks.js';
import { resolveLinksPath, resolveOutputPaths } from '../../output/filesystem.js';
import { listAllGenerations } from '../../server/previewHelpers.js';
import type { LinkEntry } from '../../types/article.js';
import { ReportedError } from '../reportedError.js';

export interface OutputCommandOptions {
  generationId: string;
  destinationPath: string;
  index?: number;
  overwrite?: boolean;
}

interface OutputCommandDependencies {
  log: (message: string) => void;
  cwd: string;
}

export async function runOutputCommand(
  options: OutputCommandOptions,
  dependencies: Partial<OutputCommandDependencies> = {},
): Promise<void> {
  const cwd = dependencies.cwd ?? process.cwd();
  const log = dependencies.log ?? ((message: string) => console.log(message));
  const targetIndex = options.index ?? 1;

  const resolved = await resolveRunInput({ idea: `Export generation ${options.generationId}` });
  const outputPaths = resolveOutputPaths();

  // --- Resolve generation ---
  const generations = await listAllGenerations(outputPaths.markdownOutputDir);
  const generation = resolveGeneration(generations, options.generationId);

  // --- Select primary article output by index ---
  const articleOutputs = generation.outputs.filter((output) => output.contentType === generation.primaryContentType);
  if (articleOutputs.length === 0) {
    throw new ReportedError(
      `Generation "${generation.id}" has no primary content outputs (type: ${generation.primaryContentType}).`,
    );
  }

  const articleOutput = articleOutputs.find((output) => output.index === targetIndex);
  if (!articleOutput) {
    const available = articleOutputs.map((output) => output.index).join(', ');
    throw new ReportedError(
      `Generation "${generation.id}" has no primary output at index ${targetIndex}. Available: ${available}.`,
    );
  }

  // --- Read source markdown ---
  const sourceMarkdownPath = articleOutput.sourcePath;
  const sourceMarkdown = await readFile(sourceMarkdownPath, 'utf8');

  // --- Derive slug for the export filename ---
  const slug = extractFrontmatterSlug(sourceMarkdown) ?? path.basename(sourceMarkdownPath, '.md');
  const exportFilename = `${slug}.md`;

  // --- Resolve destination file path ---
  const destinationDir = await resolveDestinationDir(options.destinationPath, cwd);
  const destinationFilePath = path.join(destinationDir, exportFilename);

  // --- Overwrite guard ---
  if (!options.overwrite && await fileExists(destinationFilePath)) {
    throw new ReportedError(
      `Export file already exists: ${destinationFilePath}. Pass --overwrite to replace it.`,
    );
  }

  await mkdir(destinationDir, { recursive: true });

  // --- Build enriched markdown ---
  const links = await loadLinks(sourceMarkdownPath);
  const enrichedMarkdown = enrichWithFrontmatterGuard(sourceMarkdown, links);

  // --- Collect and copy referenced local images ---
  const sourceDir = path.dirname(sourceMarkdownPath);
  const imagePaths = extractLocalImagePaths(sourceMarkdown);
  const copiedImages: string[] = [];

  for (const relImagePath of imagePaths) {
    const absoluteImageSrc = path.resolve(sourceDir, relImagePath);

    let imageStat: Awaited<ReturnType<typeof stat>> | null = null;
    try {
      imageStat = await stat(absoluteImageSrc);
    } catch {
      throw new ReportedError(
        `Referenced image not found: ${relImagePath} (resolved to ${absoluteImageSrc}).`,
      );
    }

    if (!imageStat.isFile()) {
      throw new ReportedError(`Referenced image path is not a file: ${absoluteImageSrc}.`);
    }

    const destImagePath = path.join(destinationDir, relImagePath);
    await mkdir(path.dirname(destImagePath), { recursive: true });
    await copyFile(absoluteImageSrc, destImagePath);
    copiedImages.push(relImagePath);
  }

  // --- Copy meta.json sidecar ---
  let copiedMetaJson = false;
  const metaJsonSrc = path.join(sourceDir, 'meta.json');
  const metaJsonDest = path.join(destinationDir, 'meta.json');
  if (await fileExists(metaJsonSrc)) {
    await copyFile(metaJsonSrc, metaJsonDest);
    copiedMetaJson = true;
  }

  // --- Write exported markdown ---
  await writeFile(destinationFilePath, enrichedMarkdown, 'utf8');

  const relDest = path.relative(cwd, destinationFilePath);
  log(`Exported "${generation.id}" (${generation.primaryContentType} #${targetIndex}) → ${relDest}`);
  if (copiedImages.length > 0) {
    log(`Copied ${copiedImages.length} image${copiedImages.length === 1 ? '' : 's'}: ${copiedImages.join(', ')}`);
  }
  if (copiedMetaJson) {
    log('Copied meta.json sidecar.');
  }
  if (links.length > 0) {
    log(`Injected ${links.length} inline link${links.length === 1 ? '' : 's'}.`);
  }
}

// ---------------------------------------------------------------------------
// Generation resolution
// ---------------------------------------------------------------------------

function resolveGeneration(
  generations: Awaited<ReturnType<typeof listAllGenerations>>,
  generationId: string,
): Awaited<ReturnType<typeof listAllGenerations>>[number] {
  // Exact generation id match first
  const exact = generations.find((g) => g.id === generationId);
  if (exact) {
    return exact;
  }

  // Fallback: match by any output's frontmatter slug or the generation id suffix
  const bySlug = generations.find((g) =>
    g.outputs.some((output) => output.slug === generationId),
  );
  if (bySlug) {
    return bySlug;
  }

  throw new ReportedError(
    `Generation "${generationId}" not found. Run \`ideon preview\` to list available generations.`,
  );
}

// ---------------------------------------------------------------------------
// Destination path helpers
// ---------------------------------------------------------------------------

async function resolveDestinationDir(destinationPath: string, cwd: string): Promise<string> {
  const resolved = path.isAbsolute(destinationPath) ? destinationPath : path.resolve(cwd, destinationPath);
  // Always treat the argument as a directory regardless of whether it exists.
  return resolved;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Link loading
// ---------------------------------------------------------------------------

async function loadLinks(markdownPath: string): Promise<LinkEntry[]> {
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
  const combined = [...customLinks, ...links];

  return combined
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
    }))
    .filter((entry) => entry.expression.length > 0 && entry.url.length > 0);
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

function enrichWithFrontmatterGuard(markdown: string, links: LinkEntry[]): string {
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

  const unquoted = rawSlug.replace(/^['""]|['""]$/g, '').trim();
  return unquoted.length > 0 ? unquoted : null;
}

/**
 * Extracts all local (non-URL) image paths from Markdown image references.
 * Returns relative paths as they appear in the source markdown.
 */
export function extractLocalImagePaths(markdown: string): string[] {
  const imagePattern = /!\[[^\]]*\]\(([^)]+)\)/g;
  const paths: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = imagePattern.exec(markdown)) !== null) {
    const rawPath = match[1]?.trim();
    if (!rawPath) {
      continue;
    }

    // Skip URLs and anchors
    if (
      rawPath.startsWith('http://')
      || rawPath.startsWith('https://')
      || rawPath.startsWith('data:')
      || rawPath.startsWith('/')
      || rawPath.startsWith('#')
    ) {
      continue;
    }

    paths.push(rawPath);
  }

  return paths;
}
