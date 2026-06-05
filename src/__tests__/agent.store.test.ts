import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const {
  installAgentIntegration,
  listInstalledAgentIntegrations,
  uninstallAgentIntegration,
} = await import('../integrations/agent/store.js');

let tempDir: string;
let storePath: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'agent-store-test-'));
  storePath = path.join(tempDir, 'agent-integrations.json');
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('agent integration store', () => {
  it('installs, lists, and uninstalls runtime integrations', async () => {
    const installed = await installAgentIntegration('claude', storePath);
    expect(installed.runtime).toBe('claude');
    expect(installed.installedAt).toBeTruthy();

    const listed = await listInstalledAgentIntegrations(storePath);
    expect(listed).toHaveLength(1);
    expect(listed[0].runtime).toBe('claude');

    const removed = await uninstallAgentIntegration('claude', storePath);
    expect(removed).toBe(true);

    const afterRemove = await listInstalledAgentIntegrations(storePath);
    expect(afterRemove).toHaveLength(0);
  });

  it('returns empty list when store does not exist', async () => {
    const entries = await listInstalledAgentIntegrations(storePath);
    expect(entries).toEqual([]);
  });

  it('preserves installedAt on reinstall', async () => {
    const first = await installAgentIntegration('chatgpt', storePath);
    const second = await installAgentIntegration('chatgpt', storePath);

    expect(second.installedAt).toBe(first.installedAt);
    expect(second.updatedAt).not.toBe(first.updatedAt);
  });

  it('returns false when uninstalling non-existent runtime', async () => {
    const result = await uninstallAgentIntegration('gemini', storePath);
    expect(result).toBe(false);
  });

  it('installs multiple runtimes', async () => {
    await installAgentIntegration('claude', storePath);
    await installAgentIntegration('chatgpt', storePath);

    const entries = await listInstalledAgentIntegrations(storePath);
    expect(entries).toHaveLength(2);
  });
});
