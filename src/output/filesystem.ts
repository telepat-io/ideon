import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppSettings, ResolvedPaths } from '../config/schema.js';

export function resolveOutputPaths(settings: AppSettings, cwd: string = process.cwd()): ResolvedPaths {
  return {
    markdownOutputDir: resolveConfiguredDir(settings.markdownOutputDir, cwd),
    assetOutputDir: resolveConfiguredDir(settings.assetOutputDir, cwd),
  };
}

export async function ensureOutputDirectories(paths: ResolvedPaths): Promise<void> {
  await Promise.all([
    mkdir(paths.markdownOutputDir, { recursive: true }),
    mkdir(paths.assetOutputDir, { recursive: true }),
  ]);
}

export async function resolveUniqueSlug(markdownOutputDir: string, baseSlug: string): Promise<string> {
  let attempt = 0;
  let candidate = baseSlug;

  while (await fileExists(path.join(markdownOutputDir, `${candidate}.md`))) {
    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
  }

  return candidate;
}

export function buildGenerationDirectoryName(baseSlug: string, now: Date = new Date()): string {
  const pad = (value: number): string => value.toString().padStart(2, '0');
  const stamp = [
    now.getUTCFullYear().toString(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '-',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join('');

  return `${stamp}-${baseSlug}`;
}

export async function listMarkdownFilesRecursively(rootDir: string): Promise<string[]> {
  return listFilesRecursively(rootDir, (fileName) => fileName.toLowerCase().endsWith('.md'));
}

async function listFilesRecursively(rootDir: string, predicate: (fileName: string) => boolean): Promise<string[]> {
  const fs = await import('node:fs/promises');
  const results: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && predicate(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

export async function writeUtf8File(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await writeUtf8File(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function resolveLinksPath(markdownPath: string): string {
  const parsed = path.parse(markdownPath);
  return path.join(parsed.dir, `${parsed.name}.links.json`);
}

export async function writeLinksFile(markdownPath: string, links: unknown): Promise<void> {
  await writeJsonFile(resolveLinksPath(markdownPath), links);
}

export function resolveAnalyticsPath(markdownPath: string): string {
  const parsed = path.parse(markdownPath);
  return path.join(parsed.dir, `${parsed.name}.analytics.json`);
}

export function relativeAssetPath(markdownPath: string, assetPath: string): string {
  return path.relative(path.dirname(markdownPath), assetPath).split(path.sep).join('/');
}

function resolveConfiguredDir(configuredPath: string, cwd: string): string {
  if (configuredPath === '/output' || configuredPath.startsWith('/output/')) {
    return path.join(cwd, configuredPath.slice(1));
  }

  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(cwd, configuredPath);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}