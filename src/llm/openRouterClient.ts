import type { AppSettings } from '../config/schema.js';

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
}

export interface TextRequest {
  messages: ChatMessage[];
  settings: AppSettings;
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
}

export class OpenRouterClient {
  constructor(private readonly apiKey: string) {}

  async requestText(request: TextRequest): Promise<string> {
    const response = await this.sendCompletion({
      messages: request.messages,
      settings: request.settings,
    });

    return normalizeGeneratedText(extractText(response));
  }

  async requestStructured<T>(request: StructuredRequest<T>): Promise<T> {
    try {
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
      });

      const parsed = JSON.parse(extractJson(extractText(response))) as unknown;
      return request.parse ? request.parse(parsed) : (parsed as T);
    } catch (error) {
      if (request.fallbackFactory) {
        return request.fallbackFactory();
      }

      const fallbackResponse = await this.sendCompletion({
        messages: request.messages,
        settings: request.settings,
        responseFormat: { type: 'json_object' },
      });

      try {
        const parsed = JSON.parse(extractJson(extractText(fallbackResponse))) as unknown;
        return request.parse ? request.parse(parsed) : (parsed as T);
      } catch {
        throw error;
      }
    }
  }

  private async sendCompletion({
    messages,
    settings,
    responseFormat,
  }: {
    messages: ChatMessage[];
    settings: AppSettings;
    responseFormat?: Record<string, unknown>;
  }): Promise<OpenRouterResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, 45000);

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-OpenRouter-Title': 'ideon',
          },
          body: JSON.stringify({
            model: settings.model,
            messages,
            temperature: settings.modelSettings.temperature,
            max_tokens: settings.modelSettings.maxTokens,
            top_p: settings.modelSettings.topP,
            response_format: responseFormat,
          }),
          signal: controller.signal,
        });

        const rawBody = await response.text();
        const json = parseOpenRouterResponse(rawBody);
        if (!response.ok) {
          const message = json?.error?.message ?? `OpenRouter request failed with status ${response.status}`;
          if (shouldRetryStatus(response.status) && attempt < 2) {
            await wait(backoffMs(attempt));
            continue;
          }

          throw new Error(message);
        }

        clearTimeout(timeout);
        return json;
      } catch (error) {
        clearTimeout(timeout);
        lastError = normalizeClientError(error);
        if (attempt < 2 && shouldRetryError(lastError)) {
          await wait(backoffMs(attempt));
          continue;
        }
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
    return fencedMatch[1].trim();
  }

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }

  throw new Error('Expected JSON in the model response but none was found.');
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function shouldRetryError(error: Error): boolean {
  return /timeout|network|fetch|temporarily|aborted/i.test(error.message);
}

function normalizeClientError(error: unknown): Error {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new Error('OpenRouter request timed out after 45 seconds.');
    }

    return error;
  }

  return new Error('Unknown OpenRouter client error.');
}

function backoffMs(attempt: number): number {
  return 500 * (attempt + 1);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}