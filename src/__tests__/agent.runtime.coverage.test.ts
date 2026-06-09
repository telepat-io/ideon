import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packClaudeDesktopMcpb } from '../integrations/agent/mcpb/pack.js';
import {
  mergeCodexTomlSection,
  mergeOpenCodeMcpEntry,
  mergeStringArrayEntry,
  mergeVsCodeMcpServer,
  removeCodexTomlSection,
  removeOpenCodeMcpEntry,
  removeStringArrayEntry,
  removeVsCodeMcpServer,
} from '../integrations/agent/installMerge.js';
import {
  collectRuntimeStatus,
  getRuntimeInstaller,
  installAgentRuntime,
  uninstallAgentRuntime,
} from '../integrations/agent/runtimeInstaller.js';
import { supportedAgentRuntimeValues } from '../integrations/agent/store.js';
import { copySkillTree } from '../integrations/agent/skillInstall.js';
import { resolveIdeonSkillDir } from '../integrations/agent/packageRoot.js';
import { openCodeMcpServerEntry, vscodeMcpServerEntry } from '../integrations/agent/mcpConfig.js';

describe('agent runtime coverage', () => {
  let homeDir = '';
  let projectDir = '';

  beforeEach(async () => {
    homeDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-home-'));
    projectDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-project-'));
  });

  afterEach(async () => {
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  });

  it('dry-runs all runtime installers for cli and mcp modes', async () => {
    for (const runtime of supportedAgentRuntimeValues) {
      if (runtime === 'generic-mcp') {
        await installAgentRuntime({
          runtime,
          cliSkill: false,
          mcpSkill: true,
          force: false,
          project: false,
          dryRun: true,
          cwd: projectDir,
          homeDir,
          log: () => {},
          warn: () => {},
        });
        continue;
      }

      await installAgentRuntime({
        runtime,
        cliSkill: true,
        mcpSkill: false,
        force: false,
        project: false,
        dryRun: true,
        cwd: projectDir,
        homeDir,
        log: () => {},
        warn: () => {},
      });

      await installAgentRuntime({
        runtime,
        cliSkill: false,
        mcpSkill: true,
        force: false,
        project: false,
        dryRun: true,
        cwd: projectDir,
        homeDir,
        log: () => {},
        warn: () => {},
      });
    }
  });

  it('installs chatgpt and claude-desktop export flows', async () => {
    for (const runtime of ['chatgpt', 'claude-desktop'] as const) {
      await installAgentRuntime({
        runtime,
        cliSkill: true,
        mcpSkill: runtime === 'claude-desktop',
        force: true,
        project: false,
        dryRun: false,
        cwd: projectDir,
        homeDir,
        log: () => {},
        warn: () => {},
      });
    }
  });

  it('installs and uninstalls mcp mode for json runtimes except pi subprocess', async () => {
    const runtimes = ['cursor', 'vscode', 'opencode', 'gemini', 'claude', 'codex'] as const;
    for (const runtime of runtimes) {
      const projectScoped = runtime === 'vscode' || runtime === 'opencode';
      await installAgentRuntime({
        runtime,
        cliSkill: false,
        mcpSkill: true,
        force: true,
        project: projectScoped,
        dryRun: false,
        cwd: projectDir,
        homeDir,
        log: () => {},
        warn: () => {},
      });

      await collectRuntimeStatus(runtime, {
        homeDir,
        cwd: projectDir,
        profile: {
          cliSkill: false,
          mcpSkill: true,
          scope: projectScoped ? 'project' : 'global',
          managedPaths: [],
          managedKeys: [],
          toolId: 'ideon',
          integrationVersion: '0.0.0',
        },
      });

      await uninstallAgentRuntime({
        runtime,
        project: projectScoped,
        dryRun: false,
        cwd: projectDir,
        homeDir,
        log: () => {},
        warn: () => {},
      });
    }
  });

  it('covers merge helpers and removals', async () => {
    const vscodePath = path.join(projectDir, '.vscode', 'mcp.json');
    const opencodePath = path.join(projectDir, 'opencode.json');
    const codexPath = path.join(homeDir, '.codex', 'config.toml');
    const settingsPath = path.join(homeDir, '.pi', 'agent', 'settings.json');

    await mergeVsCodeMcpServer(vscodePath, vscodeMcpServerEntry(), { force: false, dryRun: false });
    await mergeOpenCodeMcpEntry(opencodePath, openCodeMcpServerEntry(), { force: false, dryRun: false });
    await mergeCodexTomlSection(codexPath, { force: false, dryRun: false });
    await mergeStringArrayEntry(settingsPath, 'skills', resolveIdeonSkillDir('ideon-cli'), { force: false, dryRun: false });

    await removeVsCodeMcpServer(vscodePath, { dryRun: false });
    await removeOpenCodeMcpEntry(opencodePath, { dryRun: false });
    await removeCodexTomlSection(codexPath, { dryRun: false });
    await removeStringArrayEntry(settingsPath, 'skills', resolveIdeonSkillDir('ideon-cli'), { dryRun: false });
  });

  it('packs claude desktop bundle and copies export skills', async () => {
    const bundlePath = await packClaudeDesktopMcpb({ dryRun: false, force: true });
    await access(bundlePath);

    const target = path.join(homeDir, 'export', 'ideon-cli');
    await copySkillTree(resolveIdeonSkillDir('ideon-cli'), target, { dryRun: false, force: true });
    await readFile(path.join(target, 'SKILL.md'), 'utf8');
  });

  it('collects status for every supported runtime', async () => {
    for (const runtime of supportedAgentRuntimeValues) {
      const report = await getRuntimeInstaller(runtime).collectStatus({ homeDir, cwd: projectDir });
      expect(report.runtime).toBe(runtime);
    }
  });

  it('reports pi runtime status checks', async () => {
    const report = await collectRuntimeStatus('pi', {
      homeDir,
      cwd: projectDir,
      profile: {
        cliSkill: true,
        mcpSkill: false,
        scope: 'global',
        managedPaths: [],
        managedKeys: [],
        toolId: 'ideon',
        integrationVersion: '0.0.0',
      },
    });
    expect(report.runtime).toBe('pi');
    expect(typeof report.readiness.piBinaryOnPath).toBe('boolean');
  });

  it('installs gemini cli skill with marker section', async () => {
    await installAgentRuntime({
      runtime: 'gemini',
      cliSkill: true,
      mcpSkill: false,
      force: true,
      project: true,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    });
    await access(path.join(projectDir, 'GEMINI.md'));
  });

  it('installs and uninstalls cli mode for all skill-capable runtimes', async () => {
    const runtimes = supportedAgentRuntimeValues.filter(
      (runtime) => runtime !== 'generic-mcp' && runtime !== 'chatgpt' && runtime !== 'claude-desktop',
    );
    for (const runtime of runtimes) {
      await installAgentRuntime({
        runtime,
        cliSkill: true,
        mcpSkill: false,
        force: true,
        project: runtime === 'vscode' || runtime === 'opencode' || runtime === 'claude',
        dryRun: false,
        cwd: projectDir,
        homeDir,
        log: () => {},
        warn: () => {},
      });
      await uninstallAgentRuntime({
        runtime,
        project: runtime === 'vscode' || runtime === 'opencode' || runtime === 'claude',
        dryRun: false,
        cwd: projectDir,
        homeDir,
        log: () => {},
        warn: () => {},
      });
    }
  });

  it('is idempotent for generic-mcp reinstall', async () => {
    const options = {
      runtime: 'generic-mcp' as const,
      cliSkill: false,
      mcpSkill: true,
      force: false,
      project: false,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    };
    await installAgentRuntime(options);
    await installAgentRuntime(options);
  });

  it('warns when gemini mcp config conflicts', async () => {
    const mcpPath = path.join(homeDir, '.gemini', 'mcp.json');
    await mkdir(path.dirname(mcpPath), { recursive: true });
    await writeFile(mcpPath, JSON.stringify({ mcpServers: { ideon: { command: 'other' } } }), 'utf8');
    const warnings: string[] = [];
    await installAgentRuntime({
      runtime: 'gemini',
      cliSkill: false,
      mcpSkill: true,
      force: false,
      project: false,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: (message) => warnings.push(message),
    });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('uninstalls chatgpt export artifacts', async () => {
    await installAgentRuntime({
      runtime: 'chatgpt',
      cliSkill: true,
      mcpSkill: false,
      force: true,
      project: false,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    });
    await uninstallAgentRuntime({
      runtime: 'chatgpt',
      project: false,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    });
  });
});
