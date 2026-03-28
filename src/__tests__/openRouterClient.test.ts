import { jest } from '@jest/globals';
import { defaultAppSettings } from '../config/schema.js';
import { OpenRouterClient } from '../llm/openRouterClient.js';

describe('OpenRouterClient requestStructured', () => {
  const apiKey = 'test-key';
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['value'],
    properties: {
      value: { type: 'string' },
    },
  } as const;

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends json_schema requests with provider require_parameters enabled', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: '{"value":"ok"}' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const result = await client.requestStructured<{ value: string }>({
      schemaName: 'structured_test',
      schema,
      messages: [{ role: 'user', content: 'test' }],
      settings: defaultAppSettings,
    });

    expect(result.value).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, options] = (fetchMock as unknown as jest.Mock).mock.calls[0] as [string, { body?: string }];
    const body = JSON.parse(options.body ?? '{}') as Record<string, unknown>;

    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'structured_test',
        strict: true,
        schema,
      },
    });
    expect(body.provider).toEqual({ require_parameters: true });
  });

  it('fails with compatibility guidance when model/provider rejects structured outputs', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: 'response_format json_schema is not supported' } }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);

    await expect(
      client.requestStructured<{ value: string }>({
        schemaName: 'structured_test',
        schema,
        messages: [{ role: 'user', content: 'test' }],
        settings: defaultAppSettings,
      }),
    ).rejects.toThrow('does not support strict structured outputs');
  });

  it('throws when model content is not valid JSON', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: 'not-json {"value": } trailing' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);

    await expect(
      client.requestStructured<{ value: string }>({
        schemaName: 'structured_test',
        schema,
        messages: [{ role: 'user', content: 'test' }],
        settings: defaultAppSettings,
      }),
    ).rejects.toThrow('Expected valid JSON in the model response but extraction failed.');

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries and succeeds when JSON extraction fails transiently', async () => {
    let callCount = 0;
    const fetchMock = jest.fn(async () => {
      callCount += 1;
      const content = callCount === 1
        ? 'not-json {"value": } trailing'
        : '{"value":"ok"}';

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
      };
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const result = await client.requestStructured<{ value: string }>({
      schemaName: 'structured_test',
      schema,
      messages: [{ role: 'user', content: 'test' }],
      settings: defaultAppSettings,
    });

    expect(result.value).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries and succeeds when schema parsing fails transiently', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: '{"value":"ok"}' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const parseMock = jest
      .fn<(data: unknown) => { value: string }>()
      .mockImplementationOnce(() => {
        throw new Error('Schema validation failed');
      })
      .mockImplementation((data) => data as { value: string });

    const client = new OpenRouterClient(apiKey);
    const result = await client.requestStructured<{ value: string }>({
      schemaName: 'structured_test',
      schema,
      messages: [{ role: 'user', content: 'test' }],
      settings: defaultAppSettings,
      parse: parseMock,
    });

    expect(result.value).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(parseMock).toHaveBeenCalledTimes(2);
  });

  it('retries and succeeds when empty content is returned transiently', async () => {
    let callCount = 0;
    const fetchMock = jest.fn(async () => {
      callCount += 1;
      const content = callCount < 3 ? null : '{"value":"ok"}';
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
      };
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const result = await client.requestStructured<{ value: string }>({
      schemaName: 'structured_test',
      schema,
      messages: [{ role: 'user', content: 'test' }],
      settings: defaultAppSettings,
    });

    expect(result.value).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fails with empty response error after exhausting retries on persistent empty content', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: null } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);

    await expect(
      client.requestStructured<{ value: string }>({
        schemaName: 'structured_test',
        schema,
        messages: [{ role: 'user', content: 'test' }],
        settings: defaultAppSettings,
      }),
    ).rejects.toThrow('OpenRouter returned an empty response.');

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('uses configured timeout duration in timeout error message', async () => {
    const fetchMock = jest.fn(async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);

    await expect(
      client.requestStructured<{ value: string }>({
        schemaName: 'structured_test',
        schema,
        messages: [{ role: 'user', content: 'test' }],
        settings: {
          ...defaultAppSettings,
          modelRequestTimeoutMs: 90000,
        },
      }),
    ).rejects.toThrow('OpenRouter request timed out after 90 seconds.');

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns fallbackFactory value when parsing keeps failing', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: '{"value":"ok"}' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const onMetrics = jest.fn();

    const result = await client.requestStructured<{ value: string }>({
      schemaName: 'structured_test',
      schema,
      messages: [{ role: 'user', content: 'test' }],
      settings: defaultAppSettings,
      parse() {
        throw new Error('parse always fails');
      },
      fallbackFactory: () => ({ value: 'fallback' }),
      onMetrics,
    });

    expect(result).toEqual({ value: 'fallback' });
    expect(onMetrics).toHaveBeenCalled();
  });

  it('maps non-Error parse failures to a structured output error', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: '{"value":"ok"}' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);

    await expect(
      client.requestStructured<{ value: string }>({
        schemaName: 'structured_test',
        schema,
        messages: [{ role: 'user', content: 'test' }],
        settings: defaultAppSettings,
        parse() {
          throw 'non-error parse failure';
        },
      }),
    ).rejects.toThrow('Structured output request failed for model');
  });

  it('parses valid fenced JSON content in structured responses', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ choices: [{ message: { content: '```json\n{"value":"ok"}\n```' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const result = await client.requestStructured<{ value: string }>({
      schemaName: 'structured_test',
      schema,
      messages: [{ role: 'user', content: 'test' }],
      settings: defaultAppSettings,
    });

    expect(result).toEqual({ value: 'ok' });
  });

  it('throws when structured response contains no JSON at all', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: 'plain text only' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    await expect(
      client.requestStructured<{ value: string }>({
        schemaName: 'structured_test',
        schema,
        messages: [{ role: 'user', content: 'test' }],
        settings: defaultAppSettings,
      }),
    ).rejects.toThrow('Expected JSON in the model response but none was found.');
  });

  it('does not parse-retry compatibility parse errors', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: '{"value":"ok"}' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    await expect(
      client.requestStructured<{ value: string }>({
        schemaName: 'structured_test',
        schema,
        messages: [{ role: 'user', content: 'test' }],
        settings: defaultAppSettings,
        parse() {
          throw new Error('response_format json_schema mismatch');
        },
      }),
    ).rejects.toThrow('does not support strict structured outputs');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('OpenRouterClient requestText', () => {
  const apiKey = 'test-key';
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses provider cost from numeric string usage fields', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: '  hello world  ' } }],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 2,
            total_tokens: 3,
            total_cost: '0.0123',
          },
        }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const onMetrics = jest.fn();
    const text = await client.requestText({
      messages: [{ role: 'user', content: 'hello' }],
      settings: defaultAppSettings,
      onMetrics,
    });

    expect(text).toBe('hello world');
    const metrics = onMetrics.mock.calls[0]?.[0] as { usage: { providerTotalCostUsd: number | null } };
    expect(metrics.usage.providerTotalCostUsd).toBeCloseTo(0.0123, 6);
  });

  it('keeps provider cost null for invalid numeric strings', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: 'hello' } }],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 2,
            total_tokens: 3,
            total_cost: 'not-a-number',
          },
        }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const onMetrics = jest.fn();
    await client.requestText({
      messages: [{ role: 'user', content: 'hello' }],
      settings: defaultAppSettings,
      onMetrics,
    });

    const metrics = onMetrics.mock.calls[0]?.[0] as { usage: { providerTotalCostUsd: number | null } };
    expect(metrics.usage.providerTotalCostUsd).toBeNull();
  });

  it('accepts numeric provider cost values without string parsing', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: 'hello' } }],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 2,
            total_tokens: 3,
            total_cost: 0.5,
          },
        }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const onMetrics = jest.fn();
    await client.requestText({
      messages: [{ role: 'user', content: 'hello' }],
      settings: defaultAppSettings,
      onMetrics,
    });

    const metrics = onMetrics.mock.calls[0]?.[0] as { usage: { providerTotalCostUsd: number | null } };
    expect(metrics.usage.providerTotalCostUsd).toBe(0.5);
  });

  it('throws a stable unknown client error when fetch throws a non-Error value', async () => {
    const fetchMock = jest.fn(async () => {
      throw 'network failure';
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    await expect(
      client.requestText({
        messages: [{ role: 'user', content: 'hello' }],
        settings: defaultAppSettings,
      }),
    ).rejects.toThrow('Unknown OpenRouter client error.');
  });

  it('throws when OpenRouter response body is invalid JSON', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'not-json',
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    await expect(
      client.requestText({
        messages: [{ role: 'user', content: 'hello' }],
        settings: defaultAppSettings,
      }),
    ).rejects.toThrow('OpenRouter returned invalid JSON.');
  });

  it('throws when normalized text content is empty', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: '   ' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    await expect(
      client.requestText({
        messages: [{ role: 'user', content: 'hello' }],
        settings: defaultAppSettings,
      }),
    ).rejects.toThrow('OpenRouter returned empty text content.');
  });

  it('retries once for retryable HTTP status then succeeds', async () => {
    let callCount = 0;
    const fetchMock = jest.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        return {
          ok: false,
          status: 503,
          text: async () => JSON.stringify({ error: { message: 'temporary outage' } }),
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: 'hello after retry' } }] }),
      };
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const result = await client.requestText({
      messages: [{ role: 'user', content: 'hello' }],
      settings: defaultAppSettings,
    });

    expect(result).toBe('hello after retry');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries once for retryable network errors then succeeds', async () => {
    let callCount = 0;
    const fetchMock = jest.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error('network temporarily unavailable');
      }

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: 'hello after network retry' } }] }),
      };
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const result = await client.requestText({
      messages: [{ role: 'user', content: 'hello' }],
      settings: defaultAppSettings,
    });

    expect(result).toBe('hello after network retry');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('OpenRouterClient requestWebSearch', () => {
  const apiKey = 'test-key';
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends web plugin requests and returns the first URL citation', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: '  best result  ',
                annotations: [
                  { type: 'other' },
                  {
                    type: 'url_citation',
                    url_citation: {
                      url: ' https://example.com/docs ',
                      title: ' Example Docs ',
                    },
                  },
                ],
              },
            },
          ],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 2,
            total_tokens: 3,
          },
        }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const onMetrics = jest.fn();
    const client = new OpenRouterClient(apiKey);
    const result = await client.requestWebSearch({
      messages: [{ role: 'user', content: 'find a url' }],
      settings: defaultAppSettings,
      onMetrics,
    });

    expect(result).toEqual({
      text: 'best result',
      firstCitationUrl: 'https://example.com/docs',
      firstCitationTitle: 'Example Docs',
    });
    expect(onMetrics).toHaveBeenCalledTimes(1);

    const [, options] = (fetchMock as unknown as jest.Mock).mock.calls[0] as [string, { body?: string }];
    const body = JSON.parse(options.body ?? '{}') as { plugins?: Array<{ id: string }> };
    expect(body.plugins).toEqual([{ id: 'web' }]);
  });

  it('falls back to the first URL found in text when citations are absent or blank', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Use https://fallback.example.com/guide) for details.',
                annotations: [
                  {
                    type: 'url_citation',
                    url_citation: {
                      url: '   ',
                      title: 'Ignored title',
                    },
                  },
                ],
              },
            },
          ],
        }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const result = await client.requestWebSearch({
      messages: [{ role: 'user', content: 'find a fallback url' }],
      settings: defaultAppSettings,
    });

    expect(result).toEqual({
      text: 'Use https://fallback.example.com/guide) for details.',
      firstCitationUrl: 'https://fallback.example.com/guide',
      firstCitationTitle: null,
    });
  });

  it('returns null citation data when neither annotations nor text contain a URL', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: ' none ' } }] }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const client = new OpenRouterClient(apiKey);
    const result = await client.requestWebSearch({
      messages: [{ role: 'user', content: 'find nothing' }],
      settings: defaultAppSettings,
    });

    expect(result).toEqual({
      text: 'none',
      firstCitationUrl: null,
      firstCitationTitle: null,
    });
  });
});
