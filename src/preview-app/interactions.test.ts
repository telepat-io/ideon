import type { PreviewInteractionsPayload } from '../types/preview.js';
import { extractInteractionTextSnapshot, normalizeInteractions } from './interactions.js';

describe('preview interaction utilities', () => {
  it('sorts LLM and T2I interactions chronologically', () => {
    const payload: PreviewInteractionsPayload = {
      llmCalls: [
        {
          stageId: 'sections',
          operationId: 'body-copy',
          requestType: 'text',
          provider: 'openrouter',
          modelId: 'model-a',
          startedAt: '2026-03-28T12:00:02.000Z',
          endedAt: '2026-03-28T12:00:03.000Z',
          durationMs: 1000,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          status: 'succeeded',
          requestBody: '{}',
          responseBody: '{}',
          errorMessage: null,
        },
      ],
      t2iCalls: [
        {
          stageId: 'images',
          operationId: 'cover-image',
          provider: 'replicate',
          modelId: 'model-b',
          kind: 'cover',
          startedAt: '2026-03-28T12:00:01.000Z',
          endedAt: '2026-03-28T12:00:05.000Z',
          durationMs: 4000,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          status: 'succeeded',
          prompt: 'Forum at dawn',
          input: {},
          errorMessage: null,
        },
      ],
    };

    const normalized = normalizeInteractions(payload);

    expect(normalized.map((interaction) => interaction.id)).toEqual(['t2i-0', 'llm-0']);
  });

  it('extracts text snapshots for structured LLM and image interactions', () => {
    const [llmInteraction] = normalizeInteractions({
      llmCalls: [
        {
          stageId: 'planning',
          operationId: 'outline',
          requestType: 'structured',
          provider: 'openrouter',
          modelId: 'model-a',
          startedAt: '2026-03-28T12:00:00.000Z',
          endedAt: '2026-03-28T12:00:01.000Z',
          durationMs: 1000,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          status: 'succeeded',
          requestBody: JSON.stringify({
            messages: [{ role: 'user', content: 'Plan this article.' }],
          }),
          responseBody: JSON.stringify({
            choices: [{ message: { content: 'Outline response.' } }],
          }),
          errorMessage: null,
        },
      ],
      t2iCalls: [],
    });

    const [imageInteraction] = normalizeInteractions({
      llmCalls: [],
      t2iCalls: [
        {
          stageId: 'images',
          operationId: 'cover-image',
          provider: 'replicate',
          modelId: 'model-b',
          kind: 'cover',
          startedAt: '2026-03-28T12:00:02.000Z',
          endedAt: '2026-03-28T12:00:04.000Z',
          durationMs: 2000,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          status: 'failed',
          prompt: 'Forum at dawn',
          input: {},
          errorMessage: 'Model timeout',
        },
      ],
    });

    expect(extractInteractionTextSnapshot(llmInteraction)).toEqual({
      promptText: '[user]\nPlan this article.',
      responseText: 'Outline response.',
    });

    expect(extractInteractionTextSnapshot(imageInteraction)).toEqual({
      promptText: 'Forum at dawn',
      responseText: 'Error: Model timeout',
    });
  });
});