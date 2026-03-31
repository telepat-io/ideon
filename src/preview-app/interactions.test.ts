import type { PreviewInteractionsPayload } from '../types/preview.js';
import {
  describeInteraction,
  extractInteractionTextSnapshot,
  groupInteractionsByStage,
  groupOutputsByType,
  normalizeInteractions,
  sanitizeClassName,
  sortContentTypes,
} from './interactions.js';

describe('preview interaction utilities', () => {
  it('groups outputs by type, sorts indices, and defaults empty content types to article', () => {
    const grouped = groupOutputsByType([
      {
        id: 'x-post-2',
        contentType: 'x-post',
        contentTypeLabel: 'X Post',
        index: 2,
        slug: 'rome',
        title: 'Second',
        htmlBody: '<p>Second</p>',
      },
      {
        id: 'article-1',
        contentType: '',
        contentTypeLabel: 'Article',
        index: 1,
        slug: 'rome',
        title: 'Primary',
        htmlBody: '<p>Primary</p>',
      },
      {
        id: 'x-post-1',
        contentType: 'x-post',
        contentTypeLabel: 'X Post',
        index: 1,
        slug: 'rome',
        title: 'First',
        htmlBody: '<p>First</p>',
      },
    ]);

    expect(Object.keys(grouped).sort()).toEqual(['article', 'x-post']);
    expect(grouped.article?.map((output) => output.id)).toEqual(['article-1']);
    expect(grouped['x-post']?.map((output) => output.id)).toEqual(['x-post-1', 'x-post-2']);
  });

  it('orders known content types before unknown values and sorts unknown values alphabetically', () => {
    expect(sortContentTypes(['newsletter', 'custom-b', 'article', 'custom-a', 'x-post'])).toEqual([
      'article',
      'x-post',
      'newsletter',
      'custom-a',
      'custom-b',
    ]);
  });

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

  it('groups interactions by stage with known stages first and unknown stages after them', () => {
    const grouped = groupInteractionsByStage([
      {
        id: 'llm-0',
        source: 'llm',
        stageId: 'custom-stage',
        operationId: 'one',
        status: 'succeeded',
        requestType: 'structured',
        provider: 'openrouter',
        modelId: 'model-a',
        durationMs: 1,
        raw: {
          stageId: 'custom-stage',
          operationId: 'one',
          requestType: 'structured',
          provider: 'openrouter',
          modelId: 'model-a',
          startedAt: '2026-03-28T12:00:02.000Z',
          endedAt: '2026-03-28T12:00:03.000Z',
          durationMs: 1,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          status: 'succeeded',
          requestBody: '{}',
          responseBody: '{}',
          errorMessage: null,
        },
      },
      {
        id: 'llm-1',
        source: 'llm',
        stageId: 'planning',
        operationId: 'two',
        status: 'succeeded',
        requestType: 'structured',
        provider: 'openrouter',
        modelId: 'model-b',
        durationMs: 1,
        raw: {
          stageId: 'planning',
          operationId: 'two',
          requestType: 'structured',
          provider: 'openrouter',
          modelId: 'model-b',
          startedAt: '2026-03-28T12:00:00.000Z',
          endedAt: '2026-03-28T12:00:01.000Z',
          durationMs: 1,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          status: 'succeeded',
          requestBody: '{}',
          responseBody: '{}',
          errorMessage: null,
        },
      },
    ]);

    expect(grouped.map((group) => group.stageId)).toEqual(['planning', 'custom-stage']);
  });

  it('normalizes missing interaction payloads and fallback values', () => {
    expect(normalizeInteractions(null)).toEqual([]);

    const normalized = normalizeInteractions({
      llmCalls: [
        {
          stageId: '' as never,
          operationId: '' as never,
          requestType: '' as never,
          provider: '' as never,
          modelId: '' as never,
          startedAt: '2026-03-28T12:00:01.000Z',
          endedAt: '2026-03-28T12:00:02.000Z',
          durationMs: 0,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          status: '' as never,
          requestBody: '',
          responseBody: null,
          errorMessage: null,
        },
      ],
      t2iCalls: [
        {
          stageId: 'images',
          operationId: '',
          provider: '' as never,
          modelId: '',
          kind: 'cover',
          startedAt: '2026-03-28T12:00:00.000Z',
          endedAt: '2026-03-28T12:00:01.000Z',
          durationMs: 0,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          status: '' as never,
          prompt: '',
          input: {},
          errorMessage: null,
        },
      ],
    });

    expect(normalized.map((interaction) => interaction.id)).toEqual(['t2i-0', 'llm-0']);
    expect(normalized[1]).toEqual(expect.objectContaining({
      stageId: 'unknown',
      operationId: '',
      requestType: '',
      provider: '',
      status: '',
    }));
    expect(normalized[0]).toEqual(expect.objectContaining({
      stageId: 'images',
      requestType: 't2i',
      provider: '',
      status: '',
    }));
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

  it('falls back to raw request and error payloads when interaction json cannot be parsed', () => {
    const [llmInteraction] = normalizeInteractions({
      llmCalls: [
        {
          stageId: 'links',
          operationId: 'resolve-links',
          requestType: 'web-search',
          provider: 'openrouter',
          modelId: 'model-a',
          startedAt: '2026-03-28T12:00:00.000Z',
          endedAt: '2026-03-28T12:00:01.000Z',
          durationMs: 1000,
          attempts: 1,
          retries: 0,
          retryBackoffMs: 0,
          status: 'failed',
          requestBody: 'raw request body',
          responseBody: '{not valid json',
          errorMessage: 'search backend failed',
        },
      ],
      t2iCalls: [],
    });

    expect(extractInteractionTextSnapshot(llmInteraction)).toEqual({
      promptText: 'raw request body',
      responseText: '{not valid json',
    });
  });

  it('uses nested response errors and image success fallbacks when no direct text exists', () => {
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
          status: 'failed',
          requestBody: JSON.stringify({ messages: [] }),
          responseBody: JSON.stringify({ error: { message: 'rate limit' } }),
          errorMessage: 'ignored because structured error exists',
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
          status: 'succeeded',
          prompt: 'Forum at dawn',
          input: {},
          errorMessage: null,
        },
      ],
    });

    expect(extractInteractionTextSnapshot(llmInteraction)).toEqual({
      promptText: '',
      responseText: 'Error: rate limit',
    });
    expect(extractInteractionTextSnapshot(imageInteraction)).toEqual({
      promptText: 'Forum at dawn',
      responseText: 'Image request completed. Inspect Full JSON for the resolved input payload.',
    });
  });

  it('sanitizes css class names and describes llm/t2i interactions with fallbacks', () => {
    expect(sanitizeClassName('  LinkedIn Post!!  ')).toBe('linkedin-post');
    expect(sanitizeClassName('')).toBe('');

    expect(describeInteraction({
      id: 'llm-0',
      source: 'llm',
      stageId: 'planning',
      operationId: 'outline',
      status: '',
      requestType: '',
      provider: 'openrouter',
      modelId: 'model-a',
      durationMs: 1,
      raw: {
        stageId: 'planning',
        operationId: 'outline',
        requestType: 'structured',
        provider: 'openrouter',
        modelId: 'model-a',
        startedAt: '2026-03-28T12:00:00.000Z',
        endedAt: '2026-03-28T12:00:01.000Z',
        durationMs: 1,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        status: 'succeeded',
        requestBody: '{}',
        responseBody: '{}',
        errorMessage: null,
      },
    })).toBe('text • unknown');

    expect(describeInteraction({
      id: 't2i-0',
      source: 't2i',
      stageId: 'images',
      operationId: 'cover',
      status: '',
      requestType: 't2i',
      provider: '',
      modelId: 'model-b',
      durationMs: 1,
      raw: {
        stageId: 'images',
        operationId: 'cover',
        provider: 'replicate',
        modelId: 'model-b',
        kind: 'cover',
        startedAt: '2026-03-28T12:00:00.000Z',
        endedAt: '2026-03-28T12:00:01.000Z',
        durationMs: 1,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        status: 'succeeded',
        prompt: 'scene',
        input: {},
        errorMessage: null,
      },
    })).toBe('replicate • unknown');
  });
});