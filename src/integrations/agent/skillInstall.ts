import { cp, lstat, mkdir, rm, symlink } from 'node:fs/promises';
import path from 'node:path';

export async function installSkillLink(
  sourceDir: string,
  targetDir: string,
  options: { dryRun: boolean; force: boolean },
): Promise<{ changed: boolean; skipped: boolean; reason?: string; method: 'symlink' | 'copy' | 'none' }> {
  try {
    const stat = await lstat(targetDir);
    if (stat.isSymbolicLink()) {
      return { changed: false, skipped: false, method: 'symlink' };
    }
    if (!options.force) {
      return {
        changed: false,
        skipped: true,
        reason: `Target skill path already exists: ${targetDir}`,
        method: 'none',
      };
    }
    if (!options.dryRun) {
      await rm(targetDir, { recursive: true, force: true });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  if (options.dryRun) {
    return { changed: true, skipped: false, method: 'symlink' };
  }

  await mkdir(path.dirname(targetDir), { recursive: true });
  try {
    await symlink(sourceDir, targetDir, 'dir');
    return { changed: true, skipped: false, method: 'symlink' };
  } catch {
    await cp(sourceDir, targetDir, { recursive: true });
    return { changed: true, skipped: false, method: 'copy' };
  }
}

export async function removeSkillLink(targetDir: string, options: { dryRun: boolean }): Promise<boolean> {
  try {
    if (!options.dryRun) {
      await rm(targetDir, { recursive: true, force: true });
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function copySkillTree(
  sourceDir: string,
  targetDir: string,
  options: { dryRun: boolean; force: boolean },
): Promise<{ changed: boolean; skipped: boolean; reason?: string }> {
  try {
    await lstat(targetDir);
    if (!options.force) {
      return { changed: false, skipped: true, reason: `Export path already exists: ${targetDir}` };
    }
    if (!options.dryRun) {
      await rm(targetDir, { recursive: true, force: true });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  if (!options.dryRun) {
    await mkdir(path.dirname(targetDir), { recursive: true });
    await cp(sourceDir, targetDir, { recursive: true });
  }
  return { changed: true, skipped: false };
}
