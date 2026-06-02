import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';
import { seriesSchema, type Series } from '../types/series.js';

const ideonPaths = envPaths('ideon', { suffix: '' });
const seriesDir = path.join(ideonPaths.config, 'series');

function seriesFilePath(slug: string): string {
  return path.join(seriesDir, `${slug}.json`);
}

export function getSeriesDir(): string {
  return seriesDir;
}

export async function loadSeries(slug: string): Promise<Series> {
  const filePath = seriesFilePath(slug);
  try {
    const raw = await readFile(filePath, 'utf8');
    return seriesSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Series "${slug}" not found.`);
    }
    throw error;
  }
}

export async function listSeries(options?: { publicationSlug?: string }): Promise<Series[]> {
  try {
    const entries = await readdir(seriesDir, { withFileTypes: true });
    const seriesList: Series[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      try {
        const raw = await readFile(path.join(seriesDir, entry.name), 'utf8');
        const parsed = seriesSchema.parse(JSON.parse(raw));
        if (options?.publicationSlug && parsed.publication !== options.publicationSlug) {
          continue;
        }
        seriesList.push(parsed);
      } catch {
        // Skip malformed series files silently
      }
    }

    return seriesList.sort((a, b) => a.slug.localeCompare(b.slug));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function saveSeries(series: Series): Promise<void> {
  await mkdir(seriesDir, { recursive: true });
  const filePath = seriesFilePath(series.slug);
  await writeFile(filePath, `${JSON.stringify(series, null, 2)}\n`, 'utf8');
}

export async function deleteSeries(slug: string): Promise<void> {
  const filePath = seriesFilePath(slug);
  try {
    await rm(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Series "${slug}" not found.`);
    }
    throw error;
  }
}

export async function seriesExists(slug: string): Promise<boolean> {
  try {
    await readFile(seriesFilePath(slug), 'utf8');
    return true;
  } catch {
    return false;
  }
}

export async function renameSeries(oldSlug: string, newSlug: string): Promise<void> {
  const oldPath = seriesFilePath(oldSlug);
  const newPath = seriesFilePath(newSlug);
  await rename(oldPath, newPath);
}
