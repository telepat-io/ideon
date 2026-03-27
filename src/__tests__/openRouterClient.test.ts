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

    expect(fetchMock).toHaveBeenCalledTimes(1);
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
});
