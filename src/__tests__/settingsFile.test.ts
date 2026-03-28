import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';

const mkdirMock = jest.fn<typeof import('node:fs/promises').mkdir>();
const readFileMock = jest.fn<typeof import('node:fs/promises').readFile>();
const writeFileMock = jest.fn<typeof import('node:fs/promises').writeFile>();

jest.unstable_mockModule('node:fs/promises', () => ({
  mkdir: mkdirMock,
  readFile: readFileMock,
  writeFile: writeFileMock,
}));

jest.unstable_mockModule('env-paths', () => ({
  default: () => ({ config: '/mock/config' }),
}));

const { getSettingsFilePath, loadSavedSettings, saveSettings } = await import('../config/settingsFile.js');

describe('settingsFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves settings file path from env-paths config directory', () => {
    expect(getSettingsFilePath()).toBe('/mock/config/settings.json');
  });

  it('returns parsed settings when file exists', async () => {
    readFileMock.mockResolvedValueOnce(JSON.stringify({ model: 'custom/model' }));

    const result = await loadSavedSettings();

    expect(result.model).toBe('custom/model');
    expect(result.modelRequestTimeoutMs).toBe(defaultAppSettings.modelRequestTimeoutMs);
  });

  it('returns defaults when settings file is missing', async () => {
    const error = Object.assign(new Error('missing file'), { code: 'ENOENT' });
    readFileMock.mockRejectedValueOnce(error);

    const result = await loadSavedSettings();

    expect(result).toEqual(defaultAppSettings);
  });

  it('throws for malformed JSON', async () => {
    readFileMock.mockResolvedValueOnce('{invalid json');

    await expect(loadSavedSettings()).rejects.toThrow();
  });

  it('throws when parsed settings fail schema validation', async () => {
    readFileMock.mockResolvedValueOnce(JSON.stringify({ modelRequestTimeoutMs: -1 }));

    await expect(loadSavedSettings()).rejects.toThrow();
  });

  it('rethrows non-ENOENT fs errors', async () => {
    const error = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    readFileMock.mockRejectedValueOnce(error);

    await expect(loadSavedSettings()).rejects.toThrow('permission denied');
  });

  it('creates settings directory and writes formatted JSON', async () => {
    mkdirMock.mockResolvedValueOnce(undefined);
    writeFileMock.mockResolvedValueOnce(undefined);

    await saveSettings(defaultAppSettings);

    expect(mkdirMock).toHaveBeenCalledWith('/mock/config', { recursive: true });
    expect(writeFileMock).toHaveBeenCalledWith(
      '/mock/config/settings.json',
      `${JSON.stringify(defaultAppSettings, null, 2)}\n`,
      'utf8',
    );
  });
});
