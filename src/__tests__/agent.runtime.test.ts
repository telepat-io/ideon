import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installAgentRuntime, uninstallAgentRuntime } from '../integrations/agent/runtimeInstaller.js';

describe('agent runtime installers', () => {
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

  it('installs generic-mcp into shared mcp.json', async () => {
    const logs: string[] = [];
    const result = await installAgentRuntime({
      runtime: 'generic-mcp',
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

    expect(result.profile.mcpSkill).toBe(true);
    const mcpPath = path.join(homeDir, '.config', 'mcp', 'mcp.json');
    const raw = JSON.parse(await readFile(mcpPath, 'utf8')) as { mcpServers: Record<string, unknown> };
    expect(raw.mcpServers.ideon).toEqual({ command: 'ideon', args: ['mcp', 'serve'] });

    await uninstallAgentRuntime({
      runtime: 'generic-mcp',
      project: false,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    });

    const after = JSON.parse(await readFile(mcpPath, 'utf8')) as { mcpServers?: Record<string, unknown> };
    expect(after.mcpServers?.ideon).toBeUndefined();
  });

  it('installs cursor cli skill globally', async () => {
    await installAgentRuntime({
      runtime: 'cursor',
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

    const skillPath = path.join(homeDir, '.cursor', 'skills', 'ideon-cli', 'SKILL.md');
    await access(skillPath);
  });

  it('installs pi cli skill paths into settings', async () => {
    await installAgentRuntime({
      runtime: 'pi',
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

    const settingsPath = path.join(homeDir, '.pi', 'agent', 'settings.json');
    const raw = JSON.parse(await readFile(settingsPath, 'utf8')) as { skills: string[] };
    expect(raw.skills.some((entry) => entry.includes('ideon-cli'))).toBe(true);
  });

  it('installs pi mcp config without pi subprocess in dry-run', async () => {
    const logs: string[] = [];
    await installAgentRuntime({
      runtime: 'pi',
      cliSkill: false,
      mcpSkill: true,
      force: true,
      project: false,
      dryRun: true,
      cwd: projectDir,
      homeDir,
      log: (message) => logs.push(message),
      warn: () => {},
    });
    expect(logs.some((entry) => entry.includes('pi-mcp-adapter'))).toBe(true);
  });

  it('emits warnings when cursor mcp config conflicts', async () => {
    const mcpPath = path.join(homeDir, '.cursor', 'mcp.json');
    await mkdir(path.dirname(mcpPath), { recursive: true });
    await writeFile(mcpPath, JSON.stringify({ mcpServers: { ideon: { command: 'other' } } }), 'utf8');
    const warnings: string[] = [];
    await installAgentRuntime({
      runtime: 'cursor',
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

  it('installs and uninstalls claude cli integration in project scope', async () => {
    await installAgentRuntime({
      runtime: 'claude',
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
    await access(path.join(projectDir, 'CLAUDE.md'));
    await uninstallAgentRuntime({
      runtime: 'claude',
      project: true,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    });
  });
});
