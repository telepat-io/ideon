import type { AppSettings } from '../config/schema.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { LlmInteractionRecord } from '../pipeline/events.js';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface OpenRouterToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AgentTurnCompleteEvent {
  turn: number;
  operationId: string;
  metrics: LlmCallMetrics;
  toolCalls: string[];
}

export interface AgentToolExecutedEvent {
  turn: number;
  operationId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  durationMs: number;
}

export interface AgentLoopRequest {
  messages: ChatMessage[];
  tools: OpenRouterToolDefinition[];
  settings: AppSettings;
  maxTurns?: number;
  modelId?: string;
  toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown> | unknown>;
  reasoning?: OpenRouterReasoningConfig;
  interactionContext?: OpenRouterInteractionContext;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
  onTurnComplete?: (event: AgentTurnCompleteEvent) => void;
  onToolExecuted?: (event: AgentToolExecutedEvent) => void;
  onMetrics?: (metrics: LlmCallMetrics) => void;
}

export interface AgentLoopResult {
  messages: ChatMessage[];
  turnsUsed: number;
  finalContent: string | null;
  maxTurnsReached: boolean;
}

export interface StructuredRequest<T> {
  schemaName: string;
  schema: Record<string, unknown>;
  messages: ChatMessage[];
  settings: AppSettings;
  reasoning?: OpenRouterReasoningConfig;
  interactionContext?: OpenRouterInteractionContext;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
  parse?: (data: unknown) => T;
  fallbackFactory?: () => T;
  onMetrics?: (metrics: LlmCallMetrics) => void;
}

export interface TextRequest {
  messages: ChatMessage[];
  settings: AppSettings;
  reasoning?: OpenRouterReasoningConfig;
  interactionContext?: OpenRouterInteractionContext;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
  onMetrics?: (metrics: LlmCallMetrics) => void;
}

export interface WebSearchRequest {
  messages: ChatMessage[];
  settings: AppSettings;
  reasoning?: OpenRouterReasoningConfig;
  interactionContext?: OpenRouterInteractionContext;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
  onMetrics?: (metrics: LlmCallMetrics) => void;
}

export interface OpenRouterReasoningConfig {
  effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';
  max_tokens?: number;
  exclude?: boolean;
  enabled?: boolean;
}

export interface OpenRouterInteractionContext {
  stageId: string;
  operationId: string;
}

export interface OpenRouterResponse {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      tool_calls?: ToolCall[];
      annotations?: Array<{
        type?: string;
        url_citation?: {
          url?: string;
          title?: string;
        };
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
    metadata?: {
      raw?: string;
      provider_name?: string;
    };
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
      requestType: 'text',
      reasoning: request.reasoning,
      interactionContext: request.interactionContext,
      onInteraction: request.onInteraction,
    });
    request.onMetrics?.(completion.metrics);

    return normalizeGeneratedText(extractText(completion.response));
  }

  async requestStructured<T>(request: StructuredRequest<T>): Promise<T> {
    let aggregatedMetrics: LlmCallMetrics | null = null;
    const maxParseAttempts = Math.max(1, request.settings.modelRequestMaxAttempts);

    try {
      for (let attempt = 0; attempt < maxParseAttempts; attempt += 1) {
        const response = await this.sendCompletion({
          messages: request.messages,
          settings: request.settings,
          requestType: 'structured',
          reasoning: request.reasoning,
          interactionContext: request.interactionContext,
          onInteraction: request.onInteraction,
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
          if (attempt < maxParseAttempts - 1 && shouldRetryStructuredParseError(parseError)) {
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

  async requestAgentLoop(request: AgentLoopRequest): Promise<AgentLoopResult> {
    const maxTurns = Math.max(1, request.maxTurns ?? 10);
    const messages = [...request.messages];
    const agentSettings = {
      ...request.settings,
      model: request.modelId ?? request.settings.editorModel ?? request.settings.model,
    };
    let aggregatedMetrics: LlmCallMetrics | null = null;
    let turnsUsed = 0;
    let finalContent: string | null = null;

    const baseOperationId = request.interactionContext?.operationId ?? 'agent';
    const stageId = request.interactionContext?.stageId ?? 'unknown';

    for (let turn = 0; turn < maxTurns; turn += 1) {
      turnsUsed = turn + 1;
      const turnOperationId = `${baseOperationId}:turn-${turnsUsed}`;
      const completion = await this.sendCompletion({
        messages,
        settings: agentSettings,
        requestType: 'agent',
        interactionContext: {
          stageId,
          operationId: turnOperationId,
        },
        onInteraction: request.onInteraction,
        tools: request.tools,
        toolChoice: 'auto',
        parallelToolCalls: false,
        reasoning: request.reasoning,
      });
      aggregatedMetrics = aggregateLlmMetrics(aggregatedMetrics, completion.metrics);

      const choice = completion.response.choices?.[0];
      const assistantMessage = choice?.message;
      if (!assistantMessage) {
        break;
      }

      const toolCalls = assistantMessage.tool_calls ?? [];
      request.onTurnComplete?.({
        turn: turnsUsed,
        operationId: turnOperationId,
        metrics: completion.metrics,
        toolCalls: toolCalls.map((toolCall) => toolCall.function.name),
      });

      messages.push({
        role: 'assistant',
        content: assistantMessage.content ?? null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });

      if (toolCalls.length === 0) {
        finalContent = assistantMessage.content?.trim() || null;
        break;
      }

      for (const toolCall of toolCalls) {
        const handler = request.toolHandlers[toolCall.function.name];
        let toolResult: unknown;
        let toolArgs: Record<string, unknown> = {};
        const toolStartedAtMs = Date.now();
        if (!handler) {
          toolResult = { ok: false, error: `Unknown tool: ${toolCall.function.name}` };
        } else {
          try {
            toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
            toolResult = await handler(toolArgs);
          } catch (error) {
            toolResult = {
              ok: false,
              error: error instanceof Error ? error.message : 'Tool execution failed',
            };
          }
        }

        request.onToolExecuted?.({
          turn: turnsUsed,
          operationId: `${turnOperationId}:${toolCall.function.name}`,
          toolName: toolCall.function.name,
          arguments: toolArgs,
          result: toolResult,
          durationMs: Date.now() - toolStartedAtMs,
        });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    if (aggregatedMetrics) {
      request.onMetrics?.(aggregatedMetrics);
    }

    return {
      messages,
      turnsUsed,
      finalContent,
      maxTurnsReached: turnsUsed >= maxTurns && (messages[messages.length - 1]?.role === 'tool'),
    };
  }

  async requestWebSearch(request: WebSearchRequest): Promise<{ text: string; firstCitationUrl: string | null; firstCitationTitle: string | null }> {
    const completion = await this.sendCompletion({
      messages: request.messages,
      settings: request.settings,
      requestType: 'web-search',
      reasoning: request.reasoning,
      interactionContext: request.interactionContext,
      onInteraction: request.onInteraction,
      plugins: [{ id: 'web' }],
    });
    request.onMetrics?.(completion.metrics);

    const text = normalizeGeneratedText(extractText(completion.response));
    if (isExplicitNoneResponse(text)) {
      return {
        text,
        firstCitationUrl: null,
        firstCitationTitle: null,
      };
    }

    const firstCitation = extractFirstUrlCitation(completion.response);
    const fallbackUrl = extractFirstUrlFromText(text);

    return {
      text,
      firstCitationUrl: firstCitation?.url ?? fallbackUrl,
      firstCitationTitle: firstCitation?.title ?? null,
    };
  }

  private async sendCompletion({
    messages,
    settings,
    requestType,
    interactionContext,
    onInteraction,
    responseFormat,
    requireStructuredOutputs,
    plugins,
    reasoning,
    tools,
    toolChoice,
    parallelToolCalls,
  }: {
    messages: ChatMessage[];
    settings: AppSettings;
    requestType: LlmInteractionRecord['requestType'];
    interactionContext?: OpenRouterInteractionContext;
    onInteraction?: (interaction: LlmInteractionRecord) => void;
    responseFormat?: Record<string, unknown>;
    requireStructuredOutputs?: boolean;
    plugins?: Array<Record<string, unknown>>;
    reasoning?: OpenRouterReasoningConfig;
    tools?: OpenRouterToolDefinition[];
    toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
    parallelToolCalls?: boolean;
  }): Promise<{ response: OpenRouterResponse; metrics: LlmCallMetrics }> {
    let lastError: Error | null = null;
    const startedAtMs = Date.now();
    let attempts = 0;
    let retries = 0;
    let retryBackoffMs = 0;
    const maxAttempts = Math.max(1, settings.modelRequestMaxAttempts);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      attempts = attempt + 1;
      const attemptStartedAtMs = Date.now();
      const controller = new AbortController();
      const timeoutMs = settings.modelRequestTimeoutMs;
      const timeout = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
      let requestBodyRaw = '';
      let responseBodyRaw: string | null = null;

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

        if (plugins && plugins.length > 0) {
          requestBody.plugins = plugins;
        }

        if (reasoning) {
          requestBody.reasoning = reasoning;
        }

        if (tools && tools.length > 0) {
          requestBody.tools = tools;
          requestBody.tool_choice = toolChoice ?? 'auto';
          requestBody.parallel_tool_calls = parallelToolCalls ?? false;
        }

        requestBodyRaw = JSON.stringify(requestBody);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-OpenRouter-Title': 'ideon',
          },
          body: requestBodyRaw,
          signal: controller.signal,
        });

        const rawBody = await response.text();
        responseBodyRaw = rawBody;
        const json = parseOpenRouterResponse(rawBody);
        if (!response.ok) {
          const providerMessage = json?.error?.message ?? `OpenRouter request failed with status ${response.status}`;
          const raw = json?.error?.metadata?.raw;
          const message = raw ? `${raw} (OpenRouter: ${providerMessage})` : providerMessage;
          if (shouldRetryStatus(response.status) && attempt < maxAttempts - 1) {
            const advisedMs = extractRetryAfterFromResponse(response, json, rawBody);
            const backoff = advisedMs !== null
              ? Math.min(MAX_RETRY_BACKOFF_MS, advisedMs)
              : backoffMs(attempt);
            retries += 1;
            retryBackoffMs += backoff;
            onInteraction?.({
              stageId: interactionContext?.stageId ?? 'unknown',
              operationId: interactionContext?.operationId ?? 'unknown',
              requestType,
              provider: 'openrouter',
              modelId: settings.model,
              startedAt: new Date(attemptStartedAtMs).toISOString(),
              endedAt: new Date().toISOString(),
              durationMs: Date.now() - attemptStartedAtMs,
              attempts,
              retries,
              retryBackoffMs,
              status: 'failed',
              requestBody: requestBodyRaw,
              responseBody: responseBodyRaw,
              errorMessage: message,
            });
            await wait(backoff);
            continue;
          }

          throw new Error(message);
        }

        const content = json.choices?.[0]?.message?.content;
        const toolCalls = json.choices?.[0]?.message?.tool_calls;
        const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0;
        if (!content && !hasToolCalls && attempt < maxAttempts - 1) {
          const backoff = backoffMs(attempt);
          retries += 1;
          retryBackoffMs += backoff;
          onInteraction?.({
            stageId: interactionContext?.stageId ?? 'unknown',
            operationId: interactionContext?.operationId ?? 'unknown',
            requestType,
            provider: 'openrouter',
            modelId: settings.model,
            startedAt: new Date(attemptStartedAtMs).toISOString(),
            endedAt: new Date().toISOString(),
            durationMs: Date.now() - attemptStartedAtMs,
            attempts,
            retries,
            retryBackoffMs,
            status: 'failed',
            requestBody: requestBodyRaw,
            responseBody: responseBodyRaw,
            errorMessage: 'OpenRouter returned an empty response.',
          });
          await wait(backoff);
          continue;
        }

        onInteraction?.({
          stageId: interactionContext?.stageId ?? 'unknown',
          operationId: interactionContext?.operationId ?? 'unknown',
          requestType,
          provider: 'openrouter',
          modelId: settings.model,
          startedAt: new Date(attemptStartedAtMs).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - attemptStartedAtMs,
          attempts,
          retries,
          retryBackoffMs,
          status: 'succeeded',
          requestBody: requestBodyRaw,
          responseBody: responseBodyRaw,
          errorMessage: null,
        });

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
        onInteraction?.({
          stageId: interactionContext?.stageId ?? 'unknown',
          operationId: interactionContext?.operationId ?? 'unknown',
          requestType,
          provider: 'openrouter',
          modelId: settings.model,
          startedAt: new Date(attemptStartedAtMs).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - attemptStartedAtMs,
          attempts,
          retries,
          retryBackoffMs,
          status: 'failed',
          requestBody: requestBodyRaw,
          responseBody: responseBodyRaw,
          errorMessage: lastError.message,
        });
        if (attempt < maxAttempts - 1 && shouldRetryError(lastError)) {
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

function extractFirstUrlCitation(response: OpenRouterResponse): { url: string; title: string | null } | null {
  const annotations = response.choices?.[0]?.message?.annotations ?? [];
  for (const annotation of annotations) {
    if (annotation.type !== 'url_citation') {
      continue;
    }

    const url = annotation.url_citation?.url?.trim();
    if (!url) {
      continue;
    }

    return {
      url,
      title: annotation.url_citation?.title?.trim() || null,
    };
  }

  return null;
}

function extractFirstUrlFromText(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match?.[0] ?? null;
}

function isExplicitNoneResponse(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === 'none' || normalized === '"none"' || normalized === "'none'" || normalized === 'none.';
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

const MAX_RETRY_BACKOFF_MS = 60_000;

export function extractRetryAfterFromResponse(
  response: Response,
  json: OpenRouterResponse,
  rawBody: string,
): number | null {
  const headerValue = typeof response.headers?.get === 'function' ? response.headers.get('retry-after') : null;
  if (headerValue) {
    const numeric = Number.parseFloat(headerValue);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.round(numeric * 1000);
    }
    const dateMs = Date.parse(headerValue);
    if (Number.isFinite(dateMs)) {
      const diff = dateMs - Date.now();
      if (diff > 0) {
        return diff;
      }
    }
  }

  const metadata = json?.error?.metadata as Record<string, unknown> | undefined;
  if (metadata) {
    const fromMetadata = metadata['retry_after'] ?? metadata['retryAfter'];
    const numeric = toFiniteNumber(fromMetadata);
    if (numeric !== null && numeric > 0) {
      return Math.round(numeric * 1000);
    }
    const rawCandidate = metadata['raw'];
    if (typeof rawCandidate === 'string') {
      const fromRaw = extractRetryAfterFromString(rawCandidate);
      if (fromRaw !== null) {
        return fromRaw;
      }
    }
  }

  const fromBody = extractRetryAfterFromString(rawBody);
  if (fromBody !== null) {
    return fromBody;
  }

  return null;
}

function extractRetryAfterFromString(value: string): number | null {
  const bodyMatch = value.match(/\\?"retry_after\\?"\s*:\s*(\d+(?:\.\d+)?)/i);
  if (!bodyMatch) {
    return null;
  }
  const numeric = Number.parseFloat(bodyMatch[1]!);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 1000) : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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