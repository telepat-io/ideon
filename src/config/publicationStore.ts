import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';
import { publicationSchema, type Publication } from '../types/publication.js';

const ideonPaths = envPaths('ideon', { suffix: '' });
const publicationsDir = path.join(ideonPaths.config, 'publications');

function publicationFilePath(slug: string): string {
  return path.join(publicationsDir, `${slug}.json`);
}

export function getPublicationsDir(): string {
  return publicationsDir;
}

export async function loadPublication(slug: string): Promise<Publication> {
  const filePath = publicationFilePath(slug);
  try {
    const raw = await readFile(filePath, 'utf8');
    return publicationSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Publication "${slug}" not found.`);
    }
    throw error;
  }
}

export async function listPublications(): Promise<Publication[]> {
  try {
    const entries = await readdir(publicationsDir, { withFileTypes: true });
    const publications: Publication[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      try {
        const raw = await readFile(path.join(publicationsDir, entry.name), 'utf8');
        publications.push(publicationSchema.parse(JSON.parse(raw)));
      } catch {
        // Skip malformed publication files silently
      }
    }

    return publications.sort((a, b) => a.slug.localeCompare(b.slug));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function savePublication(publication: Publication): Promise<void> {
  await mkdir(publicationsDir, { recursive: true });
  const filePath = publicationFilePath(publication.slug);
  await writeFile(filePath, `${JSON.stringify(publication, null, 2)}\n`, 'utf8');
}

export async function deletePublication(slug: string): Promise<void> {
  const filePath = publicationFilePath(slug);
  try {
    await rm(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Publication "${slug}" not found.`);
    }
    throw error;
  }
}

export async function publicationExists(slug: string): Promise<boolean> {
  try {
    await readFile(publicationFilePath(slug), 'utf8');
    return true;
  } catch {
    return false;
  }
}

export async function renamePublication(oldSlug: string, newSlug: string): Promise<void> {
  const oldPath = publicationFilePath(oldSlug);
  const newPath = publicationFilePath(newSlug);
  await rename(oldPath, newPath);
}
