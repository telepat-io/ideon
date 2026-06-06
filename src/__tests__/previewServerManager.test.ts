import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

const {
  getManagedPreviewStatus,
  resetManagedPreviewState,
  startManagedPreview,
  stopManagedPreview,
} = await import('../server/previewServerManager.js');

describe('previewServerManager', () => {
  let tempRoot: string;
  let originalIdeonHome: string | undefined;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-preview-manager-'));
    originalIdeonHome = process.env.IDEON_HOME;
    process.env.IDEON_HOME = tempRoot;

    const markdownOutputDir = path.join(tempRoot, '.ideon', 'output');
    const assetDir = path.join(markdownOutputDir, 'assets');
    await mkdir(assetDir, { recursive: true });
    await writeFile(path.join(markdownOutputDir, 'sample.md'), '# Sample Article\n\nBody\n', 'utf8');
  });

  afterEach(async () => {
    await stopManagedPreview();
    resetManagedPreviewState();

    if (originalIdeonHome === undefined) {
      delete process.env.IDEON_HOME;
    } else {
      process.env.IDEON_HOME = originalIdeonHome;
    }

    await rm(tempRoot, { recursive: true, force: true });
  });

  it('starts a preview server and reports running status', async () => {
    const port = await getFreePort();
    const state = await startManagedPreview({ port });

    expect(state.status).toBe('running');
    expect(state.url).toMatch(/^http:\/\/localhost:\d+$/);
    expect(state.port).toBeGreaterThan(0);
    expect(state.markdownPath).toContain('sample.md');
    expect(state.startedAt).toBeGreaterThan(0);

    const response = await fetch(`${state.url}/api/bootstrap`);
    expect(response.status).toBe(200);
  });

  it('returns stopped status when no server is running', () => {
    const state = getManagedPreviewStatus();

    expect(state.status).toBe('stopped');
    expect(state.url).toBe('');
    expect(state.port).toBe(0);
  });

  it('stops a running preview server', async () => {
    const port = await getFreePort();
    const started = await startManagedPreview({ port });
    const stopped = await stopManagedPreview();

    expect(stopped.status).toBe('stopped');
    expect(getManagedPreviewStatus().status).toBe('stopped');

    await expect(fetch(`${started.url}/api/bootstrap`)).rejects.toThrow();
  });

  it('stop when already stopped is a no-op', async () => {
    const state = await stopManagedPreview();

    expect(state.status).toBe('stopped');
  });

  it('restarts when start is called while already running', async () => {
    const firstPort = await getFreePort();
    const secondPort = await getFreePort();
    const first = await startManagedPreview({ port: firstPort });
    const second = await startManagedPreview({ port: secondPort });

    expect(second.status).toBe('running');
    expect(second.url).toMatch(/^http:\/\/localhost:\d+$/);

    await expect(fetch(`${first.url}/api/bootstrap`)).rejects.toThrow();

    const secondResponse = await fetch(`${second.url}/api/bootstrap`);
    expect(secondResponse.status).toBe(200);
  });

  it('resetManagedPreviewState clears module state', async () => {
    await stopManagedPreview();
    resetManagedPreviewState();

    expect(getManagedPreviewStatus()).toEqual({
      status: 'stopped',
      url: '',
      port: 0,
      markdownPath: '',
      startedAt: 0,
    });
  });
});
