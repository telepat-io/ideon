import { jest } from '@jest/globals';
import { classifyHttpError, withRetry } from '../llm/retry.js';

function makeReplicateApiError(message: string, status?: number, retryAfterHeader?: string) {
  class ApiError extends Error {
    request: unknown;
    response: { status?: number; headers: Map<string, string> };
    constructor(msg: string) {
      super(msg);
      this.name = 'ApiError';
      this.request = {};
      this.response = {
        status,
        headers: new Map(retryAfterHeader ? [['retry-after', retryAfterHeader]] : []),
      };
    }
  }
  return new ApiError(message);
}

describe('classifyHttpError', () => {
  it('classifies Replicate 429 ApiError as retryable and parses body retry_after', () => {
    const error = makeReplicateApiError(
      'Request to https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions failed with status 429 Too Many Requests: {"detail":"...","status":429,"retry_after":4}.',
      429,
    );

    const result = classifyHttpError(error);

    expect(result.retryable).toBe(true);
    expect(result.statusCode).toBe(429);
    expect(result.retryAfterMs).toBe(4000);
    expect(result.reason).toContain('429');
  });

  it('honors Retry-After header over body retry_after', () => {
    const error = makeReplicateApiError(
      'Request to URL failed with status 429: {"retry_after":2}.',
      429,
      '10',
    );

    const result = classifyHttpError(error);

    expect(result.retryAfterMs).toBe(10_000);
  });

  it('classifies 5xx as retryable', () => {
    const error = new Error('OpenRouter request failed with status 503');
    const result = classifyHttpError(error);
    expect(result.retryable).toBe(true);
    expect(result.statusCode).toBe(503);
  });

  it('classifies 400/401/403/404 as non-retryable', () => {
    for (const status of [400, 401, 403, 404]) {
      const result = classifyHttpError(new Error(`Failed with status ${status}`));
      expect(result.retryable).toBe(false);
      expect(result.statusCode).toBe(status);
    }
  });

  it('classifies transient network/timeout errors as retryable', () => {
    const cases = [
      'Request timeout',
      'fetch failed',
      'network unreachable',
      'request aborted',
      'temporarily unavailable',
      'ECONNRESET',
    ];

    for (const message of cases) {
      const result = classifyHttpError(new Error(message));
      expect(result.retryable).toBe(true);
    }
  });

  it('treats unknown errors as retryable', () => {
    const result = classifyHttpError(new Error('something went sideways'));
    expect(result.retryable).toBe(true);
  });

  it('parses status from object property when present', () => {
    const result = classifyHttpError({ status: 429, message: 'Too many requests' });
    expect(result.retryable).toBe(true);
    expect(result.statusCode).toBe(429);
  });

  it('treats null/undefined errors as retryable', () => {
    expect(classifyHttpError(null).retryable).toBe(true);
    expect(classifyHttpError(undefined).retryable).toBe(true);
  });

  it('handles plain string errors', () => {
    const result = classifyHttpError('plain message status 500');
    expect(result.retryable).toBe(true);
    expect(result.statusCode).toBe(500);
  });

  it('parses retry_after from a headers Record on error.response', () => {
    const err = { response: { status: 429, headers: { 'retry-after': '5' } } };
    const result = classifyHttpError(err);
    expect(result.retryAfterMs).toBe(5000);
    expect(result.statusCode).toBe(429);
  });

  it('parses retry_after as an HTTP-date in the header', () => {
    const future = new Date(Date.now() + 8_000).toUTCString();
    const err = { response: { status: 429, headers: { 'retry-after': future } } };
    const result = classifyHttpError(err);
    expect(result.retryAfterMs).toBeGreaterThan(5_000);
    expect(result.retryAfterMs).toBeLessThan(10_000);
  });

  it('ignores past HTTP-date headers', () => {
    const past = new Date(Date.now() - 5_000).toUTCString();
    const err = { response: { status: 429, headers: { 'retry-after': past } } };
    const result = classifyHttpError(err);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it('falls back to body retry_after when header is missing', () => {
    const err = new Error('status 429: {"retry_after":2.5}');
    const result = classifyHttpError(err);
    expect(result.retryAfterMs).toBe(2500);
  });

  it('handles numeric status as string in error object', () => {
    const result = classifyHttpError({ status: '503' });
    expect(result.statusCode).toBe(503);
    expect(result.retryable).toBe(true);
  });

  it('treats non-stringifiable errors as transient with message fallback', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    const result = classifyHttpError(circular);
    expect(result.retryable).toBe(true);
  });
});

describe('withRetry', () => {
  it('returns the first success without retrying', async () => {
    const op = jest.fn<() => Promise<string>>().mockResolvedValue('ok');
    const onRetry = jest.fn();
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    const result = await withRetry(op, {
      operationLabel: 'op',
      maxAttempts: 4,
      onRetry,
      sleep,
    });

    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries on 429 honoring body retry_after', async () => {
    const error = new Error(
      'Request to https://api.replicate.com/v1/models/x/predictions failed with status 429 Too Many Requests: {"retry_after":3}.',
    );
    const op = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('ok');
    const onRetry = jest.fn();
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    const result = await withRetry(op, {
      operationLabel: 'replicate',
      maxAttempts: 4,
      onRetry,
      sleep,
    });

    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, delayMs: 3000, statusCode: 429 }),
    );
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it('uses exponential backoff with jitter when no retry_after is provided', async () => {
    const op = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('status 503 server error'))
      .mockResolvedValueOnce('ok');
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    await withRetry(op, {
      operationLabel: 'op',
      maxAttempts: 4,
      baseBackoffMs: 1000,
      maxBackoffMs: 30_000,
      jitterMs: 100,
      randomFraction: () => 0.5,
      sleep,
    });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(1050);
  });

  it('caps retry_after at maxBackoffMs', async () => {
    const error = new Error('status 429: {"retry_after":600}');
    const op = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('ok');
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    await withRetry(op, {
      operationLabel: 'op',
      maxAttempts: 2,
      maxBackoffMs: 60_000,
      sleep,
    });

    expect(sleep).toHaveBeenCalledWith(60_000);
  });

  it('does not retry on non-retryable 4xx', async () => {
    const op = jest
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('status 401 unauthorized'));
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    await expect(
      withRetry(op, { operationLabel: 'op', maxAttempts: 4, sleep }),
    ).rejects.toThrow(/failed after 1 attempt.*unauthorized/i);

    expect(op).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries unknown errors at least once', async () => {
    const op = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('weird unstructured thing'))
      .mockResolvedValueOnce('ok');
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    const result = await withRetry(op, {
      operationLabel: 'op',
      maxAttempts: 2,
      sleep,
    });

    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('exhausts attempts and throws a descriptive wrapped error preserving cause', async () => {
    const original = new Error('Request failed with status 429: {"retry_after":1}');
    const op = jest.fn<() => Promise<string>>().mockRejectedValue(original);
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    let caught: Error | null = null;
    try {
      await withRetry(op, {
        operationLabel: 'Replicate cover image (cover)',
        maxAttempts: 3,
        sleep,
      });
    } catch (error) {
      caught = error as Error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toBe(
      'Replicate cover image (cover) failed after 3 attempts: Request failed with status 429: {"retry_after":1}',
    );
    expect((caught as { cause?: unknown }).cause).toBe(original);
    expect(op).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('reports onRetry with reason and delay', async () => {
    const op = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('status 500'))
      .mockResolvedValueOnce('ok');
    const onRetry = jest.fn();
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    await withRetry(op, {
      operationLabel: 'op',
      maxAttempts: 3,
      baseBackoffMs: 500,
      jitterMs: 0,
      onRetry,
      sleep,
    });

    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, statusCode: 500, reason: 'HTTP 500' }),
    );
  });

  it('parses Retry-After header when error has a headers Map', async () => {
    class FakeApiError extends Error {
      response = { status: 429, headers: new Map([['retry-after', '7']]) };
    }
    const op = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new FakeApiError('status 429'))
      .mockResolvedValueOnce('ok');
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    await withRetry(op, { operationLabel: 'op', maxAttempts: 2, sleep });

    expect(sleep).toHaveBeenCalledWith(7000);
  });

  it('disables jitter when jitterMs is zero', async () => {
    const op = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('status 502'))
      .mockResolvedValueOnce('ok');
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    await withRetry(op, {
      operationLabel: 'op',
      maxAttempts: 2,
      baseBackoffMs: 400,
      jitterMs: 0,
      sleep,
    });

    expect(sleep).toHaveBeenCalledWith(400);
  });

  it('attaches non-Error cause via cause assignment fallback', async () => {
    const op = jest.fn<() => Promise<string>>().mockRejectedValue('just a string');
    const sleep = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue();

    let caught: Error | null = null;
    try {
      await withRetry(op, { operationLabel: 'op', maxAttempts: 1, sleep });
    } catch (error) {
      caught = error as Error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as { cause?: unknown }).cause).toBe('just a string');
  });

  it('uses default sleep when no override is provided', async () => {
    const op = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('status 502'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(op, {
      operationLabel: 'op',
      maxAttempts: 2,
      baseBackoffMs: 1,
      jitterMs: 0,
    });

    expect(result).toBe('ok');
  });
});
