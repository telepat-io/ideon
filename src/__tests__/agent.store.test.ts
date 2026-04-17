import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  installAgentIntegration,
  listInstalledAgentIntegrations,
  uninstallAgentIntegration,
} from '../integrations/agent/store.js';

describe('agent integration store', () => {
  it('installs, lists, and uninstalls runtime integrations', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-agent-store-'));
    const storePath = path.join(tempRoot, 'agent-integrations.json');

    try {
      await installAgentIntegration('claude', storePath);
      await installAgentIntegration('chatgpt', storePath);

      const listed = await listInstalledAgentIntegrations(storePath);
      expect(listed.map((entry) => entry.runtime)).toEqual(['chatgpt', 'claude']);

      const removed = await uninstallAgentIntegration('claude', storePath);
      expect(removed).toBe(true);

      const listedAfterRemove = await listInstalledAgentIntegrations(storePath);
      expect(listedAfterRemove.map((entry) => entry.runtime)).toEqual(['chatgpt']);

      const missingRemove = await uninstallAgentIntegration('gemini', storePath);
      expect(missingRemove).toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('preserves installedAt while refreshing updatedAt on reinstall', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-agent-store-reinstall-'));
    const storePath = path.join(tempRoot, 'agent-integrations.json');

    try {
      const firstInstall = await installAgentIntegration('gemini', storePath);
      const secondInstall = await installAgentIntegration('gemini', storePath);

      expect(firstInstall.installedAt).toBe(secondInstall.installedAt);
      expect(new Date(secondInstall.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(firstInstall.updatedAt).getTime());
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
