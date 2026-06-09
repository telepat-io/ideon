import type { SupportedAgentRuntime } from './store.js';

export type InstallScope = 'global' | 'project';

export interface AgentInstallOptions {
  runtime: SupportedAgentRuntime;
  cliSkill: boolean;
  mcpSkill: boolean;
  force: boolean;
  project: boolean;
  dryRun: boolean;
  cwd: string;
  homeDir: string;
  log: (message: string) => void;
  warn: (message: string) => void;
}

export interface AgentUninstallOptions {
  runtime: SupportedAgentRuntime;
  project: boolean;
  dryRun: boolean;
  cwd: string;
  homeDir: string;
  log: (message: string) => void;
  warn: (message: string) => void;
}

export interface IntegrationProfile {
  cliSkill: boolean;
  mcpSkill: boolean;
  scope: InstallScope;
  managedPaths: string[];
  managedKeys: string[];
  toolId: 'ideon';
  integrationVersion: string;
}

export interface InstallMutation {
  action: 'create' | 'update' | 'skip' | 'remove';
  path: string;
  detail: string;
}

export interface RuntimeInstallResult {
  profile: IntegrationProfile;
  mutations: InstallMutation[];
}

export type ArtifactStatus = 'ok' | 'missing' | 'conflict' | 'skipped';

export interface RuntimeArtifactCheck {
  path: string;
  expected: string;
  status: ArtifactStatus;
}

export interface RuntimeStatusIssue {
  code: string;
  message: string;
  fixHint?: string;
}

export interface RuntimeStatusReport {
  runtime: SupportedAgentRuntime;
  profile?: IntegrationProfile;
  artifacts: RuntimeArtifactCheck[];
  issues: RuntimeStatusIssue[];
  readiness: Record<string, boolean>;
}
