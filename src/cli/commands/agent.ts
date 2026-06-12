import os from 'node:os';
import { ReportedError } from '../reportedError.js';
import {
  getAgentIntegrationStorePath,
  getInstalledAgentIntegration,
  installAgentIntegration,
  listInstalledAgentIntegrations,
  supportedAgentRuntimeValues,
  uninstallAgentIntegration,
  type SupportedAgentRuntime,
} from '../../integrations/agent/store.js';
import {
  collectRuntimeStatus,
  installAgentRuntime,
  uninstallAgentRuntime,
} from '../../integrations/agent/runtimeInstaller.js';
import { ideonToolContracts } from '../../integrations/mcp/tools.js';
import { ideonSkillRegistry } from '../../integrations/skills/registry.js';
import { isConfigKey } from '../../config/manage.js';
import type { RuntimeStatusReport } from '../../integrations/agent/types.js';
import { validateIntegrationContracts } from '../../integrations/sync-validator.js';

export interface AgentInstallCommandOptions {
  runtime: string;
  cliSkill: boolean;
  mcpSkill: boolean;
  force: boolean;
  project: boolean;
  dryRun: boolean;
}

export interface AgentUninstallCommandOptions {
  runtime: string;
  project: boolean;
  dryRun: boolean;
}

interface AgentCommandDependencies {
  install: typeof installAgentIntegration;
  uninstall: typeof uninstallAgentIntegration;
  list: typeof listInstalledAgentIntegrations;
  getInstalled: typeof getInstalledAgentIntegration;
  installRuntime: typeof installAgentRuntime;
  uninstallRuntime: typeof uninstallAgentRuntime;
  collectRuntimeStatus: typeof collectRuntimeStatus;
  log: (message: string) => void;
  warn: (message: string) => void;
  now: () => Date;
  homeDir: () => string;
  cwd: () => string;
}

interface AgentStatus {
  installedRuntimes: SupportedAgentRuntime[];
  runtimeReports: RuntimeStatusReport[];
  readiness: {
    syncCheckPassed: boolean;
    syncDriftCount: number;
    mcpToolCount: number;
    skillContractCount: number;
    configSurfaceReady: boolean;
  };
  metadata: {
    storePath: string;
    checkedAt: string;
  };
}

const defaultDependencies: AgentCommandDependencies = {
  install: installAgentIntegration,
  uninstall: uninstallAgentIntegration,
  list: listInstalledAgentIntegrations,
  getInstalled: getInstalledAgentIntegration,
  installRuntime: installAgentRuntime,
  uninstallRuntime: uninstallAgentRuntime,
  collectRuntimeStatus,
  log: (message: string) => console.log(message),
  warn: (message: string) => console.warn(message),
  now: () => new Date(),
  homeDir: () => os.homedir(),
  cwd: () => process.cwd(),
};

export async function runAgentInstallCommand(
  options: AgentInstallCommandOptions,
  dependencies: Partial<AgentCommandDependencies> = {},
): Promise<void> {
  const deps = { ...defaultDependencies, ...dependencies };
  const runtime = parseRuntime(options.runtime);
  assertHermesGlobalScope(runtime, options.project);
  const skillMode = resolveSkillMode(options, runtime);

  if (options.dryRun) {
    deps.log(`[dry-run] Would install agent integration for runtime: ${runtime}`);
  }

  const result = await deps.installRuntime({
    runtime,
    cliSkill: skillMode.cliSkill,
    mcpSkill: skillMode.mcpSkill,
    force: options.force,
    project: options.project,
    dryRun: options.dryRun,
    cwd: deps.cwd(),
    homeDir: deps.homeDir(),
    log: deps.log,
    warn: deps.warn,
  });

  if (!options.dryRun) {
    await deps.install(runtime, result.profile);
  }

  deps.log(`Installed ${runtime} integration.`);
}

export async function runAgentUninstallCommand(
  options: AgentUninstallCommandOptions,
  dependencies: Partial<AgentCommandDependencies> = {},
): Promise<void> {
  const deps = { ...defaultDependencies, ...dependencies };
  const runtime = parseRuntime(options.runtime);
  assertHermesGlobalScope(runtime, options.project);

  if (options.dryRun) {
    deps.log(`[dry-run] Would uninstall agent integration for runtime: ${runtime}`);
    return;
  }

  const existing = await deps.getInstalled(runtime);
  if (!existing) {
    throw new ReportedError(`No installed integration found for runtime: ${runtime}.`);
  }

  await deps.uninstallRuntime({
    runtime,
    project: options.project,
    dryRun: false,
    cwd: deps.cwd(),
    homeDir: deps.homeDir(),
    log: deps.log,
    warn: deps.warn,
  });

  const removed = await deps.uninstall(runtime);
  if (!removed) {
    throw new ReportedError(`No installed integration found for runtime: ${runtime}.`);
  }

  deps.log(`Uninstalled ${runtime} integration.`);
}

export async function runAgentStatusCommand(
  options: { json: boolean },
  dependencies: Partial<AgentCommandDependencies> = {},
): Promise<void> {
  const deps = { ...defaultDependencies, ...dependencies };
  const status = await collectAgentStatus(deps);

  if (options.json) {
    deps.log(JSON.stringify(status, null, 2));
    return;
  }

  deps.log(`Integration store: ${status.metadata.storePath}`);
  deps.log(`Checked at: ${status.metadata.checkedAt}`);

  if (status.installedRuntimes.length === 0) {
    deps.log('Installed runtimes: none');
  } else {
    deps.log(`Installed runtimes: ${status.installedRuntimes.join(', ')}`);
  }

  deps.log(`Readiness sync check: ${status.readiness.syncCheckPassed ? 'pass' : 'fail'}`);
  deps.log(`Readiness MCP tools: ${status.readiness.mcpToolCount}`);
  deps.log(`Readiness skill contracts: ${status.readiness.skillContractCount}`);
  deps.log(`Readiness config surface: ${status.readiness.configSurfaceReady ? 'ready' : 'incomplete'}`);

  for (const report of status.runtimeReports) {
    const issueCount = report.issues.length;
    deps.log(`Runtime ${report.runtime}: ${issueCount === 0 ? 'ok' : `${issueCount} issue(s)`}`);
  }
}

async function collectAgentStatus(deps: AgentCommandDependencies): Promise<AgentStatus> {
  const installed = await deps.list();
  const drifts = validateIntegrationContracts();
  const runtimeReports: RuntimeStatusReport[] = [];

  for (const entry of installed) {
    runtimeReports.push(await deps.collectRuntimeStatus(entry.runtime, {
      homeDir: deps.homeDir(),
      cwd: deps.cwd(),
      profile: entry.profile,
    }));
  }

  return {
    installedRuntimes: installed.map((entry) => entry.runtime),
    runtimeReports,
    readiness: {
      syncCheckPassed: drifts.length === 0,
      syncDriftCount: drifts.length,
      mcpToolCount: ideonToolContracts.length,
      skillContractCount: ideonSkillRegistry.length,
      configSurfaceReady: isConfigKey('style') && isConfigKey('openRouterApiKey'),
    },
    metadata: {
      storePath: await getAgentIntegrationStorePath(),
      checkedAt: deps.now().toISOString(),
    },
  };
}

function resolveSkillMode(
  options: AgentInstallCommandOptions,
  runtime: SupportedAgentRuntime,
): { cliSkill: boolean; mcpSkill: boolean } {
  if (runtime === 'generic-mcp') {
    return { cliSkill: false, mcpSkill: true };
  }

  if (options.cliSkill && options.mcpSkill) {
    throw new ReportedError('Cannot use --cli-skill and --mcp-skill together. Choose one surface.');
  }

  if (options.mcpSkill) {
    return { cliSkill: false, mcpSkill: true };
  }

  return { cliSkill: true, mcpSkill: false };
}

function assertHermesGlobalScope(runtime: SupportedAgentRuntime, project: boolean): void {
  if (runtime === 'hermes' && project) {
    throw new ReportedError('Hermes integration is global-only; omit --project.');
  }
}

function parseRuntime(rawRuntime: string): SupportedAgentRuntime {
  const runtime = rawRuntime.trim().toLowerCase();

  if (!(supportedAgentRuntimeValues as readonly string[]).includes(runtime)) {
    throw new ReportedError(
      `Unsupported runtime \"${rawRuntime}\". Supported runtimes: ${supportedAgentRuntimeValues.join(', ')}.`,
    );
  }

  return runtime as SupportedAgentRuntime;
}
