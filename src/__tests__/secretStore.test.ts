import { jest } from '@jest/globals';

const getPasswordMock = jest.fn<(service: string, account: string) => Promise<string | null>>();
const setPasswordMock = jest.fn<(service: string, account: string, password: string) => Promise<void>>();
const deletePasswordMock = jest.fn<(service: string, account: string) => Promise<boolean>>();
const warnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});

function createKeytarModule() {
  return {
    default: {
      getPassword: getPasswordMock,
      setPassword: setPasswordMock,
      deletePassword: deletePasswordMock,
    },
  };
}

async function importSecretStoreWithKeytarModule() {
  jest.unstable_mockModule('keytar', () => createKeytarModule());
  return import('../config/secretStore.js');
}

describe('secretStore', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    warnMock.mockClear();
  });

  afterAll(() => {
    warnMock.mockRestore();
  });

  it('loads both secrets from keytar', async () => {
    const { loadSecrets } = await importSecretStoreWithKeytarModule();
    getPasswordMock.mockResolvedValueOnce('openrouter').mockResolvedValueOnce('replicate');

    const result = await loadSecrets();

    expect(result).toEqual({
      openRouterApiKey: 'openrouter',
      replicateApiToken: 'replicate',
    });
    expect(getPasswordMock).toHaveBeenCalledWith('ideon', 'openrouter-api-key');
    expect(getPasswordMock).toHaveBeenCalledWith('ideon', 'replicate-api-token');
  });

  it('returns null values when keytar has no stored credentials', async () => {
    const { loadSecrets } = await importSecretStoreWithKeytarModule();
    getPasswordMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const result = await loadSecrets();

    expect(result).toEqual({
      openRouterApiKey: null,
      replicateApiToken: null,
    });
  });

  it('returns null secrets when keytar is disabled', async () => {
    const { loadSecrets } = await importSecretStoreWithKeytarModule();
    const result = await loadSecrets({ disableKeytar: true });

    expect(result).toEqual({
      openRouterApiKey: null,
      replicateApiToken: null,
    });
    expect(getPasswordMock).not.toHaveBeenCalled();
  });

  it('falls back to null secrets when keytar is unavailable during load', async () => {
    const { loadSecrets } = await importSecretStoreWithKeytarModule();
    getPasswordMock.mockRejectedValueOnce(new Error('Cannot autolaunch D-Bus without X11 $DISPLAY'));

    const result = await loadSecrets();

    expect(result).toEqual({
      openRouterApiKey: null,
      replicateApiToken: null,
    });
    expect(warnMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to env-only behavior when keytar module import fails', async () => {
    jest.unstable_mockModule('keytar', () => {
      throw Object.assign(new Error('libsecret-1.so.0: cannot open shared object file'), {
        code: 'ERR_DLOPEN_FAILED',
      });
    });
    const { loadSecrets } = await import('../config/secretStore.js');

    const firstResult = await loadSecrets();
    const secondResult = await loadSecrets();

    expect(firstResult).toEqual({
      openRouterApiKey: null,
      replicateApiToken: null,
    });
    expect(secondResult).toEqual({
      openRouterApiKey: null,
      replicateApiToken: null,
    });
    expect(warnMock).toHaveBeenCalledTimes(1);
  });

  it('saves only provided secrets', async () => {
    const { saveSecrets } = await importSecretStoreWithKeytarModule();
    setPasswordMock.mockResolvedValue(undefined);

    await saveSecrets({ openRouterApiKey: 'new-key' });

    expect(setPasswordMock).toHaveBeenCalledTimes(1);
    expect(setPasswordMock).toHaveBeenCalledWith('ideon', 'openrouter-api-key', 'new-key');
    expect(deletePasswordMock).not.toHaveBeenCalled();
  });

  it('saves both secrets when both are provided', async () => {
    const { saveSecrets } = await importSecretStoreWithKeytarModule();
    setPasswordMock.mockResolvedValue(undefined);

    await saveSecrets({
      openRouterApiKey: 'openrouter-new',
      replicateApiToken: 'replicate-new',
    });

    expect(setPasswordMock).toHaveBeenCalledTimes(2);
    expect(setPasswordMock).toHaveBeenCalledWith('ideon', 'openrouter-api-key', 'openrouter-new');
    expect(setPasswordMock).toHaveBeenCalledWith('ideon', 'replicate-api-token', 'replicate-new');
  });

  it('deletes a secret when value is empty string', async () => {
    const { saveSecrets } = await importSecretStoreWithKeytarModule();
    deletePasswordMock.mockResolvedValueOnce(true);

    await saveSecrets({ openRouterApiKey: '' });

    expect(deletePasswordMock).toHaveBeenCalledWith('ideon', 'openrouter-api-key');
    expect(setPasswordMock).not.toHaveBeenCalled();
  });

  it('deletes a secret when value is null', async () => {
    const { saveSecrets } = await importSecretStoreWithKeytarModule();
    deletePasswordMock.mockResolvedValueOnce(true);

    await saveSecrets({ replicateApiToken: null });

    expect(deletePasswordMock).toHaveBeenCalledWith('ideon', 'replicate-api-token');
    expect(setPasswordMock).not.toHaveBeenCalled();
  });

  it('propagates keytar set errors', async () => {
    const { saveSecrets } = await importSecretStoreWithKeytarModule();
    setPasswordMock.mockRejectedValueOnce(new Error('set failed'));

    await expect(saveSecrets({ openRouterApiKey: 'bad' })).rejects.toThrow('set failed');
  });

  it('propagates keytar delete errors', async () => {
    const { saveSecrets } = await importSecretStoreWithKeytarModule();
    deletePasswordMock.mockRejectedValueOnce(new Error('delete failed'));

    await expect(saveSecrets({ replicateApiToken: null })).rejects.toThrow('delete failed');
  });

  it('throws unavailable error when keytar is disabled during save', async () => {
    const { KeytarUnavailableError, saveSecrets } = await importSecretStoreWithKeytarModule();
    await expect(saveSecrets({ openRouterApiKey: 'new-key' }, { disableKeytar: true })).rejects.toBeInstanceOf(
      KeytarUnavailableError,
    );
    expect(setPasswordMock).not.toHaveBeenCalled();
  });

  it('maps keytar availability errors during save to KeytarUnavailableError', async () => {
    const { KeytarUnavailableError, saveSecrets } = await importSecretStoreWithKeytarModule();
    setPasswordMock.mockRejectedValueOnce(new Error('D-Bus connection failed'));

    await expect(saveSecrets({ openRouterApiKey: 'new-key' })).rejects.toBeInstanceOf(KeytarUnavailableError);
  });

  it('throws KeytarUnavailableError when keytar module import fails during save', async () => {
    jest.unstable_mockModule('keytar', () => {
      throw Object.assign(new Error('libsecret-1.so.0: cannot open shared object file'), {
        code: 'ERR_DLOPEN_FAILED',
      });
    });
    const { KeytarUnavailableError, saveSecrets } = await import('../config/secretStore.js');

    await expect(saveSecrets({ openRouterApiKey: 'new-key' })).rejects.toBeInstanceOf(KeytarUnavailableError);
  });
});
