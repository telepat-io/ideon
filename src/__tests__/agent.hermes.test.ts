import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ReportedError } from '../cli/reportedError.js';
import {
  runAgentInstallCommand,
  runAgentUninstallCommand,
} from '../cli/commands/agent.js';
import {
  collectRuntimeStatus,
  installAgentRuntime,
  uninstallAgentRuntime,
} from '../integrations/agent/runtimeInstaller.js';

describe('hermes agent runtime', () => {
  let homeDir = '';
  let projectDir = '';
  let previousHermesHome: string | undefined;

  beforeEach(async () => {
    homeDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-home-'));
    projectDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-project-'));
    previousHermesHome = process.env.HERMES_HOME;
    delete process.env.HERMES_HOME;
  });

  afterEach(async () => {
    if (previousHermesHome === undefined) {
      delete process.env.HERMES_HOME;
    } else {
      process.env.HERMES_HOME = previousHermesHome;
    }
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  });

  it('installs cli skill into ~/.hermes/skills/ideon-cli', async () => {
    await installAgentRuntime({
      runtime: 'hermes',
      cliSkill: true,
      mcpSkill: false,
      force: false,
      project: false,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    });

    const skillPath = path.join(homeDir, '.hermes', 'skills', 'ideon-cli', 'SKILL.md');
    await access(skillPath);
  });

  it('installs mcp skill and merges config.yaml under HERMES_HOME', async () => {
    const hermesHome = await mkdtemp(path.join(os.tmpdir(), 'hermes-home-'));
    process.env.HERMES_HOME = hermesHome;
    const logs: string[] = [];

    try {
      await installAgentRuntime({
        runtime: 'hermes',
        cliSkill: false,
        mcpSkill: true,
        force: false,
        project: false,
        dryRun: false,
        cwd: projectDir,
        homeDir,
        log: (message) => logs.push(message),
        warn: () => {},
      });

      const skillPath = path.join(hermesHome, 'skills', 'ideon-mcp', 'SKILL.md');
      await access(skillPath);

      const configPath = path.join(hermesHome, 'config.yaml');
      const raw = parseYaml(await readFile(configPath, 'utf8')) as {
        mcp_servers?: Record<string, unknown>;
      };
      expect(raw.mcp_servers?.ideon).toEqual({ command: 'ideon', args: ['mcp', 'serve'] });
      expect(logs.some((entry) => entry.includes('/reload-mcp'))).toBe(true);
    } finally {
      await rm(hermesHome, { recursive: true, force: true });
    }
  });

  it('uninstalls hermes integration artifacts', async () => {
    await installAgentRuntime({
      runtime: 'hermes',
      cliSkill: false,
      mcpSkill: true,
      force: false,
      project: false,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    });

    await uninstallAgentRuntime({
      runtime: 'hermes',
      project: false,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    });

    const configPath = path.join(homeDir, '.hermes', 'config.yaml');
    const raw = parseYaml(await readFile(configPath, 'utf8')) as {
      mcp_servers?: Record<string, unknown>;
    };
    expect(raw.mcp_servers?.ideon).toBeUndefined();
  });

  it('rejects --project at install time', async () => {
    await expect(
      installAgentRuntime({
        runtime: 'hermes',
        cliSkill: true,
        mcpSkill: false,
        force: false,
        project: true,
        dryRun: false,
        cwd: projectDir,
        homeDir,
        log: () => {},
        warn: () => {},
      }),
    ).rejects.toThrow('Hermes integration is global-only; omit --project.');
  });

  it('rejects --project in install command before dry-run', async () => {
    await expect(
      runAgentInstallCommand({
        runtime: 'hermes',
        cliSkill: false,
        mcpSkill: false,
        force: false,
        project: true,
        dryRun: true,
      }),
    ).rejects.toBeInstanceOf(ReportedError);
  });

  it('rejects --project in uninstall command', async () => {
    await expect(
      runAgentUninstallCommand({
        runtime: 'hermes',
        project: true,
        dryRun: false,
      }),
    ).rejects.toBeInstanceOf(ReportedError);
  });

  it('reports hermes binary readiness in status collection', async () => {
    const report = await collectRuntimeStatus('hermes', {
      homeDir,
      cwd: projectDir,
    });

    expect(report.runtime).toBe('hermes');
    expect(report.readiness).toHaveProperty('hermesBinaryOnPath');
    expect(Array.isArray(report.issues)).toBe(true);
  });
});
