import { jest } from '@jest/globals';
import { ReportedError } from '../cli/reportedError.js';
import {
  runAgentInstallCommand,
  runAgentStatusCommand,
  runAgentUninstallCommand,
} from '../cli/commands/agent.js';

describe('agent commands', () => {
  const profile = {
    cliSkill: true,
    mcpSkill: false,
    scope: 'global' as const,
    managedPaths: [],
    managedKeys: [],
    toolId: 'ideon' as const,
    integrationVersion: '0.1.41',
  };

  const installMock = jest.fn(async () => ({
    runtime: 'claude',
    installedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    profile,
  }));
  const uninstallMock = jest.fn(async () => true);
  const getInstalledMock = jest.fn<() => Promise<{
    runtime: string;
    installedAt: string;
    updatedAt: string;
    profile: typeof profile;
  } | undefined>>(async () => ({
    runtime: 'claude',
    installedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    profile,
  }));
  const listMock = jest.fn(async () => [
    {
      runtime: 'claude',
      installedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      profile,
    },
  ]);
  const installRuntimeMock = jest.fn(async () => ({ profile, mutations: [] }));
  const uninstallRuntimeMock = jest.fn(async () => undefined);
  const collectRuntimeStatusMock = jest.fn(async () => ({
    runtime: 'claude',
    profile,
    artifacts: [],
    issues: [],
    readiness: {},
  }));

  const baseDeps = {
    install: installMock as never,
    uninstall: uninstallMock as never,
    list: listMock as never,
    getInstalled: getInstalledMock as never,
    installRuntime: installRuntimeMock as never,
    uninstallRuntime: uninstallRuntimeMock as never,
    collectRuntimeStatus: collectRuntimeStatusMock as never,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getInstalledMock.mockResolvedValue({
      runtime: 'claude',
      installedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      profile,
    });
  });

  it('installs a supported runtime', async () => {
    const logs: string[] = [];

    await runAgentInstallCommand(
      { runtime: 'claude', cliSkill: false, mcpSkill: false, force: false, project: false, dryRun: false },
      {
        ...baseDeps,
        log: (message) => logs.push(message),
      },
    );

    expect(installRuntimeMock).toHaveBeenCalled();
    expect(installMock).toHaveBeenCalledWith('claude', profile);
    expect(logs).toContain('Installed claude integration.');
  });

  it('supports dry-run install', async () => {
    const logs: string[] = [];

    await runAgentInstallCommand(
      { runtime: 'gemini', cliSkill: false, mcpSkill: false, force: false, project: false, dryRun: true },
      {
        ...baseDeps,
        log: (message) => logs.push(message),
      },
    );

    expect(installMock).not.toHaveBeenCalled();
    expect(logs[0]).toContain('[dry-run]');
  });

  it('rejects unsupported runtime names', async () => {
    await expect(
      runAgentInstallCommand(
        { runtime: 'unknown-runtime', cliSkill: false, mcpSkill: false, force: false, project: false, dryRun: false },
        baseDeps,
      ),
    ).rejects.toBeInstanceOf(ReportedError);
  });

  it('rejects --project for hermes install', async () => {
    await expect(
      runAgentInstallCommand(
        { runtime: 'hermes', cliSkill: false, mcpSkill: false, force: false, project: true, dryRun: false },
        baseDeps,
      ),
    ).rejects.toBeInstanceOf(ReportedError);
    expect(installRuntimeMock).not.toHaveBeenCalled();
  });

  it('rejects using cli and mcp skill flags together', async () => {
    await expect(
      runAgentInstallCommand(
        { runtime: 'pi', cliSkill: true, mcpSkill: true, force: false, project: false, dryRun: false },
        baseDeps,
      ),
    ).rejects.toBeInstanceOf(ReportedError);
  });

  it('installs newly supported runtimes including pi', async () => {
    for (const runtime of ['cursor', 'vscode', 'opencode', 'codex', 'claude-desktop', 'hermes', 'pi']) {
      const runtimeInstallMock = jest.fn(async () => ({ profile, mutations: [] }));
      await runAgentInstallCommand(
        { runtime, cliSkill: false, mcpSkill: false, force: false, project: false, dryRun: false },
        {
          ...baseDeps,
          installRuntime: runtimeInstallMock as never,
          log: () => {},
        },
      );
      expect(runtimeInstallMock).toHaveBeenCalled();
    }
  });

  it('uninstalls a runtime', async () => {
    const logs: string[] = [];

    await runAgentUninstallCommand(
      { runtime: 'claude', project: false, dryRun: false },
      {
        ...baseDeps,
        log: (message) => logs.push(message),
      },
    );

    expect(uninstallRuntimeMock).toHaveBeenCalled();
    expect(uninstallMock).toHaveBeenCalledWith('claude');
    expect(logs).toContain('Uninstalled claude integration.');
  });

  it('fails uninstall when runtime is not installed', async () => {
    getInstalledMock.mockResolvedValueOnce(undefined);

    await expect(
      runAgentUninstallCommand(
        { runtime: 'claude', project: false, dryRun: false },
        baseDeps,
      ),
    ).rejects.toBeInstanceOf(ReportedError);
  });

  it('renders status output with runtime reports', async () => {
    const logs: string[] = [];

    await runAgentStatusCommand(
      { json: false },
      {
        ...baseDeps,
        now: () => new Date('2026-04-17T00:00:00.000Z'),
        log: (message) => logs.push(message),
      },
    );

    expect(logs.some((entry) => entry.includes('Installed runtimes: claude'))).toBe(true);
    expect(logs.some((entry) => entry.includes('Runtime claude:'))).toBe(true);
  });

  it('supports uninstall dry-run without touching store', async () => {
    const logs: string[] = [];
    await runAgentUninstallCommand(
      { runtime: 'claude', project: false, dryRun: true },
      {
        ...baseDeps,
        log: (message) => logs.push(message),
      },
    );
    expect(uninstallRuntimeMock).not.toHaveBeenCalled();
    expect(logs[0]).toContain('[dry-run]');
  });

  it('renders status JSON output with runtimeReports', async () => {
    const logs: string[] = [];

    await runAgentStatusCommand(
      { json: true },
      {
        ...baseDeps,
        now: () => new Date('2026-04-17T00:00:00.000Z'),
        log: (message) => logs.push(message),
      },
    );

    const parsed = JSON.parse(logs[0] ?? '') as { runtimeReports: unknown[] };
    expect(Array.isArray(parsed.runtimeReports)).toBe(true);
  });
});
