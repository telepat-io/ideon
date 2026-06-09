import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import envPaths from 'env-paths';
import { readIdeonPackageVersion, resolveIdeonSkillDir } from './packageRoot.js';
import {
  mergeCodexTomlSection,
  mergeMarkerSection,
  mergeMcpServersEntry,
  mergeOpenCodeMcpEntry,
  mergeStringArrayEntry,
  mergeVsCodeMcpServer,
  removeCodexTomlSection,
  removeMarkerSection,
  removeMcpServersEntry,
  removeOpenCodeMcpEntry,
  removeStringArrayEntry,
  removeVsCodeMcpServer,
  IDEON_MANAGED_SERVER_KEY,
} from './installMerge.js';
import {
  CLAUDE_DESKTOP_SETUP_STEPS,
  CHATGPT_SETUP_STEPS,
  openCodeMcpServerEntry,
  piMcpServerEntry,
  stdioMcpServerEntry,
  vscodeMcpServerEntry,
} from './mcpConfig.js';
import { copySkillTree, installSkillLink, removeSkillLink } from './skillInstall.js';
import type {
  AgentInstallOptions,
  AgentUninstallOptions,
  InstallMutation,
  IntegrationProfile,
  RuntimeInstallResult,
  RuntimeStatusReport,
} from './types.js';
import type { SupportedAgentRuntime } from './store.js';
import { packClaudeDesktopMcpb } from './mcpb/pack.js';

const execFileAsync = promisify(execFile);

export interface RuntimeInstaller {
  install(options: AgentInstallOptions): Promise<RuntimeInstallResult>;
  uninstall(options: AgentUninstallOptions): Promise<void>;
  collectStatus(options: { homeDir: string; cwd: string; profile?: IntegrationProfile }): Promise<RuntimeStatusReport>;
}

function scopeRoot(options: Pick<AgentInstallOptions, 'project' | 'cwd' | 'homeDir'>): string {
  return options.project ? options.cwd : options.homeDir;
}

function buildProfile(
  options: AgentInstallOptions,
  managedPaths: string[],
  managedKeys: string[],
): IntegrationProfile {
  return {
    cliSkill: options.cliSkill,
    mcpSkill: options.mcpSkill,
    scope: options.project ? 'project' : 'global',
    managedPaths,
    managedKeys,
    toolId: 'ideon',
    integrationVersion: readIdeonPackageVersion(),
  };
}

function pushMutation(
  mutations: InstallMutation[],
  mutation: InstallMutation,
  options: AgentInstallOptions,
): void {
  mutations.push(mutation);
  if (mutation.action === 'skip') {
    options.warn(mutation.detail);
  } else if (mutation.action !== 'remove') {
    options.log(mutation.detail);
  }
}

async function installCliSkill(
  targetDir: string,
  options: AgentInstallOptions,
  mutations: InstallMutation[],
): Promise<void> {
  const source = resolveIdeonSkillDir('ideon-cli');
  const result = await installSkillLink(source, targetDir, { dryRun: options.dryRun, force: options.force });
  if (result.skipped) {
    pushMutation(mutations, { action: 'skip', path: targetDir, detail: result.reason ?? 'Skipped CLI skill install.' }, options);
    return;
  }
  if (result.changed) {
    pushMutation(mutations, {
      action: 'update',
      path: targetDir,
      detail: `[${result.method}] Linked ideon-cli skill to ${targetDir}`,
    }, options);
  }
}

async function installMcpSkill(
  targetDir: string,
  options: AgentInstallOptions,
  mutations: InstallMutation[],
): Promise<void> {
  const source = resolveIdeonSkillDir('ideon-mcp');
  const result = await installSkillLink(source, targetDir, { dryRun: options.dryRun, force: options.force });
  if (result.skipped) {
    pushMutation(mutations, { action: 'skip', path: targetDir, detail: result.reason ?? 'Skipped MCP skill install.' }, options);
    return;
  }
  if (result.changed) {
    pushMutation(mutations, {
      action: 'update',
      path: targetDir,
      detail: `[${result.method}] Linked ideon-mcp skill to ${targetDir}`,
    }, options);
  }
}

async function mergeStdioMcp(
  targetPath: string,
  options: AgentInstallOptions,
  mutations: InstallMutation[],
  entry: Record<string, unknown> = stdioMcpServerEntry(),
): Promise<void> {
  const result = await mergeMcpServersEntry(targetPath, entry, { force: options.force, dryRun: options.dryRun });
  if (result.skipped) {
    pushMutation(mutations, { action: 'skip', path: targetPath, detail: result.reason ?? 'Skipped MCP merge.' }, options);
    return;
  }
  if (result.changed) {
    pushMutation(mutations, {
      action: 'update',
      path: targetPath,
      detail: `Registered MCP server "${IDEON_MANAGED_SERVER_KEY}" in ${targetPath}`,
    }, options);
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function runPiMcpAdapterInstall(options: AgentInstallOptions, mutations: InstallMutation[]): Promise<void> {
  if (options.dryRun) {
    pushMutation(mutations, {
      action: 'update',
      path: 'pi-mcp-adapter',
      detail: '[dry-run] Would run: pi install npm:pi-mcp-adapter',
    }, options);
    return;
  }

    try {
    await execFileAsync('pi', ['install', 'npm:pi-mcp-adapter'], { timeout: 15_000 });
    pushMutation(mutations, {
      action: 'update',
      path: 'pi-mcp-adapter',
      detail: 'Installed pi-mcp-adapter via pi install',
    }, options);
  } catch (error) {
    options.warn(`Could not run pi install npm:pi-mcp-adapter: ${(error as Error).message}`);
  }
}

const cursorInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const root = scopeRoot(options);
    const skillBase = options.project ? path.join(root, '.cursor', 'skills') : path.join(root, '.cursor', 'skills');
    const mcpPath = options.project ? path.join(root, '.cursor', 'mcp.json') : path.join(root, '.cursor', 'mcp.json');
    const managedPaths: string[] = [];
    const managedKeys: string[] = [];

    if (options.cliSkill) {
      const target = path.join(skillBase, 'ideon-cli');
      await installCliSkill(target, options, mutations);
      managedPaths.push(target);
    }
    if (options.mcpSkill) {
      const target = path.join(skillBase, 'ideon-mcp');
      await installMcpSkill(target, options, mutations);
      await mergeStdioMcp(mcpPath, options, mutations);
      managedPaths.push(target, mcpPath);
      managedKeys.push(`mcpServers.${IDEON_MANAGED_SERVER_KEY}`);
    }

    return { profile: buildProfile(options, managedPaths, managedKeys), mutations };
  },
  async uninstall(options) {
    const root = scopeRoot(options);
    const skillBase = path.join(root, '.cursor', 'skills');
    const mcpPath = path.join(root, '.cursor', 'mcp.json');
    if (!options.dryRun) {
      await removeSkillLink(path.join(skillBase, 'ideon-cli'), options);
      await removeSkillLink(path.join(skillBase, 'ideon-mcp'), options);
      await removeMcpServersEntry(mcpPath, options);
    }
  },
  async collectStatus({ homeDir, cwd, profile }) {
    const scope = profile?.scope ?? 'global';
    const root = scope === 'project' ? cwd : homeDir;
    const cliPath = path.join(root, '.cursor', 'skills', 'ideon-cli');
    const mcpSkillPath = path.join(root, '.cursor', 'skills', 'ideon-mcp');
    const mcpPath = path.join(root, '.cursor', 'mcp.json');
    return {
      runtime: 'cursor',
      profile,
      artifacts: [
        { path: cliPath, expected: 'ideon-cli skill', status: (await pathExists(cliPath)) ? 'ok' : 'missing' },
        { path: mcpSkillPath, expected: 'ideon-mcp skill', status: (await pathExists(mcpSkillPath)) ? 'ok' : 'missing' },
        { path: mcpPath, expected: 'mcpServers.ideon', status: (await pathExists(mcpPath)) ? 'ok' : 'missing' },
      ],
      issues: [],
      readiness: {
        cliSkillLinked: await pathExists(cliPath),
        mcpSkillLinked: await pathExists(mcpSkillPath),
        mcpConfigured: await pathExists(mcpPath),
      },
    };
  },
};

const genericMcpInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const mcpPath = path.join(options.homeDir, '.config', 'mcp', 'mcp.json');
    await mergeStdioMcp(mcpPath, options, mutations);
    return {
      profile: buildProfile({ ...options, cliSkill: false, mcpSkill: true }, [mcpPath], [`mcpServers.${IDEON_MANAGED_SERVER_KEY}`]),
      mutations,
    };
  },
  async uninstall(options) {
    const mcpPath = path.join(options.homeDir, '.config', 'mcp', 'mcp.json');
    if (!options.dryRun) {
      await removeMcpServersEntry(mcpPath, options);
    }
  },
  async collectStatus({ homeDir, profile }) {
    const mcpPath = path.join(homeDir, '.config', 'mcp', 'mcp.json');
    return {
      runtime: 'generic-mcp',
      profile,
      artifacts: [{ path: mcpPath, expected: 'mcpServers.ideon', status: (await pathExists(mcpPath)) ? 'ok' : 'missing' }],
      issues: [],
      readiness: { mcpConfigured: await pathExists(mcpPath) },
    };
  },
};

const piInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const root = scopeRoot(options);
    const settingsPath = options.project
      ? path.join(root, '.pi', 'settings.json')
      : path.join(root, '.pi', 'agent', 'settings.json');
    const mcpPath = options.project
      ? path.join(root, '.pi', 'mcp.json')
      : path.join(root, '.pi', 'agent', 'mcp.json');
    const managedPaths: string[] = [];
    const managedKeys: string[] = [];

    if (options.cliSkill) {
      const skillPath = resolveIdeonSkillDir('ideon-cli');
      const merge = await mergeStringArrayEntry(settingsPath, 'skills', skillPath, {
        force: options.force,
        dryRun: options.dryRun,
      });
      if (merge.skipped) {
        pushMutation(mutations, { action: 'skip', path: settingsPath, detail: merge.reason ?? 'Skipped Pi skills merge.' }, options);
      } else if (merge.changed) {
        pushMutation(mutations, { action: 'update', path: settingsPath, detail: `Added ideon-cli skill path to Pi settings` }, options);
      }
      managedPaths.push(settingsPath);
    }

    if (options.mcpSkill) {
      await runPiMcpAdapterInstall(options, mutations);
      const skillPath = resolveIdeonSkillDir('ideon-mcp');
      const merge = await mergeStringArrayEntry(settingsPath, 'skills', skillPath, {
        force: options.force,
        dryRun: options.dryRun,
      });
      if (merge.skipped) {
        pushMutation(mutations, { action: 'skip', path: settingsPath, detail: merge.reason ?? 'Skipped Pi MCP skill path.' }, options);
      } else if (merge.changed) {
        pushMutation(mutations, { action: 'update', path: settingsPath, detail: `Added ideon-mcp skill path to Pi settings` }, options);
      }
      await mergeStdioMcp(mcpPath, options, mutations, piMcpServerEntry());
      managedPaths.push(settingsPath, mcpPath);
      managedKeys.push(`mcpServers.${IDEON_MANAGED_SERVER_KEY}`);
    }

    return { profile: buildProfile(options, managedPaths, managedKeys), mutations };
  },
  async uninstall(options) {
    const root = scopeRoot(options);
    const settingsPath = options.project
      ? path.join(root, '.pi', 'settings.json')
      : path.join(root, '.pi', 'agent', 'settings.json');
    const mcpPath = options.project
      ? path.join(root, '.pi', 'mcp.json')
      : path.join(root, '.pi', 'agent', 'mcp.json');
    if (!options.dryRun) {
      await removeStringArrayEntry(settingsPath, 'skills', resolveIdeonSkillDir('ideon-cli'), options);
      await removeStringArrayEntry(settingsPath, 'skills', resolveIdeonSkillDir('ideon-mcp'), options);
      await removeMcpServersEntry(mcpPath, options);
    }
  },
  async collectStatus({ homeDir, cwd, profile }) {
    const scope = profile?.scope ?? 'global';
    const root = scope === 'project' ? cwd : homeDir;
    const settingsPath = scope === 'project'
      ? path.join(root, '.pi', 'settings.json')
      : path.join(root, '.pi', 'agent', 'settings.json');
    const mcpPath = scope === 'project' ? path.join(root, '.pi', 'mcp.json') : path.join(root, '.pi', 'agent', 'mcp.json');
    let piBinaryOnPath = false;
    try {
      await execFileAsync('pi', ['--version'], { timeout: 5_000 });
      piBinaryOnPath = true;
    } catch {
      piBinaryOnPath = false;
    }
    return {
      runtime: 'pi',
      profile,
      artifacts: [
        { path: settingsPath, expected: 'skills path', status: (await pathExists(settingsPath)) ? 'ok' : 'missing' },
        { path: mcpPath, expected: 'mcpServers.ideon', status: (await pathExists(mcpPath)) ? 'ok' : 'missing' },
      ],
      issues: piBinaryOnPath ? [] : [{ code: 'pi-missing', message: 'pi binary not found on PATH', fixHint: 'npm install -g --ignore-scripts @earendil-works/pi-coding-agent' }],
      readiness: {
        piBinaryOnPath,
        cliSkillLinked: await pathExists(settingsPath),
        mcpConfigured: await pathExists(mcpPath),
      },
    };
  },
};

function agentsSkillInstaller(runtime: SupportedAgentRuntime, skillDirParts: string[]): RuntimeInstaller {
  return {
    async install(options) {
      const mutations: InstallMutation[] = [];
      const root = scopeRoot(options);
      const managedPaths: string[] = [];
      const managedKeys: string[] = [];

      if (options.cliSkill) {
        const target = path.join(root, ...skillDirParts, 'ideon-cli');
        await installCliSkill(target, options, mutations);
        managedPaths.push(target);
      }
      if (options.mcpSkill) {
        const target = path.join(root, ...skillDirParts, 'ideon-mcp');
        await installMcpSkill(target, options, mutations);
        managedPaths.push(target);
      }

      return { profile: buildProfile(options, managedPaths, managedKeys), mutations };
    },
    async uninstall(options) {
      const root = scopeRoot(options);
      if (!options.dryRun) {
        await removeSkillLink(path.join(root, ...skillDirParts, 'ideon-cli'), options);
        await removeSkillLink(path.join(root, ...skillDirParts, 'ideon-mcp'), options);
      }
    },
    async collectStatus({ homeDir, cwd, profile }) {
      const scope = profile?.scope ?? 'global';
      const root = scope === 'project' ? cwd : homeDir;
      const cliPath = path.join(root, ...skillDirParts, 'ideon-cli');
      const mcpSkillPath = path.join(root, ...skillDirParts, 'ideon-mcp');
      return {
        runtime,
        profile,
        artifacts: [
          { path: cliPath, expected: 'ideon-cli skill', status: (await pathExists(cliPath)) ? 'ok' : 'missing' },
          { path: mcpSkillPath, expected: 'ideon-mcp skill', status: (await pathExists(mcpSkillPath)) ? 'ok' : 'missing' },
        ],
        issues: [],
        readiness: {
          cliSkillLinked: await pathExists(cliPath),
          mcpSkillLinked: await pathExists(mcpSkillPath),
        },
      };
    },
  };
}

const claudeInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const root = scopeRoot(options);
    const skillParts = options.project ? ['.claude', 'skills'] : ['.claude', 'skills'];
    const managedPaths: string[] = [];
    const managedKeys: string[] = [];
    const mcpPath = path.join(root, '.mcp.json');

    if (options.cliSkill) {
      const target = path.join(root, ...skillParts, 'ideon-cli');
      await installCliSkill(target, options, mutations);
      managedPaths.push(target);
      const markerPath = path.join(options.project ? options.cwd : options.cwd, 'CLAUDE.md');
      const marker = await mergeMarkerSection(
        markerPath,
        '- Use the ideon-cli skill for Ideon CLI workflows.\n- Run `ideon agent status --json` to verify integration readiness.',
        { force: options.force, dryRun: options.dryRun },
      );
      if (marker.skipped) {
        pushMutation(mutations, { action: 'skip', path: markerPath, detail: marker.reason ?? 'Skipped CLAUDE.md marker.' }, options);
      } else if (marker.changed) {
        pushMutation(mutations, { action: 'update', path: markerPath, detail: 'Updated CLAUDE.md Ideon marker section' }, options);
        managedPaths.push(markerPath);
      }
    }
    if (options.mcpSkill) {
      const target = path.join(root, ...skillParts, 'ideon-mcp');
      await installMcpSkill(target, options, mutations);
      await mergeStdioMcp(mcpPath, options, mutations);
      managedPaths.push(target, mcpPath);
      managedKeys.push(`mcpServers.${IDEON_MANAGED_SERVER_KEY}`);
    }

    return { profile: buildProfile(options, managedPaths, managedKeys), mutations };
  },
  async uninstall(options) {
    const root = scopeRoot(options);
    if (!options.dryRun) {
      await removeSkillLink(path.join(root, '.claude', 'skills', 'ideon-cli'), options);
      await removeSkillLink(path.join(root, '.claude', 'skills', 'ideon-mcp'), options);
      await removeMcpServersEntry(path.join(root, '.mcp.json'), options);
      await removeMarkerSection(path.join(options.cwd, 'CLAUDE.md'), options);
    }
  },
  async collectStatus(ctx) {
    const base = await agentsSkillInstaller('claude', ['.claude', 'skills']).collectStatus(ctx);
    return { ...base, runtime: 'claude' };
  },
};

const codexInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const root = scopeRoot(options);
    const configPath = path.join(root, '.codex', 'config.toml');
    const skillTarget = path.join(root, '.agents', 'skills', 'ideon-cli');
    const mcpSkillTarget = path.join(root, '.agents', 'skills', 'ideon-mcp');
    const managedPaths: string[] = [];
    const managedKeys: string[] = [];

    if (options.cliSkill) {
      await installCliSkill(skillTarget, options, mutations);
      managedPaths.push(skillTarget);
    }
    if (options.mcpSkill) {
      await installMcpSkill(mcpSkillTarget, options, mutations);
      const merge = await mergeCodexTomlSection(configPath, { force: options.force, dryRun: options.dryRun });
      if (merge.skipped) {
        pushMutation(mutations, { action: 'skip', path: configPath, detail: merge.reason ?? 'Skipped Codex MCP section.' }, options);
      } else if (merge.changed) {
        pushMutation(mutations, { action: 'update', path: configPath, detail: 'Added [mcp_servers.ideon] to Codex config' }, options);
      }
      managedPaths.push(mcpSkillTarget, configPath);
      managedKeys.push('mcp_servers.ideon');
    }

    return { profile: buildProfile(options, managedPaths, managedKeys), mutations };
  },
  async uninstall(options) {
    const root = scopeRoot(options);
    if (!options.dryRun) {
      await removeSkillLink(path.join(root, '.agents', 'skills', 'ideon-cli'), options);
      await removeSkillLink(path.join(root, '.agents', 'skills', 'ideon-mcp'), options);
      await removeCodexTomlSection(path.join(root, '.codex', 'config.toml'), options);
    }
  },
  async collectStatus(ctx) {
    const base = await agentsSkillInstaller('codex', ['.agents', 'skills']).collectStatus(ctx);
    return { ...base, runtime: 'codex' };
  },
};

const opencodeInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const root = scopeRoot(options);
    const configPath = options.project ? path.join(root, 'opencode.json') : path.join(root, '.config', 'opencode', 'opencode.json');
    const skillParts = options.project ? ['.opencode', 'skills'] : ['.config', 'opencode', 'skills'];
    const managedPaths: string[] = [];
    const managedKeys: string[] = [];

    if (options.cliSkill) {
      const target = path.join(root, ...skillParts, 'ideon-cli');
      await installCliSkill(target, options, mutations);
      managedPaths.push(target);
    }
    if (options.mcpSkill) {
      const target = path.join(root, ...skillParts, 'ideon-mcp');
      await installMcpSkill(target, options, mutations);
      const merge = await mergeOpenCodeMcpEntry(configPath, openCodeMcpServerEntry(), {
        force: options.force,
        dryRun: options.dryRun,
      });
      if (merge.skipped) {
        pushMutation(mutations, { action: 'skip', path: configPath, detail: merge.reason ?? 'Skipped OpenCode MCP merge.' }, options);
      } else if (merge.changed) {
        pushMutation(mutations, { action: 'update', path: configPath, detail: 'Registered mcp.ideon in opencode.json' }, options);
      }
      managedPaths.push(target, configPath);
      managedKeys.push(`mcp.${IDEON_MANAGED_SERVER_KEY}`);
    }

    return { profile: buildProfile(options, managedPaths, managedKeys), mutations };
  },
  async uninstall(options) {
    const root = scopeRoot(options);
    const configPath = options.project ? path.join(root, 'opencode.json') : path.join(root, '.config', 'opencode', 'opencode.json');
    if (!options.dryRun) {
      await removeSkillLink(path.join(root, '.opencode', 'skills', 'ideon-cli'), options);
      await removeSkillLink(path.join(root, '.config', 'opencode', 'skills', 'ideon-cli'), options);
      await removeSkillLink(path.join(root, '.opencode', 'skills', 'ideon-mcp'), options);
      await removeSkillLink(path.join(root, '.config', 'opencode', 'skills', 'ideon-mcp'), options);
      await removeOpenCodeMcpEntry(configPath, options);
    }
  },
  async collectStatus({ homeDir, cwd, profile }) {
    const scope = profile?.scope ?? 'global';
    const root = scope === 'project' ? cwd : homeDir;
    const configPath = scope === 'project' ? path.join(root, 'opencode.json') : path.join(root, '.config', 'opencode', 'opencode.json');
    return {
      runtime: 'opencode',
      profile,
      artifacts: [{ path: configPath, expected: 'mcp.ideon', status: (await pathExists(configPath)) ? 'ok' : 'missing' }],
      issues: [],
      readiness: { mcpConfigured: await pathExists(configPath) },
    };
  },
};

const vscodeInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const root = scopeRoot(options);
    const skillParts = options.project ? ['.github', 'skills'] : ['.copilot', 'skills'];
    const mcpPath = options.project ? path.join(root, '.vscode', 'mcp.json') : path.join(root, '.vscode', 'mcp.json');
    const managedPaths: string[] = [];
    const managedKeys: string[] = [];

    if (options.cliSkill) {
      const target = path.join(root, ...skillParts, 'ideon-cli');
      await installCliSkill(target, options, mutations);
      managedPaths.push(target);
    }
    if (options.mcpSkill) {
      const target = path.join(root, ...skillParts, 'ideon-mcp');
      await installMcpSkill(target, options, mutations);
      const merge = await mergeVsCodeMcpServer(mcpPath, vscodeMcpServerEntry(), {
        force: options.force,
        dryRun: options.dryRun,
      });
      if (merge.skipped) {
        pushMutation(mutations, { action: 'skip', path: mcpPath, detail: merge.reason ?? 'Skipped VS Code MCP merge.' }, options);
      } else if (merge.changed) {
        pushMutation(mutations, { action: 'update', path: mcpPath, detail: 'Registered servers.ideon in VS Code mcp.json' }, options);
      }
      managedPaths.push(target, mcpPath);
      managedKeys.push(`servers.${IDEON_MANAGED_SERVER_KEY}`);
    }

    return { profile: buildProfile(options, managedPaths, managedKeys), mutations };
  },
  async uninstall(options) {
    const root = scopeRoot(options);
    if (!options.dryRun) {
      await removeSkillLink(path.join(root, '.github', 'skills', 'ideon-cli'), options);
      await removeSkillLink(path.join(root, '.copilot', 'skills', 'ideon-cli'), options);
      await removeSkillLink(path.join(root, '.github', 'skills', 'ideon-mcp'), options);
      await removeSkillLink(path.join(root, '.copilot', 'skills', 'ideon-mcp'), options);
      await removeVsCodeMcpServer(path.join(root, '.vscode', 'mcp.json'), options);
    }
  },
  async collectStatus({ homeDir, cwd, profile }) {
    const scope = profile?.scope ?? 'global';
    const root = scope === 'project' ? cwd : homeDir;
    const mcpPath = path.join(root, '.vscode', 'mcp.json');
    return {
      runtime: 'vscode',
      profile,
      artifacts: [{ path: mcpPath, expected: 'servers.ideon', status: (await pathExists(mcpPath)) ? 'ok' : 'missing' }],
      issues: [],
      readiness: { mcpConfigured: await pathExists(mcpPath) },
    };
  },
};

const geminiInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const root = scopeRoot(options);
    const skillTarget = path.join(root, '.agents', 'skills', 'ideon-cli');
    const mcpSkillTarget = path.join(root, '.agents', 'skills', 'ideon-mcp');
    const mcpPath = path.join(root, '.gemini', 'mcp.json');
    const managedPaths: string[] = [];
    const managedKeys: string[] = [];

    if (options.cliSkill) {
      await installCliSkill(skillTarget, options, mutations);
      const markerPath = path.join(options.cwd, 'GEMINI.md');
      await mergeMarkerSection(markerPath, '- Use ideon-cli skill for Ideon content workflows.', {
        force: options.force,
        dryRun: options.dryRun,
      });
      managedPaths.push(skillTarget);
    }
    if (options.mcpSkill) {
      await installMcpSkill(mcpSkillTarget, options, mutations);
      await mergeStdioMcp(mcpPath, options, mutations);
      managedPaths.push(mcpSkillTarget, mcpPath);
      managedKeys.push(`mcpServers.${IDEON_MANAGED_SERVER_KEY}`);
    }

    return { profile: buildProfile(options, managedPaths, managedKeys), mutations };
  },
  async uninstall(options) {
    const root = scopeRoot(options);
    if (!options.dryRun) {
      await removeSkillLink(path.join(root, '.agents', 'skills', 'ideon-cli'), options);
      await removeSkillLink(path.join(root, '.agents', 'skills', 'ideon-mcp'), options);
      await removeMcpServersEntry(path.join(root, '.gemini', 'mcp.json'), options);
      await removeMarkerSection(path.join(options.cwd, 'GEMINI.md'), options);
    }
  },
  async collectStatus(ctx) {
    const base = await agentsSkillInstaller('gemini', ['.agents', 'skills']).collectStatus(ctx);
    return { ...base, runtime: 'gemini' };
  },
};

const chatgptInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const ideonPaths = envPaths('ideon', { suffix: '' });
    const exportRoot = path.join(ideonPaths.data, 'exports', 'chatgpt');
    const managedPaths: string[] = [];

    if (options.cliSkill) {
      const target = path.join(exportRoot, 'ideon-cli');
      const result = await copySkillTree(resolveIdeonSkillDir('ideon-cli'), target, {
        dryRun: options.dryRun,
        force: options.force,
      });
      if (result.skipped) {
        pushMutation(mutations, { action: 'skip', path: target, detail: result.reason ?? 'Skipped ChatGPT export.' }, options);
      } else {
        pushMutation(mutations, { action: 'update', path: target, detail: `Exported ideon-cli skill to ${target}` }, options);
        managedPaths.push(target);
      }
    }
    if (options.mcpSkill) {
      const target = path.join(exportRoot, 'ideon-mcp');
      const result = await copySkillTree(resolveIdeonSkillDir('ideon-mcp'), target, {
        dryRun: options.dryRun,
        force: options.force,
      });
      if (result.skipped) {
        pushMutation(mutations, { action: 'skip', path: target, detail: result.reason ?? 'Skipped ChatGPT MCP export.' }, options);
      } else {
        pushMutation(mutations, { action: 'update', path: target, detail: `Exported ideon-mcp skill to ${target}` }, options);
        managedPaths.push(target);
      }
    }

    for (const step of CHATGPT_SETUP_STEPS) {
      options.log(`ChatGPT setup: ${step}`);
    }

    return { profile: buildProfile(options, managedPaths, []), mutations };
  },
  async uninstall(options) {
    const ideonPaths = envPaths('ideon', { suffix: '' });
    const exportRoot = path.join(ideonPaths.data, 'exports', 'chatgpt');
    if (!options.dryRun) {
      await removeSkillLink(path.join(exportRoot, 'ideon-cli'), options);
      await removeSkillLink(path.join(exportRoot, 'ideon-mcp'), options);
    }
  },
  async collectStatus({ profile }) {
    const ideonPaths = envPaths('ideon', { suffix: '' });
    const exportRoot = path.join(ideonPaths.data, 'exports', 'chatgpt');
    return {
      runtime: 'chatgpt',
      profile,
      artifacts: [{ path: exportRoot, expected: 'exported skills', status: (await pathExists(exportRoot)) ? 'ok' : 'missing' }],
      issues: [],
      readiness: { exportPresent: await pathExists(exportRoot) },
    };
  },
};

const claudeDesktopInstaller: RuntimeInstaller = {
  async install(options) {
    const mutations: InstallMutation[] = [];
    const ideonPaths = envPaths('ideon', { suffix: '' });
    const exportRoot = path.join(ideonPaths.data, 'exports', 'claude-desktop');
    const managedPaths: string[] = [];

    if (options.cliSkill) {
      const target = path.join(exportRoot, 'ideon-cli');
      const result = await copySkillTree(resolveIdeonSkillDir('ideon-cli'), target, {
        dryRun: options.dryRun,
        force: options.force,
      });
      if (result.skipped) {
        pushMutation(mutations, { action: 'skip', path: target, detail: result.reason ?? 'Skipped export.' }, options);
      } else {
        pushMutation(mutations, { action: 'update', path: target, detail: `Exported ideon-cli skill to ${target}` }, options);
        managedPaths.push(target);
      }
    }
    if (options.mcpSkill) {
      const bundlePath = await packClaudeDesktopMcpb({ dryRun: options.dryRun, force: options.force });
      pushMutation(mutations, {
        action: 'update',
        path: bundlePath,
        detail: `Packed Claude Desktop MCP bundle at ${bundlePath}`,
      }, options);
      managedPaths.push(bundlePath);
      for (const step of CLAUDE_DESKTOP_SETUP_STEPS) {
        options.log(`Claude Desktop setup: ${step}`);
      }
    }

    return { profile: buildProfile(options, managedPaths, []), mutations };
  },
  async uninstall(options) {
    const ideonPaths = envPaths('ideon', { suffix: '' });
    const bundlePath = path.join(ideonPaths.data, 'mcpb', 'ideon.mcpb');
    if (!options.dryRun) {
      await removeSkillLink(path.join(ideonPaths.data, 'exports', 'claude-desktop', 'ideon-cli'), options);
      await removeSkillLink(bundlePath, options);
    }
  },
  async collectStatus({ profile }) {
    const ideonPaths = envPaths('ideon', { suffix: '' });
    const bundlePath = path.join(ideonPaths.data, 'mcpb', 'ideon.mcpb');
    return {
      runtime: 'claude-desktop',
      profile,
      artifacts: [{ path: bundlePath, expected: 'ideon.mcpb', status: (await pathExists(bundlePath)) ? 'ok' : 'missing' }],
      issues: [],
      readiness: { mcpbPresent: await pathExists(bundlePath) },
    };
  },
};

const INSTALLERS: Record<SupportedAgentRuntime, RuntimeInstaller> = {
  claude: claudeInstaller,
  'claude-desktop': claudeDesktopInstaller,
  chatgpt: chatgptInstaller,
  gemini: geminiInstaller,
  codex: codexInstaller,
  cursor: cursorInstaller,
  vscode: vscodeInstaller,
  opencode: opencodeInstaller,
  'generic-mcp': genericMcpInstaller,
  pi: piInstaller,
};

export function getRuntimeInstaller(runtime: SupportedAgentRuntime): RuntimeInstaller {
  return INSTALLERS[runtime];
}

export async function installAgentRuntime(options: AgentInstallOptions): Promise<RuntimeInstallResult> {
  return getRuntimeInstaller(options.runtime).install(options);
}

export async function uninstallAgentRuntime(options: AgentUninstallOptions): Promise<void> {
  await getRuntimeInstaller(options.runtime).uninstall(options);
}

export async function collectRuntimeStatus(
  runtime: SupportedAgentRuntime,
  options: { homeDir: string; cwd: string; profile?: IntegrationProfile },
): Promise<RuntimeStatusReport> {
  return getRuntimeInstaller(runtime).collectStatus(options);
}
