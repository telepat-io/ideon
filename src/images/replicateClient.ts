import Replicate from 'replicate';
import type { RetryStats } from '../pipeline/analytics.js';

export interface ReplicateRunMetrics extends RetryStats {
  durationMs: number;
  modelId: string;
}

export class ReplicateClient {
  private readonly client: Replicate;

  constructor(apiToken: string) {
    this.client = new Replicate({ auth: apiToken });
  }

  async runModel(
    model: string,
    input: Record<string, unknown>,
    options: { onMetrics?: (metrics: ReplicateRunMetrics) => void } = {},
  ): Promise<unknown> {
    let lastError: Error | null = null;
    const startedAtMs = Date.now();
    let attempts = 0;
    let retries = 0;
    let retryBackoffMs = 0;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      attempts = attempt + 1;
      try {
        const output = await this.client.run(model as `${string}/${string}` | `${string}/${string}:${string}`, { input });
        options.onMetrics?.({
          durationMs: Date.now() - startedAtMs,
          attempts,
          retries,
          retryBackoffMs,
          modelId: model,
        });
        return output;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown Replicate client error.');
        if (attempt < 2 && shouldRetryError(lastError)) {
          const backoff = backoffMs(attempt);
          retries += 1;
          retryBackoffMs += backoff;
          await wait(backoff);
          continue;
        }

        break;
      }
    }

    throw lastError ?? new Error('Replicate request failed.');
  }
}

function shouldRetryError(error: Error): boolean {
  return /timeout|network|fetch|temporarily|rate|429|500|502|503|504/i.test(error.message);
}

function backoffMs(attempt: number): number {
  return 500 * (attempt + 1);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}