export interface RetryOptions {
  operationLabel: string;
  maxAttempts: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  jitterMs?: number;
  onRetry?: (info: RetryInfo) => void;
  sleep?: (ms: number) => Promise<void>;
  randomFraction?: () => number;
}

export interface RetryInfo {
  attempt: number;
  delayMs: number;
  reason: string;
  statusCode?: number;
}

export interface RetryClassification {
  retryable: boolean;
  statusCode?: number;
  retryAfterMs?: number;
  reason: string;
}

const DEFAULT_BASE_BACKOFF_MS = 1500;
const DEFAULT_MAX_BACKOFF_MS = 60_000;
const DEFAULT_JITTER_MS = 250;

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429]);

const TRANSIENT_ERROR_PATTERN = /timeout|network|fetch|temporarily|aborted|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|socket hang up/i;

export async function withRetry<T>(op: (attempt: number) => Promise<T>, opts: RetryOptions): Promise<T> {
  const maxAttempts = Math.max(1, Math.floor(opts.maxAttempts));
  const baseBackoffMs = opts.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
  const maxBackoffMs = opts.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  const jitterMs = opts.jitterMs ?? DEFAULT_JITTER_MS;
  const sleep = opts.sleep ?? defaultSleep;
  const randomFraction = opts.randomFraction ?? Math.random;

  let lastError: unknown;
  let lastClassification: RetryClassification | null = null;
  let attemptsMade = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attemptsMade = attempt;
    try {
      return await op(attempt);
    } catch (error) {
      lastError = error;
      const classification = classifyHttpError(error);
      lastClassification = classification;

      if (!classification.retryable || attempt >= maxAttempts) {
        break;
      }

      const delayMs = computeDelayMs({
        retryAfterMs: classification.retryAfterMs,
        attempt,
        baseBackoffMs,
        maxBackoffMs,
        jitterMs,
        randomFraction,
      });

      opts.onRetry?.({
        attempt,
        delayMs,
        reason: classification.reason,
        statusCode: classification.statusCode,
      });

      await sleep(delayMs);
    }
  }

  throw buildFinalError(opts.operationLabel, attemptsMade, lastError, lastClassification);
}

interface DelayInput {
  retryAfterMs: number | undefined;
  attempt: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  jitterMs: number;
  randomFraction: () => number;
}

function computeDelayMs(input: DelayInput): number {
  if (typeof input.retryAfterMs === 'number' && input.retryAfterMs > 0) {
    return Math.min(input.maxBackoffMs, input.retryAfterMs);
  }

  const exponential = input.baseBackoffMs * 2 ** (input.attempt - 1);
  const capped = Math.min(input.maxBackoffMs, exponential);
  const jitter = input.jitterMs > 0 ? input.randomFraction() * input.jitterMs : 0;
  return Math.floor(capped + jitter);
}

export function classifyHttpError(error: unknown): RetryClassification {
  if (!error) {
    return { retryable: true, reason: 'Empty error value treated as transient.' };
  }

  const message = errorMessage(error);
  const statusFromObject = extractStatusFromObject(error);
  const statusFromMessage = statusFromObject ?? extractStatusFromMessage(message);
  const retryAfterMs = extractRetryAfterMs(error, message);

  if (statusFromMessage !== undefined) {
    if (RETRYABLE_STATUS_CODES.has(statusFromMessage) || statusFromMessage >= 500) {
      return {
        retryable: true,
        statusCode: statusFromMessage,
        retryAfterMs,
        reason: `HTTP ${statusFromMessage}`,
      };
    }

    return {
      retryable: false,
      statusCode: statusFromMessage,
      reason: `HTTP ${statusFromMessage}`,
    };
  }

  if (TRANSIENT_ERROR_PATTERN.test(message)) {
    return {
      retryable: true,
      retryAfterMs,
      reason: 'Transient network or timeout error.',
    };
  }

  return {
    retryable: true,
    retryAfterMs,
    reason: 'Unknown error treated as transient.',
  };
}

function extractStatusFromObject(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const record = error as Record<string, unknown>;
  const direct = numberFrom(record.status);
  if (direct !== undefined) {
    return direct;
  }

  const response = record.response;
  if (typeof response === 'object' && response !== null) {
    const responseStatus = numberFrom((response as Record<string, unknown>).status);
    if (responseStatus !== undefined) {
      return responseStatus;
    }
  }

  return undefined;
}

function extractStatusFromMessage(message: string): number | undefined {
  const match = message.match(/status\s+(\d{3})/i);
  if (!match) {
    return undefined;
  }

  const parsed = Number.parseInt(match[1]!, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function extractRetryAfterMs(error: unknown, message: string): number | undefined {
  const headerSeconds = extractRetryAfterHeader(error);
  if (headerSeconds !== undefined) {
    return Math.round(headerSeconds * 1000);
  }

  const bodyMatch = message.match(/"?retry_after"?\s*[:=]\s*(\d+(?:\.\d+)?)/i);
  if (bodyMatch) {
    const seconds = Number.parseFloat(bodyMatch[1]!);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.round(seconds * 1000);
    }
  }

  return undefined;
}

function extractRetryAfterHeader(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const response = (error as Record<string, unknown>).response;
  if (typeof response !== 'object' || response === null) {
    return undefined;
  }

  const headers = (response as Record<string, unknown>).headers;
  if (!headers) {
    return undefined;
  }

  let rawValue: unknown;
  if (typeof headers === 'object' && typeof (headers as { get?: unknown }).get === 'function') {
    rawValue = (headers as { get: (name: string) => unknown }).get('retry-after');
  } else if (typeof headers === 'object') {
    const entries = headers as Record<string, unknown>;
    rawValue = entries['retry-after'] ?? entries['Retry-After'];
  }

  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
    return undefined;
  }

  const stringValue = String(rawValue).trim();
  if (!stringValue) {
    return undefined;
  }

  const numeric = Number.parseFloat(stringValue);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const dateMs = Date.parse(stringValue);
  if (Number.isFinite(dateMs)) {
    const diffSeconds = (dateMs - Date.now()) / 1000;
    return diffSeconds > 0 ? diffSeconds : undefined;
  }

  return undefined;
}

function numberFrom(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function buildFinalError(
  operationLabel: string,
  attempts: number,
  cause: unknown,
  classification: RetryClassification | null,
): Error {
  const detail = errorMessage(cause) || classification?.reason || 'unknown error';
  const message = `${operationLabel} failed after ${attempts} attempt${attempts === 1 ? '' : 's'}: ${detail}`;
  const wrapped = new Error(message, cause instanceof Error ? { cause } : undefined);
  if (!(cause instanceof Error) && cause !== undefined) {
    (wrapped as { cause?: unknown }).cause = cause;
  }
  return wrapped;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
