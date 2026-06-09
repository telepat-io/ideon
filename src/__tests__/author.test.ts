import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-author-test-'));
const tempConfigDir = path.join(tempRoot, 'config');

jest.unstable_mockModule('env-paths', () => ({
  default: () => ({ config: tempConfigDir }),
}));

const { deriveAuthorSlugFromName, authorSchema } = await import('../types/author.js');
const { buildAuthorDirective, buildAuthorRunContext } = await import('../llm/prompts/authorPolicy.js');
const {
  loadAuthor,
  listAuthors,
  saveAuthor,
  deleteAuthor,
  authorExists,
  getAuthorsDir,
  renameAuthor,
} = await import('../config/authorStore.js');

describe('author types', () => {
  it('derives slug from name', () => {
    expect(deriveAuthorSlugFromName('Jane Doe')).toBe('jane-doe');
  });

  it('returns untitled-author for empty input', () => {
    expect(deriveAuthorSlugFromName('')).toBe('untitled-author');
    expect(deriveAuthorSlugFromName('   ')).toBe('untitled-author');
  });

  it('parses author schema', () => {
    const author = authorSchema.parse({
      name: 'Jane Doe',
      slug: 'jane-doe',
      profile: 'Platform engineer with 10 years of Kubernetes experience.',
    });
    expect(author.profile).toContain('Kubernetes');
  });

  it('defaults profile to empty string', () => {
    const author = authorSchema.parse({
      name: 'Jane Doe',
      slug: 'jane-doe',
    });
    expect(author.profile).toBe('');
  });
});

describe('author store', () => {
  afterAll(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('exposes authors directory path', () => {
    expect(getAuthorsDir()).toBe(path.join(tempConfigDir, 'authors'));
  });

  it('returns empty list before any authors exist', async () => {
    await expect(listAuthors()).resolves.toEqual([]);
  });

  it('saves and loads an author', async () => {
    await saveAuthor({
      name: 'Alex Chen',
      slug: 'alex-chen',
      profile: 'Writes about developer productivity.',
    });

    const loaded = await loadAuthor('alex-chen');
    expect(loaded.name).toBe('Alex Chen');
    expect(await authorExists('alex-chen')).toBe(true);
  });

  it('rethrows non-ENOENT errors when loading', async () => {
    const authorsDir = path.join(tempConfigDir, 'authors');
    await writeFile(path.join(authorsDir, 'broken.json'), '{invalid', 'utf8');
    await expect(loadAuthor('broken')).rejects.toThrow();
  });

  it('lists authors', async () => {
    const authors = await listAuthors();
    expect(authors.some((author) => author.slug === 'alex-chen')).toBe(true);
  });

  it('deletes an author', async () => {
    await deleteAuthor('alex-chen');
    await expect(loadAuthor('alex-chen')).rejects.toThrow(/not found/);
    expect(await authorExists('alex-chen')).toBe(false);
  });

  it('throws when deleting a missing author', async () => {
    await expect(deleteAuthor('missing-author')).rejects.toThrow(/not found/);
  });

  it('skips malformed and non-json files when listing', async () => {
    const authorsDir = path.join(tempConfigDir, 'authors');
    await mkdir(authorsDir, { recursive: true });
    await writeFile(path.join(authorsDir, 'bad.json'), '{not json', 'utf8');
    await writeFile(path.join(authorsDir, 'readme.txt'), 'ignore', 'utf8');
    await saveAuthor({
      name: 'Valid Author',
      slug: 'valid-author',
      profile: 'Profile text.',
    });

    const authors = await listAuthors();
    expect(authors.map((author) => author.slug)).toEqual(['valid-author']);
  });

  it('renames an author file', async () => {
    await saveAuthor({
      name: 'Rename Me',
      slug: 'rename-me',
      profile: 'Before rename.',
    });

    await renameAuthor('rename-me', 'renamed-author');
    const loaded = await loadAuthor('renamed-author');
    expect(loaded.name).toBe('Rename Me');
    await expect(loadAuthor('rename-me')).rejects.toThrow(/not found/);
  });
});

describe('buildAuthorRunContext', () => {
  it('returns null without author', () => {
    expect(buildAuthorRunContext(null)).toBeNull();
    expect(buildAuthorRunContext(undefined)).toBeNull();
  });

  it('returns context with author and notes', () => {
    const author = { name: 'Alex', slug: 'alex', profile: 'Engineer' };
    expect(buildAuthorRunContext(author, 'Notes')).toEqual({
      author,
      experienceNotes: 'Notes',
    });
  });
});

describe('buildAuthorDirective', () => {
  it('returns empty string without author', () => {
    expect(buildAuthorDirective(null)).toBe('');
    expect(buildAuthorDirective(undefined)).toBe('');
  });

  it('uses placeholder guidance when profile is empty', () => {
    const directive = buildAuthorDirective({
      author: { name: 'Alex', slug: 'alex', profile: '' },
    });
    expect(directive).toContain('[No profile provided');
    expect(directive).not.toContain('Article-specific experience');
  });

  it('includes author profile and experience rules', () => {
    const directive = buildAuthorDirective({
      author: {
        name: 'Alex Chen',
        slug: 'alex-chen',
        profile: 'SRE lead at a fintech startup.',
      },
      experienceNotes: 'Once debugged a prod outage caused by a misconfigured readiness probe.',
    });

    expect(directive).toContain('Alex Chen');
    expect(directive).toContain('SRE lead');
    expect(directive).toContain('readiness probe');
    expect(directive).toContain('Do not add author bylines');
  });
});
