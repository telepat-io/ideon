#!/usr/bin/env node

/**
 * Sync writing guides from canonical source to skill directory.
 * This ensures the skill is self-contained and agents can access all required guides.
 * 
 * Usage: node scripts/sync-writing-guides.mjs
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.resolve(projectRoot, 'writing-guide');
const targetDir = path.resolve(projectRoot, 'skill/ideon/guides');

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function copyDir(src, dst) {
  await ensureDir(dst);
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, dstPath);
    } else {
      await fs.copyFile(srcPath, dstPath);
      console.log(`✓ ${path.relative(projectRoot, dstPath)}`);
    }
  }
}

async function main() {
  try {
    console.log('Syncing writing guides from canonical source...\n');
    console.log(`Source: ${path.relative(projectRoot, sourceDir)}`);
    console.log(`Target: ${path.relative(projectRoot, targetDir)}\n`);

    // Verify source exists
    try {
      await fs.access(sourceDir);
    } catch {
      console.error(`✗ Source directory not found: ${sourceDir}`);
      process.exit(1);
    }

    // Clear target directory
    try {
      await fs.rm(targetDir, { recursive: true, force: true });
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    // Copy guides
    await copyDir(sourceDir, targetDir);

    console.log(`\n✓ Successfully synced writing guides to skill directory`);
    console.log(`\nNext step: Update guide-map.json paths if they haven't been already`);
  } catch (error) {
    console.error('✗ Error syncing guides:', error.message);
    process.exit(1);
  }
}

main();
