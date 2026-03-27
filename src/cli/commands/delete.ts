import { rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { readEnvSettings } from '../../config/env.js';
import { appSettingsSchema } from '../../config/schema.js';
import { loadSavedSettings } from '../../config/settingsFile.js';
import { resolveAnalyticsPath, resolveOutputPaths } from '../../output/filesystem.js';
import { ReportedError } from '../reportedError.js';

interface DeleteCommandOptions {
  slug: string;
  force: boolean;
}

interface DeleteTargets {
  slug: string;
  markdownPath: string;
  analyticsPath: string;
  assetDir: string;
}

interface DeleteCommandDependencies {
  confirmDeletion: (targets: DeleteTargets) => Promise<boolean>;
  log: (message: string) => void;
  cwd: string;
}

export async function runDeleteCommand(
  options: DeleteCommandOptions,
  dependencies: Partial<DeleteCommandDependencies> = {},
): Promise<void> {
  const slug = normalizeSlug(options.slug);
  const cwd = dependencies.cwd ?? process.cwd();
  const log = dependencies.log ?? ((message: string) => console.log(message));
  const confirmDeletion = dependencies.confirmDeletion ?? promptForDeleteConfirmation;
  const targets = await resolveDeleteTargets(slug, cwd);

  if (!options.force) {
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      throw new ReportedError('Delete requires confirmation in an interactive terminal. Re-run with --force to skip the prompt.');
    }

    const confirmed = await confirmDeletion(targets);
    if (!confirmed) {
      log('Deletion cancelled.');
      return;
    }
  }

  try {
    await rm(targets.markdownPath);
    await Promise.all([
      rm(targets.analyticsPath, { force: true }),
      rm(targets.assetDir, { recursive: true, force: true }),
    ]);
  } catch (error) {
    throw toReportedDeleteError(error, slug);
  }

  const relativeMarkdown = formatRelativePath(cwd, targets.markdownPath);
  const relativeAssetDir = formatRelativePath(cwd, targets.assetDir);
  log(`Deleted article "${slug}".`);
  log(`Removed ${relativeMarkdown} and cleaned ${relativeAssetDir}.`);
}

async function resolveDeleteTargets(slug: string, cwd: string): Promise<DeleteTargets> {
  const [savedSettings, envSettings] = await Promise.all([loadSavedSettings(), Promise.resolve(readEnvSettings())]);
  const mergedSettings = appSettingsSchema.parse({
    ...savedSettings,
    ...(envSettings.markdownOutputDir ? { markdownOutputDir: envSettings.markdownOutputDir } : {}),
    ...(envSettings.assetOutputDir ? { assetOutputDir: envSettings.assetOutputDir } : {}),
  });

  const outputPaths = resolveOutputPaths(mergedSettings, cwd);
  const markdownPath = path.join(outputPaths.markdownOutputDir, `${slug}.md`);

  await assertMarkdownExists(markdownPath, slug);

  return {
    slug,
    markdownPath,
    analyticsPath: resolveAnalyticsPath(markdownPath),
    assetDir: path.join(outputPaths.assetOutputDir, slug),
  };
}

function normalizeSlug(rawSlug: string): string {
  const slug = rawSlug.trim();

  if (!slug) {
    throw new ReportedError('Slug cannot be empty. Pass the generated article slug, for example `ideon delete my-article-slug`.');
  }

  if (slug.toLowerCase().endsWith('.md')) {
    throw new ReportedError(`Expected a slug, not a markdown filename: ${slug}. Pass the slug without .md.`);
  }

  if (slug === '.' || slug === '..' || /[/\\]/.test(slug)) {
    throw new ReportedError(`Invalid slug "${slug}". Pass the article slug only, without any path separators.`);
  }

  return slug;
}

async function assertMarkdownExists(markdownPath: string, slug: string): Promise<void> {
  try {
    const fileStat = await stat(markdownPath);
    if (!fileStat.isFile()) {
      throw new Error('not-a-file');
    }
  } catch {
    throw new ReportedError(`Could not find article "${slug}". Expected markdown at ${markdownPath}.`);
  }
}

async function promptForDeleteConfirmation(targets: DeleteTargets): Promise<boolean> {
  const [{ default: React }, { render }, { DeleteConfirmationFlow }] = await Promise.all([
    import('react'),
    import('ink'),
    import('../flows/deleteConfirmationFlow.js'),
  ]);

  let confirmed = false;

  const app = render(
    React.createElement(DeleteConfirmationFlow, {
      targets,
      onDone: (value: boolean) => {
        confirmed = value;
      },
    }),
  );

  await app.waitUntilExit();
  process.stdout.write('\n');
  return confirmed;
}

function toReportedDeleteError(error: unknown, slug: string): ReportedError {
  if (error instanceof ReportedError) {
    return error;
  }

  if (isNodeError(error) && error.code === 'EACCES') {
    return new ReportedError(`Permission denied while deleting article "${slug}".`);
  }

  if (isNodeError(error) && error.code === 'EPERM') {
    return new ReportedError(`Unable to delete article "${slug}" because the OS denied the operation.`);
  }

  const message = error instanceof Error ? error.message : 'Unknown delete failure.';
  return new ReportedError(`Failed to delete article "${slug}": ${message}`);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function formatRelativePath(cwd: string, targetPath: string): string {
  const relativePath = path.relative(cwd, targetPath);
  return relativePath.length > 0 ? relativePath : targetPath;
}