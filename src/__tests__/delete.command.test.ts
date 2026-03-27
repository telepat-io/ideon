import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import type { AppSettings, EnvSettings } from '../config/schema.js';

const loadSavedSettingsMock = jest.fn<() => Promise<Partial<AppSettings>>>();
const readEnvSettingsMock = jest.fn<() => EnvSettings>();

jest.unstable_mockModule('../config/settingsFile.js', () => ({
  loadSavedSettings: loadSavedSettingsMock,
}));

jest.unstable_mockModule('../config/env.js', () => ({
  readEnvSettings: readEnvSettingsMock,
}));

const { runDeleteCommand } = await import('../cli/commands/delete.js');

describe('runDeleteCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readEnvSettingsMock.mockReturnValue({});
  });

  it('deletes markdown, analytics, and assets when forced', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-delete-force-'));

    try {
      const paths = await seedArticle(tempRoot, 'delete-me', { analytics: true, assets: true });
      const logs: string[] = [];

      loadSavedSettingsMock.mockResolvedValue(makeSettings(paths.markdownDir, paths.assetRoot));

      await runDeleteCommand(
        { slug: 'delete-me', force: true },
        {
          cwd: tempRoot,
          log: (message) => logs.push(message),
        },
      );

      await expect(pathExists(paths.markdownPath)).resolves.toBe(false);
      await expect(pathExists(paths.analyticsPath)).resolves.toBe(false);
      await expect(pathExists(paths.assetDir)).resolves.toBe(false);
      expect(logs[0]).toBe('Deleted article "delete-me".');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('cancels deletion when confirmation is declined', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-delete-cancel-'));
    const restoreTty = mockTty(true, true);

    try {
      const paths = await seedArticle(tempRoot, 'keep-me', { analytics: true, assets: true });
      const confirmDeletion = jest.fn(async () => false);
      const logs: string[] = [];

      loadSavedSettingsMock.mockResolvedValue(makeSettings(paths.markdownDir, paths.assetRoot));

      await runDeleteCommand(
        { slug: 'keep-me', force: false },
        {
          cwd: tempRoot,
          confirmDeletion,
          log: (message) => logs.push(message),
        },
      );

      expect(confirmDeletion).toHaveBeenCalledTimes(1);
      await expect(pathExists(paths.markdownPath)).resolves.toBe(true);
      await expect(pathExists(paths.analyticsPath)).resolves.toBe(true);
      await expect(pathExists(paths.assetDir)).resolves.toBe(true);
      expect(logs).toContain('Deletion cancelled.');
    } finally {
      restoreTty();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('requires --force outside an interactive terminal', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-delete-notty-'));
    const restoreTty = mockTty(false, false);

    try {
      const paths = await seedArticle(tempRoot, 'needs-force', { analytics: true, assets: true });
      loadSavedSettingsMock.mockResolvedValue(makeSettings(paths.markdownDir, paths.assetRoot));

      await expect(runDeleteCommand({ slug: 'needs-force', force: false }, { cwd: tempRoot })).rejects.toThrow(
        'Delete requires confirmation in an interactive terminal. Re-run with --force to skip the prompt.',
      );

      await expect(pathExists(paths.markdownPath)).resolves.toBe(true);
    } finally {
      restoreTty();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails clearly when the slug does not exist', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-delete-missing-'));

    try {
      const markdownDir = path.join(tempRoot, 'output');
      const assetRoot = path.join(markdownDir, 'assets');
      await mkdir(assetRoot, { recursive: true });

      loadSavedSettingsMock.mockResolvedValue(makeSettings(markdownDir, assetRoot));

      await expect(runDeleteCommand({ slug: 'missing-slug', force: true }, { cwd: tempRoot })).rejects.toThrow(
        `Could not find article "missing-slug". Expected markdown at ${path.join(markdownDir, 'missing-slug.md')}.`,
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('succeeds when only the markdown file remains', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-delete-partial-'));

    try {
      const paths = await seedArticle(tempRoot, 'partial-state', { analytics: false, assets: false });
      loadSavedSettingsMock.mockResolvedValue(makeSettings(paths.markdownDir, paths.assetRoot));

      await runDeleteCommand({ slug: 'partial-state', force: true }, { cwd: tempRoot, log: () => undefined });

      await expect(pathExists(paths.markdownPath)).resolves.toBe(false);
      await expect(pathExists(paths.analyticsPath)).resolves.toBe(false);
      await expect(pathExists(paths.assetDir)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects slugs that contain path separators', async () => {
    await expect(runDeleteCommand({ slug: '../escape', force: true })).rejects.toThrow(
      'Invalid slug "../escape". Pass the article slug only, without any path separators.',
    );
  });
});

function makeSettings(markdownOutputDir: string, assetOutputDir: string): Partial<AppSettings> {
  return {
    markdownOutputDir,
    assetOutputDir,
  };
}

async function seedArticle(
  tempRoot: string,
  slug: string,
  options: { analytics: boolean; assets: boolean },
): Promise<{
  markdownDir: string;
  assetRoot: string;
  markdownPath: string;
  analyticsPath: string;
  assetDir: string;
}> {
  const markdownDir = path.join(tempRoot, 'output');
  const assetRoot = path.join(markdownDir, 'assets');
  const markdownPath = path.join(markdownDir, `${slug}.md`);
  const analyticsPath = path.join(markdownDir, `${slug}.analytics.json`);
  const assetDir = path.join(assetRoot, slug);

  await mkdir(markdownDir, { recursive: true });
  await writeFile(markdownPath, '# Article\n', 'utf8');

  if (options.analytics) {
    await writeFile(analyticsPath, '{"ok":true}\n', 'utf8');
  }

  if (options.assets) {
    await mkdir(assetDir, { recursive: true });
    await writeFile(path.join(assetDir, 'cover-1.png'), 'image-bytes', 'utf8');
  }

  return {
    markdownDir,
    assetRoot,
    markdownPath,
    analyticsPath,
    assetDir,
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function mockTty(stdoutIsTty: boolean, stdinIsTty: boolean): () => void {
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: stdoutIsTty,
  });

  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: stdinIsTty,
  });

  return () => {
    if (stdoutDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    }

    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    }
  };
}