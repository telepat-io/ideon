import { jest } from '@jest/globals';

const readFileMock = jest.fn<(path: string, encoding: string) => Promise<string>>();
const writeFileMock = jest.fn<(path: string, data: string, encoding: string) => Promise<void>>();
const mkdirMock = jest.fn<(path: string, opts: any) => Promise<void>>();

jest.unstable_mockModule('node:fs/promises', () => ({
  readFile: readFileMock,
  writeFile: writeFileMock,
  mkdir: mkdirMock,
}));

const {
  installAgentIntegration,
  listInstalledAgentIntegrations,
  uninstallAgentIntegration,
} = await import('../integrations/agent/store.js');

const STORE_PATH = '/tmp/test-agent-integrations.json';

describe('agent integration store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  it('lists empty integrations when file does not exist', async () => {
    readFileMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const entries = await listInstalledAgentIntegrations(STORE_PATH);

    expect(entries).toEqual([]);
  });

  it('installs a new integration', async () => {
    readFileMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await installAgentIntegration('claude', STORE_PATH);

    expect(result.runtime).toBe('claude');
    expect(result.installedAt).toBeTruthy();
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const written = JSON.parse(writeFileMock.mock.calls[0]![1] as string);
    expect(written.integrations.claude).toBeDefined();
  });

  it('lists installed integrations sorted by runtime', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({
      version: 1,
      integrations: {
        chatgpt: { runtime: 'chatgpt', installedAt: '2025-01-01', updatedAt: '2025-01-01' },
        claude: { runtime: 'claude', installedAt: '2025-01-01', updatedAt: '2025-01-01' },
      },
    }));

    const entries = await listInstalledAgentIntegrations(STORE_PATH);

    expect(entries).toHaveLength(2);
    expect(entries[0].runtime).toBe('chatgpt');
    expect(entries[1].runtime).toBe('claude');
  });

  it('preserves installedAt on reinstall', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({
      version: 1,
      integrations: {
        claude: { runtime: 'claude', installedAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
      },
    }));

    const result = await installAgentIntegration('claude', STORE_PATH);

    expect(result.installedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(result.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
  });

  it('uninstalls an existing integration', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({
      version: 1,
      integrations: {
        claude: { runtime: 'claude', installedAt: '2025-01-01', updatedAt: '2025-01-01' },
      },
    }));

    const result = await uninstallAgentIntegration('claude', STORE_PATH);

    expect(result).toBe(true);
    const written = JSON.parse(writeFileMock.mock.calls[0]![1] as string);
    expect(written.integrations.claude).toBeUndefined();
  });

  it('returns false when uninstalling non-existent runtime', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({
      version: 1,
      integrations: {},
    }));

    const result = await uninstallAgentIntegration('gemini', STORE_PATH);

    expect(result).toBe(false);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('rethrows non-ENOENT read errors', async () => {
    readFileMock.mockRejectedValue(new Error('permission denied'));

    await expect(listInstalledAgentIntegrations(STORE_PATH)).rejects.toThrow('permission denied');
  });
});
