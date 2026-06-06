import { resolveOutputPaths } from '../output/filesystem.js';
import { parsePort, resolveMarkdownPath } from './previewHelpers.js';
import { startPreviewServer, type StartedPreviewServer } from './previewServer.js';

export type PreviewServerStatus = 'stopped' | 'running';

export interface PreviewServerState {
  status: PreviewServerStatus;
  url: string;
  port: number;
  markdownPath: string;
  startedAt: number;
}

const STOPPED_STATE: PreviewServerState = {
  status: 'stopped',
  url: '',
  port: 0,
  markdownPath: '',
  startedAt: 0,
};

let activeServer: StartedPreviewServer | null = null;
let currentState: PreviewServerState = { ...STOPPED_STATE };

let cleanupRegistered = false;

function registerProcessCleanup(): void {
  if (cleanupRegistered) {
    return;
  }

  cleanupRegistered = true;
  const cleanup = () => {
    void stopManagedPreview();
  };
  process.once('exit', cleanup);
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

function parsePortOption(port: number | undefined): number {
  if (port === undefined) {
    return parsePort(undefined);
  }

  return parsePort(String(port));
}

function extractPortFromUrl(url: string): number {
  try {
    const parsed = new URL(url);
    const port = Number.parseInt(parsed.port || '80', 10);
    return Number.isFinite(port) ? port : 0;
  } catch {
    return 0;
  }
}

export function getManagedPreviewStatus(): PreviewServerState {
  return { ...currentState };
}

export function resetManagedPreviewState(): void {
  activeServer = null;
  currentState = { ...STOPPED_STATE };
}

export async function stopManagedPreview(): Promise<PreviewServerState> {
  if (!activeServer) {
    currentState = { ...STOPPED_STATE };
    return getManagedPreviewStatus();
  }

  const server = activeServer;
  activeServer = null;
  currentState = { ...STOPPED_STATE };

  await server.close();
  return getManagedPreviewStatus();
}

export interface StartManagedPreviewOptions {
  port?: number;
  markdownPath?: string;
  cwd?: string;
}

export async function startManagedPreview(options: StartManagedPreviewOptions = {}): Promise<PreviewServerState> {
  if (activeServer) {
    await stopManagedPreview();
  }

  const workingDir = options.cwd ?? process.cwd();
  const outputPaths = resolveOutputPaths();
  const markdownPath = await resolveMarkdownPath(
    options.markdownPath,
    outputPaths.markdownOutputDir,
    workingDir,
  );
  const port = parsePortOption(options.port);

  const server = await startPreviewServer({
    markdownPath,
    assetDir: outputPaths.assetOutputDir,
    markdownOutputDir: outputPaths.markdownOutputDir,
    port,
    openBrowser: false,
    watch: false,
  });

  const boundPort = extractPortFromUrl(server.url) || port;
  activeServer = server;
  currentState = {
    status: 'running',
    url: server.url,
    port: boundPort,
    markdownPath,
    startedAt: Date.now(),
  };

  registerProcessCleanup();
  return getManagedPreviewStatus();
}
