import type { AppSettings } from '../config/schema.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StructuredRequest<T> {
  schemaName: string;
  schema: Record<string, unknown>;
  messages: ChatMessage[];
  settings: AppSettings;
  parse?: (data: unknown) => T;
  fallbackFactory?: () => T;
  onMetrics?: (metrics: LlmCallMetrics) => void;
}

export interface TextRequest {
  messages: ChatMessage[];
  settings: AppSettings;
  onMetrics?: (metrics: LlmCallMetrics) => void;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    total_cost?: number | string;
    cost?: number | string;
  };
}

export class OpenRouterClient {
  constructor(private readonly apiKey: string) {}

  async requestText(request: TextRequest): Promise<string> {
    const completion = await this.sendCompletion({
      messages: request.messages,
      settings: request.settings,
    });
    request.onMetrics?.(completion.metrics);

    return normalizeGeneratedText(extractText(completion.response));
  }

  async requestStructured<T>(request: StructuredRequest<T>): Promise<T> {
    let aggregatedMetrics: LlmCallMetrics | null = null;

    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await this.sendCompletion({
          messages: request.messages,
          settings: request.settings,
          responseFormat: {
            type: 'json_schema',
            json_schema: {
              name: request.schemaName,
              strict: true,
              schema: request.schema,
            },
          },
          requireStructuredOutputs: true,
        });

        aggregatedMetrics = aggregateLlmMetrics(aggregatedMetrics, response.metrics);

        try {
          const parsed = JSON.parse(extractJson(extractText(response.response))) as unknown;
          const structured = request.parse ? request.parse(parsed) : (parsed as T);
          request.onMetrics?.(aggregatedMetrics);
          return structured;
        } catch (parseError) {
          if (attempt < 2 && shouldRetryStructuredParseError(parseError)) {
            const backoff = backoffMs(attempt);
            aggregatedMetrics = recordParseRetryMetrics(aggregatedMetrics, backoff);
            await wait(backoff);
            continue;
          }

          throw parseError;
        }
      }

      throw new Error('Structured output request failed after exhausting parse retries.');
    } catch (error) {
      if (request.fallbackFactory) {
        if (aggregatedMetrics) {
          request.onMetrics?.(aggregatedMetrics);
        }
        return request.fallbackFactory();
      }

      if (aggregatedMetrics) {
        request.onMetrics?.(aggregatedMetrics);
      }

      throw toStructuredOutputError(error, request.settings.model);
    }
  }

  private async sendCompletion({
    messages,
    settings,
    responseFormat,
    requireStructuredOutputs,
  }: {
    messages: ChatMessage[];
    settings: AppSettings;
    responseFormat?: Record<string, unknown>;
    requireStructuredOutputs?: boolean;
  }): Promise<{ response: OpenRouterResponse; metrics: LlmCallMetrics }> {
    let lastError: Error | null = null;
    const startedAtMs = Date.now();
    let attempts = 0;
    let retries = 0;
    let retryBackoffMs = 0;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      attempts = attempt + 1;
      const controller = new AbortController();
      const timeoutMs = settings.modelRequestTimeoutMs;
      const timeout = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const requestBody: Record<string, unknown> = {
          model: settings.model,
          messages,
          temperature: settings.modelSettings.temperature,
          max_tokens: settings.modelSettings.maxTokens,
          top_p: settings.modelSettings.topP,
        };

        if (responseFormat) {
          requestBody.response_format = responseFormat;
        }

        if (requireStructuredOutputs) {
          requestBody.provider = {
            require_parameters: true,
          };
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-OpenRouter-Title': 'ideon',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        const rawBody = await response.text();
        const json = parseOpenRouterResponse(rawBody);
        if (!response.ok) {
          const message = json?.error?.message ?? `OpenRouter request failed with status ${response.status}`;
          if (shouldRetryStatus(response.status) && attempt < 2) {
            const backoff = backoffMs(attempt);
            retries += 1;
            retryBackoffMs += backoff;
            await wait(backoff);
            continue;
          }

          throw new Error(message);
        }

        const content = json.choices?.[0]?.message?.content;
        if (!content && attempt < 2) {
          const backoff = backoffMs(attempt);
          retries += 1;
          retryBackoffMs += backoff;
          await wait(backoff);
          continue;
        }

        return {
          response: json,
          metrics: {
            durationMs: Date.now() - startedAtMs,
            attempts,
            retries,
            retryBackoffMs,
            modelId: settings.model,
            usage: {
              promptTokens: json.usage?.prompt_tokens ?? null,
              completionTokens: json.usage?.completion_tokens ?? null,
              totalTokens: json.usage?.total_tokens ?? null,
              providerTotalCostUsd: parseOptionalNumber(json.usage?.total_cost) ?? parseOptionalNumber(json.usage?.cost),
            },
          },
        };
      } catch (error) {
        lastError = normalizeClientError(error, timeoutMs);
        if (attempt < 2 && shouldRetryError(lastError)) {
          const backoff = backoffMs(attempt);
          retries += 1;
          retryBackoffMs += backoff;
          await wait(backoff);
          continue;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error('OpenRouter request failed.');
  }
}

function parseOpenRouterResponse(rawBody: string): OpenRouterResponse {
  try {
    return JSON.parse(rawBody) as OpenRouterResponse;
  } catch {
    throw new Error('OpenRouter returned invalid JSON.');
  }
}

function extractText(response: OpenRouterResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned an empty response.');
  }

  return content;
}

function normalizeGeneratedText(text: string): string {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error('OpenRouter returned empty text content.');
  }

  return normalized;
}

function extractJson(content: string): string {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const candidate = fencedMatch[1].trim();
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Fall through to brace extraction.
    }
  }

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = content.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      throw new Error('Expected valid JSON in the model response but extraction failed.');
    }
  }

  throw new Error('Expected JSON in the model response but none was found.');
}

function toStructuredOutputError(error: unknown, model: string): Error {
  if (!(error instanceof Error)) {
    return new Error(`Structured output request failed for model \"${model}\".`);
  }

  if (isStructuredOutputCompatibilityError(error.message)) {
    return new Error(
      `Model \"${model}\" or its routed provider does not support strict structured outputs. Choose a model with structured outputs support and retry.`,
    );
  }

  return error;
}

function isStructuredOutputCompatibilityError(message: string): boolean {
  return /response_format|json_schema|structured output|structured outputs|require_parameters|unsupported/i.test(message);
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function shouldRetryError(error: Error): boolean {
  return /timeout|network|fetch|temporarily|aborted/i.test(error.message);
}

function shouldRetryStructuredParseError(error: unknown): boolean {
  if (error instanceof Error) {
    if (isStructuredOutputCompatibilityError(error.message)) {
      return false;
    }

    if (/OpenRouter returned an empty response\./i.test(error.message)) {
      return false;
    }

    return true;
  }

  return false;
}

function normalizeClientError(error: unknown, timeoutMs: number): Error {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new Error(`OpenRouter request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    }

    return error;
  }

  return new Error('Unknown OpenRouter client error.');
}

function backoffMs(attempt: number): number {
  return 500 * (attempt + 1);
}

function aggregateLlmMetrics(total: LlmCallMetrics | null, next: LlmCallMetrics): LlmCallMetrics {
  if (!total) {
    return { ...next };
  }

  return {
    durationMs: total.durationMs + next.durationMs,
    attempts: total.attempts + next.attempts,
    retries: total.retries + next.retries,
    retryBackoffMs: total.retryBackoffMs + next.retryBackoffMs,
    modelId: next.modelId,
    usage: {
      promptTokens: sumNullableNumber(total.usage.promptTokens, next.usage.promptTokens),
      completionTokens: sumNullableNumber(total.usage.completionTokens, next.usage.completionTokens),
      totalTokens: sumNullableNumber(total.usage.totalTokens, next.usage.totalTokens),
      providerTotalCostUsd: sumNullableNumber(total.usage.providerTotalCostUsd, next.usage.providerTotalCostUsd),
    },
  };
}

function recordParseRetryMetrics(metrics: LlmCallMetrics, backoff: number): LlmCallMetrics {
  return {
    ...metrics,
    retries: metrics.retries + 1,
    retryBackoffMs: metrics.retryBackoffMs + backoff,
  };
}

function sumNullableNumber(left: number | null, right: number | null): number | null {
  if (left === null || right === null) {
    return null;
  }

  return left + right;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}