import { jest } from '@jest/globals';

const runMock = jest.fn<(model: string, options: { input: Record<string, unknown> }) => Promise<unknown>>();
const replicateConstructorMock = jest.fn(() => ({
  run: runMock as (model: `${string}/${string}` | `${string}/${string}:${string}`, options: { input: Record<string, unknown> }) => Promise<unknown>,
}));

jest.unstable_mockModule('replicate', () => ({
  default: replicateConstructorMock,
}));

const { ReplicateClient } = await import('../images/replicateClient.js');

describe('ReplicateClient', () => {
  let timeoutSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    runMock.mockReset();
    replicateConstructorMock.mockClear();
    timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((callback: (...args: unknown[]) => void) => {
      if (typeof callback === 'function') {
        callback();
      }
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
  });

  it('returns output on first successful attempt and reports metrics', async () => {
    runMock.mockResolvedValueOnce({ ok: true });

    const client = new ReplicateClient('token');
    const onMetrics = jest.fn();
    const result = await client.runModel('owner/model', { prompt: 'hello' }, { onMetrics });

    expect(replicateConstructorMock).toHaveBeenCalledWith({ auth: 'token' });
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
    expect(onMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        modelId: 'owner/model',
      }),
    );
  });

  it('retries retryable errors and succeeds on a later attempt', async () => {
    const retryable = new Error('network timeout from upstream');
    runMock.mockRejectedValueOnce(retryable).mockResolvedValueOnce({ image: 'ok' });

    const client = new ReplicateClient('token');
    const onMetrics = jest.fn();
    const result = await client.runModel('owner/model', { prompt: 'hello' }, { onMetrics });

    expect(result).toEqual({ image: 'ok' });
    expect(runMock).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);
    expect(onMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        attempts: 2,
        retries: 1,
        retryBackoffMs: 500,
        modelId: 'owner/model',
      }),
    );
  });

  it('retries up to max attempts and throws last retryable error', async () => {
    const retryable = new Error('503 temporary issue');
    runMock.mockRejectedValue(retryable);

    const client = new ReplicateClient('token');

    await expect(client.runModel('owner/model', { prompt: 'hello' })).rejects.toThrow('503 temporary issue');
    expect(runMock).toHaveBeenCalledTimes(3);
    expect(timeoutSpy).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 500);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 1000);
  });

  it('does not retry non-retryable errors', async () => {
    runMock.mockRejectedValueOnce(new Error('invalid input payload'));

    const client = new ReplicateClient('token');

    await expect(client.runModel('owner/model', { prompt: 'hello' })).rejects.toThrow('invalid input payload');
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it('converts non-Error thrown values into a stable unknown error', async () => {
    runMock.mockRejectedValueOnce('boom');

    const client = new ReplicateClient('token');

    await expect(client.runModel('owner/model', { prompt: 'hello' })).rejects.toThrow('Unknown Replicate client error.');
    expect(runMock).toHaveBeenCalledTimes(1);
  });
});
