import { jest } from '@jest/globals';

const getPasswordMock = jest.fn<(service: string, account: string) => Promise<string | null>>();
const setPasswordMock = jest.fn<(service: string, account: string, password: string) => Promise<void>>();
const deletePasswordMock = jest.fn<(service: string, account: string) => Promise<boolean>>();

jest.unstable_mockModule('keytar', () => ({
  default: {
    getPassword: getPasswordMock,
    setPassword: setPasswordMock,
    deletePassword: deletePasswordMock,
  },
}));

const { loadSecrets, saveSecrets } = await import('../config/secretStore.js');

describe('secretStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads both secrets from keytar', async () => {
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
    getPasswordMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const result = await loadSecrets();

    expect(result).toEqual({
      openRouterApiKey: null,
      replicateApiToken: null,
    });
  });

  it('saves only provided secrets', async () => {
    setPasswordMock.mockResolvedValue(undefined);

    await saveSecrets({ openRouterApiKey: 'new-key' });

    expect(setPasswordMock).toHaveBeenCalledTimes(1);
    expect(setPasswordMock).toHaveBeenCalledWith('ideon', 'openrouter-api-key', 'new-key');
    expect(deletePasswordMock).not.toHaveBeenCalled();
  });

  it('saves both secrets when both are provided', async () => {
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
    deletePasswordMock.mockResolvedValueOnce(true);

    await saveSecrets({ openRouterApiKey: '' });

    expect(deletePasswordMock).toHaveBeenCalledWith('ideon', 'openrouter-api-key');
    expect(setPasswordMock).not.toHaveBeenCalled();
  });

  it('deletes a secret when value is null', async () => {
    deletePasswordMock.mockResolvedValueOnce(true);

    await saveSecrets({ replicateApiToken: null });

    expect(deletePasswordMock).toHaveBeenCalledWith('ideon', 'replicate-api-token');
    expect(setPasswordMock).not.toHaveBeenCalled();
  });

  it('propagates keytar set errors', async () => {
    setPasswordMock.mockRejectedValueOnce(new Error('set failed'));

    await expect(saveSecrets({ openRouterApiKey: 'bad' })).rejects.toThrow('set failed');
  });

  it('propagates keytar delete errors', async () => {
    deletePasswordMock.mockRejectedValueOnce(new Error('delete failed'));

    await expect(saveSecrets({ replicateApiToken: null })).rejects.toThrow('delete failed');
  });
});
