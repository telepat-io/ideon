import { jest } from '@jest/globals';

describe('runSyncCheck script', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('exits 0 when no contract drift exists', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as never);

    jest.unstable_mockModule('../integrations/sync-validator.js', () => ({
      validateIntegrationContracts: () => [],
    }));

    await expect(import('../integrations/runSyncCheck.js')).rejects.toThrow('exit:0');

    expect(logSpy).toHaveBeenCalledWith('Integration contract sync check passed.');
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('exits 1 and prints drift details when mismatches exist', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as never);

    jest.unstable_mockModule('../integrations/sync-validator.js', () => ({
      validateIntegrationContracts: () => [
        {
          id: 'drift-id',
          expected: '["expected"]',
          actual: '["actual"]',
        },
      ],
    }));

    await expect(import('../integrations/runSyncCheck.js')).rejects.toThrow('exit:1');

    expect(errorSpy).toHaveBeenCalledWith('Integration contract drift detected.');
    expect(errorSpy).toHaveBeenCalledWith('- drift-id');
    expect(errorSpy).toHaveBeenCalledWith('  expected: ["expected"]');
    expect(errorSpy).toHaveBeenCalledWith('  actual:   ["actual"]');
    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
