import path from 'node:path';
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

  const server = await startPreviewServer({
    markdownPath,
    assetDir: outputPaths.assetOutputDir,
    markdownOutputDir: outputPaths.markdownOutputDir,
    port,
    openBrowser: options.openBrowser,
  });

  const relativeArticle = path.relative(process.cwd(), markdownPath);
  const relativeAssets = path.relative(process.cwd(), outputPaths.assetOutputDir);

  console.log(`Previewing ${relativeArticle || markdownPath}`);
  console.log(`Serving assets from ${relativeAssets || outputPaths.assetOutputDir}`);
  console.log(`Open ${server.url}`);
  console.log('Press Ctrl+C to stop.');
}
