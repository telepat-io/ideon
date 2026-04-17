import { jest } from '@jest/globals';
import { ReportedError } from '../cli/reportedError.js';
import {
  runAgentInstallCommand,
  runAgentStatusCommand,
  runAgentUninstallCommand,
} from '../cli/commands/agent.js';

describe('agent commands', () => {
  const installMock = jest.fn(async () => ({
    runtime: 'claude',
    installedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));
  const uninstallMock = jest.fn(async () => true);
  const listMock = jest.fn(async () => [
    {
      runtime: 'claude',
      installedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('installs a supported runtime', async () => {
    const logs: string[] = [];

    await runAgentInstallCommand(
      { runtime: 'claude', dryRun: false },
      {
        install: installMock as never,
        uninstall: uninstallMock as never,
        list: listMock as never,
        log: (message) => logs.push(message),
      },
    );

    expect(installMock).toHaveBeenCalledWith('claude');
    expect(logs).toContain('Installed claude integration.');
  });

  it('supports dry-run install', async () => {
    const logs: string[] = [];

    await runAgentInstallCommand(
      { runtime: 'gemini', dryRun: true },
      {
        install: installMock as never,
        uninstall: uninstallMock as never,
        list: listMock as never,
        log: (message) => logs.push(message),
      },
    );

    expect(installMock).not.toHaveBeenCalled();
    expect(logs[0]).toContain('[dry-run]');
  });

  it('rejects IDE runtime aliases', async () => {
    await expect(
      runAgentInstallCommand(
        { runtime: 'cursor', dryRun: false },
        {
          install: installMock as never,
          uninstall: uninstallMock as never,
          list: listMock as never,
        },
      ),
    ).rejects.toBeInstanceOf(ReportedError);

    await expect(
      runAgentInstallCommand(
        { runtime: 'vscode', dryRun: false },
        {
          install: installMock as never,
          uninstall: uninstallMock as never,
          list: listMock as never,
        },
      ),
    ).rejects.toBeInstanceOf(ReportedError);
  });

  it('rejects unsupported runtime names', async () => {
    await expect(
      runAgentInstallCommand(
        { runtime: 'unknown-runtime', dryRun: false },
        {
          install: installMock as never,
          uninstall: uninstallMock as never,
          list: listMock as never,
        },
      ),
    ).rejects.toBeInstanceOf(ReportedError);
  });

  it('uninstalls a runtime', async () => {
    const logs: string[] = [];

    await runAgentUninstallCommand(
      { runtime: 'claude', dryRun: false },
      {
        install: installMock as never,
        uninstall: uninstallMock as never,
        list: listMock as never,
        log: (message) => logs.push(message),
      },
    );

    expect(uninstallMock).toHaveBeenCalledWith('claude');
    expect(logs).toContain('Uninstalled claude integration.');
  });

  it('fails uninstall when runtime is not installed', async () => {
    const uninstallMissing = jest.fn(async () => false);

    await expect(
      runAgentUninstallCommand(
        { runtime: 'claude', dryRun: false },
        {
          install: installMock as never,
          uninstall: uninstallMissing as never,
          list: listMock as never,
        },
      ),
    ).rejects.toBeInstanceOf(ReportedError);
  });

  it('renders status output', async () => {
    const logs: string[] = [];

    await runAgentStatusCommand(
      { json: false },
      {
        install: installMock as never,
        uninstall: uninstallMock as never,
        list: listMock as never,
        now: () => new Date('2026-04-17T00:00:00.000Z'),
        log: (message) => logs.push(message),
      },
    );

    expect(logs.some((entry) => entry.includes('Installed runtimes: claude'))).toBe(true);
    expect(logs.some((entry) => entry.includes('Readiness sync check:'))).toBe(true);
  });

  it('renders status JSON output', async () => {
    const logs: string[] = [];

    await runAgentStatusCommand(
      { json: true },
      {
        install: installMock as never,
        uninstall: uninstallMock as never,
        list: listMock as never,
        now: () => new Date('2026-04-17T00:00:00.000Z'),
        log: (message) => logs.push(message),
      },
    );

    expect(() => JSON.parse(logs[0] ?? '')).not.toThrow();
  });
});
