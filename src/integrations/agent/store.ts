import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import envPaths from 'env-paths';

export const supportedAgentRuntimeValues = [
  'claude',
  'claude-desktop',
  'chatgpt',
  'gemini',
  'codex',
  'cursor',
  'vscode',
  'opencode',
  'generic-mcp',
  'hermes',
  'pi',
] as const;
export type SupportedAgentRuntime = (typeof supportedAgentRuntimeValues)[number];

const integrationProfileSchema = z.object({
  cliSkill: z.boolean(),
  mcpSkill: z.boolean(),
  scope: z.enum(['global', 'project']),
  managedPaths: z.array(z.string()).default([]),
  managedKeys: z.array(z.string()).default([]),
  toolId: z.literal('ideon'),
  integrationVersion: z.string(),
});

const integrationEntrySchema = z.object({
  runtime: z.enum(supportedAgentRuntimeValues),
  installedAt: z.string(),
  updatedAt: z.string(),
  profile: integrationProfileSchema.optional(),
});

const integrationStoreSchema = z.object({
  version: z.literal(1),
  integrations: z.record(z.string(), integrationEntrySchema).default({}),
});

type IntegrationStore = z.infer<typeof integrationStoreSchema>;
export type IntegrationProfile = z.infer<typeof integrationProfileSchema>;

let _defaultStorePath: string;
function getDefaultStorePath(): string {
  if (!_defaultStorePath) {
    const ideonPaths = envPaths('ideon', { suffix: '' });
    _defaultStorePath = path.join(ideonPaths.config, 'agent-integrations.json');
  }
  return _defaultStorePath;
}

export interface InstalledAgentIntegration {
  runtime: SupportedAgentRuntime;
  installedAt: string;
  updatedAt: string;
  profile?: IntegrationProfile;
}

export async function getAgentIntegrationStorePath(): Promise<string> {
  return getDefaultStorePath();
}

export async function listInstalledAgentIntegrations(targetStorePath?: string): Promise<InstalledAgentIntegration[]> {
  const resolvedPath = targetStorePath ?? getDefaultStorePath();
  const store = await readStore(resolvedPath);
  const entries = Object.values(store.integrations);
  entries.sort((a, b) => a.runtime.localeCompare(b.runtime));
  return entries;
}

export async function getInstalledAgentIntegration(
  runtime: SupportedAgentRuntime,
  targetStorePath?: string,
): Promise<InstalledAgentIntegration | undefined> {
  const resolvedPath = targetStorePath ?? getDefaultStorePath();
  const store = await readStore(resolvedPath);
  return store.integrations[runtime];
}

export async function installAgentIntegration(
  runtime: SupportedAgentRuntime,
  profile?: IntegrationProfile,
  targetStorePath?: string,
): Promise<InstalledAgentIntegration> {
  const resolvedPath = targetStorePath ?? getDefaultStorePath();
  const nowIso = new Date().toISOString();
  const store = await readStore(resolvedPath);
  const existing = store.integrations[runtime];

  const nextEntry: InstalledAgentIntegration = {
    runtime,
    installedAt: existing?.installedAt ?? nowIso,
    updatedAt: nowIso,
    profile: profile ?? existing?.profile,
  };

  const nextStore: IntegrationStore = {
    ...store,
    integrations: {
      ...store.integrations,
      [runtime]: nextEntry,
    },
  };

  await writeStore(nextStore, resolvedPath);
  return nextEntry;
}

export async function uninstallAgentIntegration(
  runtime: SupportedAgentRuntime,
  targetStorePath?: string,
): Promise<boolean> {
  const resolvedPath = targetStorePath ?? getDefaultStorePath();
  const store = await readStore(resolvedPath);
  if (!store.integrations[runtime]) {
    return false;
  }

  const nextIntegrations = { ...store.integrations };
  delete nextIntegrations[runtime];

  const nextStore: IntegrationStore = {
    ...store,
    integrations: nextIntegrations,
  };

  await writeStore(nextStore, resolvedPath);
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
