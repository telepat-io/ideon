import { ReportedError } from '../reportedError.js';
import {
  getAgentIntegrationStorePath,
  installAgentIntegration,
  listInstalledAgentIntegrations,
  supportedAgentRuntimeValues,
  uninstallAgentIntegration,
  type SupportedAgentRuntime,
} from '../../integrations/agent/store.js';
import { validateIntegrationContracts } from '../../integrations/sync-validator.js';
import { ideonToolContracts } from '../../integrations/mcp/tools.js';
import { ideonSkillRegistry } from '../../integrations/skills/registry.js';
import { isConfigKey } from '../../config/manage.js';

const unsupportedIdeRuntimeAliases = ['cursor', 'vscode'];

interface AgentCommandDependencies {
  install: typeof installAgentIntegration;
  uninstall: typeof uninstallAgentIntegration;
  list: typeof listInstalledAgentIntegrations;
  log: (message: string) => void;
  now: () => Date;
}

interface AgentStatus {
  installedRuntimes: SupportedAgentRuntime[];
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
  log: (message: string) => console.log(message),
  now: () => new Date(),
};

export async function runAgentInstallCommand(
  options: { runtime: string; dryRun: boolean },
  dependencies: Partial<AgentCommandDependencies> = {},
): Promise<void> {
  const deps = { ...defaultDependencies, ...dependencies };
  const runtime = parseRuntime(options.runtime);

  if (options.dryRun) {
    deps.log(`[dry-run] Would install agent integration for runtime: ${runtime}`);
    return;
  }

  const installed = await deps.install(runtime);
  deps.log(`Installed ${installed.runtime} integration.`);
}

export async function runAgentUninstallCommand(
  options: { runtime: string; dryRun: boolean },
  dependencies: Partial<AgentCommandDependencies> = {},
): Promise<void> {
  const deps = { ...defaultDependencies, ...dependencies };
  const runtime = parseRuntime(options.runtime);

  if (options.dryRun) {
    deps.log(`[dry-run] Would uninstall agent integration for runtime: ${runtime}`);
    return;
  }

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
}

async function collectAgentStatus(deps: AgentCommandDependencies): Promise<AgentStatus> {
  const installed = await deps.list();
  const drifts = validateIntegrationContracts();

  return {
    installedRuntimes: installed.map((entry) => entry.runtime),
    readiness: {
      syncCheckPassed: drifts.length === 0,
      syncDriftCount: drifts.length,
      mcpToolCount: ideonToolContracts.length,
      skillContractCount: ideonSkillRegistry.length,
      configSurfaceReady: isConfigKey('style') && isConfigKey('openRouterApiKey'),
    },
    metadata: {
      storePath: getAgentIntegrationStorePath(),
      checkedAt: deps.now().toISOString(),
    },
  };
}

function parseRuntime(rawRuntime: string): SupportedAgentRuntime {
  const runtime = rawRuntime.trim().toLowerCase();

  if (unsupportedIdeRuntimeAliases.includes(runtime)) {
    throw new ReportedError(
      `Unsupported runtime \"${rawRuntime}\". Ideon agent integration does not support Cursor or VS Code runtimes.`,
    );
  }

  if (!(supportedAgentRuntimeValues as readonly string[]).includes(runtime)) {
    throw new ReportedError(
      `Unsupported runtime \"${rawRuntime}\". Supported runtimes: ${supportedAgentRuntimeValues.join(', ')}.`,
    );
  }

  return runtime as SupportedAgentRuntime;
}
