import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';
import { authorSchema, type Author } from '../types/author.js';

const ideonPaths = envPaths('ideon', { suffix: '' });
const authorsDir = path.join(ideonPaths.config, 'authors');

function authorFilePath(slug: string): string {
  return path.join(authorsDir, `${slug}.json`);
}

export function getAuthorsDir(): string {
  return authorsDir;
}

export async function loadAuthor(slug: string): Promise<Author> {
  const filePath = authorFilePath(slug);
  try {
    const raw = await readFile(filePath, 'utf8');
    return authorSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Author "${slug}" not found.`);
    }
    throw error;
  }
}

export async function listAuthors(): Promise<Author[]> {
  try {
    const entries = await readdir(authorsDir, { withFileTypes: true });
    const authors: Author[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      try {
        const raw = await readFile(path.join(authorsDir, entry.name), 'utf8');
        authors.push(authorSchema.parse(JSON.parse(raw)));
      } catch {
        // Skip malformed author files silently
      }
    }

    return authors.sort((a, b) => a.slug.localeCompare(b.slug));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function saveAuthor(author: Author): Promise<void> {
  await mkdir(authorsDir, { recursive: true });
  const filePath = authorFilePath(author.slug);
  await writeFile(filePath, `${JSON.stringify(author, null, 2)}\n`, 'utf8');
}

export async function deleteAuthor(slug: string): Promise<void> {
  const filePath = authorFilePath(slug);
  try {
    await rm(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Author "${slug}" not found.`);
    }
    throw error;
  }
}

export async function authorExists(slug: string): Promise<boolean> {
  try {
    await readFile(authorFilePath(slug), 'utf8');
    return true;
  } catch {
    return false;
  }
}

export async function renameAuthor(oldSlug: string, newSlug: string): Promise<void> {
  const oldPath = authorFilePath(oldSlug);
  const newPath = authorFilePath(newSlug);
  await rename(oldPath, newPath);
}
