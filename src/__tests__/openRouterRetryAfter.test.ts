import { extractRetryAfterFromResponse, type OpenRouterResponse } from '../llm/openRouterClient.js';

function fakeResponse(headerValue: string | null): Response {
  return {
    headers: { get: (name: string) => (name.toLowerCase() === 'retry-after' ? headerValue : null) },
  } as unknown as Response;
}

function responseWithoutHeaders(): Response {
  return {} as unknown as Response;
}

describe('extractRetryAfterFromResponse', () => {
  it('returns null when response carries no retry signal at all', () => {
    const result = extractRetryAfterFromResponse(fakeResponse(null), {}, '{}');
    expect(result).toBeNull();
  });

  it('returns null when response has no headers object', () => {
    const result = extractRetryAfterFromResponse(responseWithoutHeaders(), {}, '{}');
    expect(result).toBeNull();
  });

  it('parses Retry-After header as seconds', () => {
    const result = extractRetryAfterFromResponse(fakeResponse('3'), {}, '{}');
    expect(result).toBe(3000);
  });

  it('parses Retry-After header with fractional seconds', () => {
    const result = extractRetryAfterFromResponse(fakeResponse('2.5'), {}, '{}');
    expect(result).toBe(2500);
  });

  it('parses Retry-After header as an HTTP-date', () => {
    const future = new Date(Date.now() + 5_000).toUTCString();
    const result = extractRetryAfterFromResponse(fakeResponse(future), {}, '{}');
    expect(result).toBeGreaterThan(2_000);
    expect(result).toBeLessThan(10_000);
  });

  it('ignores Retry-After header with past HTTP-date', () => {
    const past = new Date(Date.now() - 5_000).toUTCString();
    const result = extractRetryAfterFromResponse(fakeResponse(past), {}, '{}');
    expect(result).toBeNull();
  });

  it('ignores Retry-After header that is neither numeric nor a date', () => {
    const result = extractRetryAfterFromResponse(fakeResponse('soon-ish'), {}, '{}');
    expect(result).toBeNull();
  });

  it('returns null when numeric header is zero', () => {
    const result = extractRetryAfterFromResponse(fakeResponse('0'), {}, '{}');
    expect(result).toBeNull();
  });

  it('returns null when numeric header is negative (falls through and matches nothing)', () => {
    const result = extractRetryAfterFromResponse(fakeResponse('-5'), {}, '{}');
    expect(result).toBeNull();
  });

  it('parses retry_after from error.metadata as a number', () => {
    const json: OpenRouterResponse = { error: { metadata: { retry_after: 7 } as unknown as { raw?: string; provider_name?: string } } };
    const result = extractRetryAfterFromResponse(fakeResponse(null), json, '{}');
    expect(result).toBe(7000);
  });

  it('parses retry_after from error.metadata as a string', () => {
    const json: OpenRouterResponse = { error: { metadata: { retry_after: '4' } as unknown as { raw?: string; provider_name?: string } } };
    const result = extractRetryAfterFromResponse(fakeResponse(null), json, '{}');
    expect(result).toBe(4000);
  });

  it('parses retry_after via camelCase metadata.retryAfter', () => {
    const json: OpenRouterResponse = { error: { metadata: { retryAfter: 6 } as unknown as { raw?: string; provider_name?: string } } };
    const result = extractRetryAfterFromResponse(fakeResponse(null), json, '{}');
    expect(result).toBe(6000);
  });

  it('falls back to metadata.raw when no direct field is set', () => {
    const json: OpenRouterResponse = { error: { metadata: { raw: '{"retry_after":2}' } } };
    const result = extractRetryAfterFromResponse(fakeResponse(null), json, '{}');
    expect(result).toBe(2000);
  });

  it('falls back to body retry_after when metadata is absent', () => {
    const body = '{"detail":"throttled","retry_after":1.25}';
    const result = extractRetryAfterFromResponse(fakeResponse(null), {}, body);
    expect(result).toBe(1250);
  });

  it('parses retry_after even when the body has escaped quotes', () => {
    const body = '{"error":{"message":"x","metadata":{"raw":"{\\"retry_after\\":3}"}}}';
    const result = extractRetryAfterFromResponse(fakeResponse(null), {}, body);
    expect(result).toBe(3000);
  });

  it('returns null when body retry_after is zero', () => {
    const body = '{"retry_after":0}';
    const result = extractRetryAfterFromResponse(fakeResponse(null), {}, body);
    expect(result).toBeNull();
  });

  it('returns null when neither metadata field nor body matches', () => {
    const json: OpenRouterResponse = { error: { metadata: { provider_name: 'foo' } } };
    const result = extractRetryAfterFromResponse(fakeResponse(null), json, 'not json');
    expect(result).toBeNull();
  });

  it('handles non-numeric metadata.retry_after gracefully', () => {
    const json: OpenRouterResponse = { error: { metadata: { retry_after: 'eventually' } as unknown as { raw?: string; provider_name?: string } } };
    const result = extractRetryAfterFromResponse(fakeResponse(null), json, '{}');
    expect(result).toBeNull();
  });

  it('falls through metadata.raw that lacks retry_after and matches body instead', () => {
    const json: OpenRouterResponse = { error: { metadata: { raw: '{"foo":"bar"}' } } };
    const body = '{"retry_after":5}';
    const result = extractRetryAfterFromResponse(fakeResponse(null), json, body);
    expect(result).toBe(5000);
  });
});
