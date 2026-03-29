import path from 'node:path';
import { spawn } from 'node:child_process';
import { appSettingsSchema } from '../../config/schema.js';
import { readEnvSettings } from '../../config/env.js';
import { loadSavedSettings } from '../../config/settingsFile.js';
import { resolveOutputPaths } from '../../output/filesystem.js';
import { resolveMarkdownPath, parsePort } from '../../server/previewHelpers.js';
import { startPreviewServer } from '../../server/previewServer.js';

interface ServeCommandOptions {
  markdownPath?: string;
  port?: string;
  openBrowser: boolean;
  watch?: boolean;
}

export async function runServeCommand(options: ServeCommandOptions): Promise<void> {
  const [savedSettings, envSettings] = await Promise.all([loadSavedSettings(), Promise.resolve(readEnvSettings())]);
  const mergedSettings = appSettingsSchema.parse({
    ...savedSettings,
    ...(envSettings.markdownOutputDir ? { markdownOutputDir: envSettings.markdownOutputDir } : {}),
    ...(envSettings.assetOutputDir ? { assetOutputDir: envSettings.assetOutputDir } : {}),
  });

  const outputPaths = resolveOutputPaths(mergedSettings);
  const markdownPath = await resolveMarkdownPath(options.markdownPath, outputPaths.markdownOutputDir, process.cwd());
  const port = parsePort(options.port);

  if (options.watch) {
    const viteBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'vite');
    const viteProcess = spawn(viteBin, ['build', '--watch'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    const cleanup = () => { viteProcess.kill(); };
    process.once('exit', cleanup);
    process.once('SIGINT', () => { cleanup(); process.exit(0); });
    process.once('SIGTERM', () => { cleanup(); process.exit(0); });
  }

  const server = await startPreviewServer({
    markdownPath,
    assetDir: outputPaths.assetOutputDir,
    markdownOutputDir: outputPaths.markdownOutputDir,
    port,
    openBrowser: options.openBrowser,
    watch: options.watch,
  });

  const relativeArticle = path.relative(process.cwd(), markdownPath);
  const relativeAssets = path.relative(process.cwd(), outputPaths.assetOutputDir);

  console.log(`Previewing ${relativeArticle || markdownPath}`);
  console.log(`Serving assets from ${relativeAssets || outputPaths.assetOutputDir}`);
  console.log(`Open ${server.url}`);
  if (options.watch) {
    console.log('Watching for source changes — browser will reload automatically.');
  }

  console.log('Press Ctrl+C to stop.');
}
