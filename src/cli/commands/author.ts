import { createInterface } from 'node:readline/promises';
import {
  authorExists,
  deleteAuthor,
  listAuthors,
  loadAuthor,
  saveAuthor,
} from '../../config/authorStore.js';
import { deriveAuthorSlugFromName, type Author } from '../../types/author.js';
import { ReportedError } from '../reportedError.js';

interface AuthorAddOptions {
  name?: string;
  profile?: string;
}

interface AuthorListOptions {
  json: boolean;
  verbose: boolean;
}

interface AuthorEditOptions {
  slug: string;
  name?: string;
  profile?: string;
}

interface AuthorRemoveOptions {
  slug: string;
  force: boolean;
}

export async function runAuthorAddCommand(
  options: AuthorAddOptions,
  dependencies: { log?: (message: string) => void } = {},
): Promise<void> {
  const log = dependencies.log ?? ((message: string) => console.log(message));

  let name = options.name;
  if (!name && process.stdout.isTTY && process.stdin.isTTY) {
    name = await promptForName();
  }

  if (!name) {
    throw new ReportedError('Author name is required. Pass a name argument or use interactive mode.');
  }

  const slug = deriveAuthorSlugFromName(name);

  if (await authorExists(slug)) {
    throw new ReportedError(`Author "${slug}" already exists. Choose a different name.`);
  }

  let profile = options.profile?.trim() ?? '';
  if (!profile && process.stdout.isTTY && process.stdin.isTTY) {
    profile = await promptForProfile();
  }

  const author: Author = {
    name,
    slug,
    profile,
  };

  await saveAuthor(author);
  log(`Created author "${name}" (${slug}).`);
}

export async function runAuthorListCommand(options: AuthorListOptions): Promise<void> {
  const authors = await listAuthors();

  if (options.json) {
    console.log(JSON.stringify(authors, null, 2));
    return;
  }

  if (authors.length === 0) {
    console.log('No authors found. Create one with `ideon author add`.');
    return;
  }

  if (options.verbose) {
    for (const author of authors) {
      console.log(`\n  ${author.slug}`);
      console.log(`    Name: ${author.name}`);
      if (author.profile) {
        const preview = author.profile.length > 200 ? `${author.profile.slice(0, 200)}...` : author.profile;
        console.log(`    Profile: ${preview}`);
      }
    }
    return;
  }

  const slugWidth = Math.max(4, ...authors.map((author) => author.slug.length));
  const nameWidth = Math.max(4, ...authors.map((author) => author.name.length));

  console.log(
    '  ' +
    'Slug'.padEnd(slugWidth) + '  ' +
    'Name'.padEnd(nameWidth),
  );
  console.log('  ' + '-'.repeat(slugWidth + nameWidth + 2));

  for (const author of authors) {
    console.log(
      '  ' +
      author.slug.padEnd(slugWidth) + '  ' +
      author.name.padEnd(nameWidth),
    );
  }
}

export async function runAuthorEditCommand(options: AuthorEditOptions): Promise<void> {
  const author = await loadAuthor(options.slug);

  if (options.name) {
    author.name = options.name;
  }

  if (options.profile !== undefined) {
    author.profile = options.profile;
  }

  await saveAuthor(author);
  console.log(`Updated author "${author.slug}".`);
}

export async function runAuthorRemoveCommand(
  options: AuthorRemoveOptions,
  dependencies: { confirmDeletion?: (slug: string) => Promise<boolean>; log?: (message: string) => void } = {},
): Promise<void> {
  const log = dependencies.log ?? ((message: string) => console.log(message));
  const confirmDeletion = dependencies.confirmDeletion ?? promptForRemoveConfirmation;

  if (!options.force) {
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      throw new ReportedError('Remove requires confirmation in an interactive terminal. Re-run with --force to skip the prompt.');
    }

    const confirmed = await confirmDeletion(options.slug);
    if (!confirmed) {
      log('Removal cancelled.');
      return;
    }
  }

  await deleteAuthor(options.slug);
  log(`Deleted author "${options.slug}".`);
}

export async function assertAuthorExists(slug: string): Promise<void> {
  if (!(await authorExists(slug))) {
    throw new ReportedError(`Author "${slug}" not found. Create one with \`ideon author add\`.`);
  }
}

async function promptForName(): Promise<string> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const name = (await readline.question('Author name: ')).trim();
      if (name.length > 0) {
        return name;
      }
      console.error('Name cannot be empty.');
    }
  } finally {
    readline.close();
  }
}

async function promptForProfile(): Promise<string> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('Author profile (experience, style, credentials — press Enter on an empty line to finish):');
    const lines: string[] = [];
    while (true) {
      const line = await readline.question('> ');
      if (line.trim().length === 0 && lines.length > 0) {
        break;
      }
      if (line.trim().length > 0) {
        lines.push(line);
      } else if (lines.length === 0) {
        continue;
      } else {
        break;
      }
    }
    return lines.join('\n');
  } finally {
    readline.close();
  }
}

async function promptForRemoveConfirmation(slug: string): Promise<boolean> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (await readline.question(`Delete author "${slug}"? (y/N) `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    readline.close();
  }
}
