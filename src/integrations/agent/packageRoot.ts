import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedPackageRoot: string | undefined;

export function resolveIdeonPackageRoot(moduleUrl: string = import.meta.url): string {
  if (cachedPackageRoot) {
    return cachedPackageRoot;
  }

  let currentDir = path.dirname(fileURLToPath(moduleUrl));
  for (let depth = 0; depth < 8; depth += 1) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    try {
      const raw = readFileSync(packageJsonPath, 'utf8');
      const parsed = JSON.parse(raw) as { name?: string };
      if (parsed.name === '@telepat/ideon') {
        cachedPackageRoot = currentDir;
        return currentDir;
      }
    } catch {
      // continue walking up
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  throw new Error('Could not resolve @telepat/ideon package root.');
}

export function resolveIdeonSkillDir(skillName: 'ideon-cli' | 'ideon-mcp', moduleUrl?: string): string {
  return path.join(resolveIdeonPackageRoot(moduleUrl), 'skill', skillName);
}

export function readIdeonPackageVersion(moduleUrl?: string): string {
  const packageJsonPath = path.join(resolveIdeonPackageRoot(moduleUrl), 'package.json');
  const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
  return parsed.version ?? '0.0.0';
}

export function resetIdeonPackageRootCacheForTests(): void {
  cachedPackageRoot = undefined;
}
