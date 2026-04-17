import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';
import { z } from 'zod';

export const supportedAgentRuntimeValues = ['claude', 'chatgpt', 'gemini', 'generic-mcp'] as const;
export type SupportedAgentRuntime = (typeof supportedAgentRuntimeValues)[number];

const integrationEntrySchema = z.object({
  runtime: z.enum(supportedAgentRuntimeValues),
  installedAt: z.string(),
  updatedAt: z.string(),
});

const integrationStoreSchema = z.object({
  version: z.literal(1),
  integrations: z.record(z.string(), integrationEntrySchema).default({}),
});

type IntegrationStore = z.infer<typeof integrationStoreSchema>;

const ideonPaths = envPaths('ideon', { suffix: '' });
const storeDir = ideonPaths.config;
const storePath = path.join(storeDir, 'agent-integrations.json');

export interface InstalledAgentIntegration {
  runtime: SupportedAgentRuntime;
  installedAt: string;
  updatedAt: string;
}

export function getAgentIntegrationStorePath(): string {
  return storePath;
}

export async function listInstalledAgentIntegrations(targetStorePath = storePath): Promise<InstalledAgentIntegration[]> {
  const store = await readStore(targetStorePath);
  const entries = Object.values(store.integrations);
  entries.sort((a, b) => a.runtime.localeCompare(b.runtime));
  return entries;
}

export async function installAgentIntegration(
  runtime: SupportedAgentRuntime,
  targetStorePath = storePath,
): Promise<InstalledAgentIntegration> {
  const nowIso = new Date().toISOString();
  const store = await readStore(targetStorePath);
  const existing = store.integrations[runtime];

  const nextEntry: InstalledAgentIntegration = {
    runtime,
    installedAt: existing?.installedAt ?? nowIso,
    updatedAt: nowIso,
  };

  const nextStore: IntegrationStore = {
    ...store,
    integrations: {
      ...store.integrations,
      [runtime]: nextEntry,
    },
  };

  await writeStore(nextStore, targetStorePath);
  return nextEntry;
}

export async function uninstallAgentIntegration(
  runtime: SupportedAgentRuntime,
  targetStorePath = storePath,
): Promise<boolean> {
  const store = await readStore(targetStorePath);
  if (!store.integrations[runtime]) {
    return false;
  }

  const nextIntegrations = { ...store.integrations };
  delete nextIntegrations[runtime];

  const nextStore: IntegrationStore = {
    ...store,
    integrations: nextIntegrations,
  };

  await writeStore(nextStore, targetStorePath);
  return true;
}

async function readStore(targetStorePath: string): Promise<IntegrationStore> {
  try {
    const raw = await readFile(targetStorePath, 'utf8');
    return integrationStoreSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return integrationStoreSchema.parse({ version: 1, integrations: {} });
    }

    throw error;
  }
}

async function writeStore(store: IntegrationStore, targetStorePath: string): Promise<void> {
  await mkdir(path.dirname(targetStorePath), { recursive: true });
  await writeFile(targetStorePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}
