import type {
  NormalizedPreviewInteraction,
  PreviewArticleOutput,
  PreviewInteractionsPayload,
  PreviewLlmInteraction,
  PreviewT2IInteraction,
} from '../types/preview.js';

export const contentTypeOrder = [
  'article',
  'blog-post',
  'x-thread',
  'x-post',
  'linkedin-post',
  'reddit-post',
  'newsletter',
  'landing-page-copy',
] as const;

export const interactionStageOrder = [
  'shared-brief',
  'planning',
  'sections',
  'image-prompts',
  'images',
  'output',
  'links',
] as const;

export interface InteractionTextSnapshot {
  promptText: string;
  responseText: string;
}

export function groupOutputsByType(outputs: PreviewArticleOutput[]): Record<string, PreviewArticleOutput[]> {
  return outputs.reduce<Record<string, PreviewArticleOutput[]>>((accumulator, output) => {
    const key = output.contentType || 'article';
    const bucket = accumulator[key] ?? [];
    bucket.push(output);
    bucket.sort((left, right) => left.index - right.index);
    accumulator[key] = bucket;
    return accumulator;
  }, {});
}

export function sortContentTypes(contentTypes: string[]): string[] {
  return [...contentTypes].sort((left, right) => {
    const leftIndex = contentTypeOrder.indexOf(left as (typeof contentTypeOrder)[number]);
    const rightIndex = contentTypeOrder.indexOf(right as (typeof contentTypeOrder)[number]);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    if (normalizedLeft !== normalizedRight) {
      return normalizedLeft - normalizedRight;
    }

    return left.localeCompare(right);
  });
}

export function normalizeInteractions(payload: PreviewInteractionsPayload | null | undefined): NormalizedPreviewInteraction[] {
  const llmCalls = Array.isArray(payload?.llmCalls) ? payload.llmCalls : [];
  const t2iCalls = Array.isArray(payload?.t2iCalls) ? payload.t2iCalls : [];

  const normalizedLlm = llmCalls.map<NormalizedPreviewInteraction>((call, index) => ({
    id: `llm-${index}`,
    source: 'llm',
    stageId: String(call.stageId || 'unknown'),
    operationId: String(call.operationId || ''),
    status: String(call.status || ''),
    requestType: String(call.requestType || ''),
    provider: String(call.provider || ''),
    modelId: String(call.modelId || ''),
    durationMs: Number(call.durationMs || 0),
    raw: call,
  }));

  const normalizedT2i = t2iCalls.map<NormalizedPreviewInteraction>((call, index) => ({
    id: `t2i-${index}`,
    source: 't2i',
    stageId: String(call.stageId || 'images'),
    operationId: String(call.operationId || ''),
    status: String(call.status || ''),
    requestType: 't2i',
    provider: String(call.provider || ''),
    modelId: String(call.modelId || ''),
    durationMs: Number(call.durationMs || 0),
    raw: call,
  }));

  return normalizedLlm.concat(normalizedT2i).sort((left, right) => {
    const leftTime = new Date(getInteractionStartedAt(left.raw)).getTime();
    const rightTime = new Date(getInteractionStartedAt(right.raw)).getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id.localeCompare(right.id);
  });
}

export function groupInteractionsByStage(interactions: NormalizedPreviewInteraction[]): Array<{
  stageId: string;
  items: NormalizedPreviewInteraction[];
}> {
  const grouped = interactions.reduce<Record<string, NormalizedPreviewInteraction[]>>((accumulator, interaction) => {
    const bucket = accumulator[interaction.stageId] ?? [];
    bucket.push(interaction);
    accumulator[interaction.stageId] = bucket;
    return accumulator;
  }, {});

  return Object.keys(grouped)
    .sort((left, right) => {
      const leftIndex = interactionStageOrder.indexOf(left as (typeof interactionStageOrder)[number]);
      const rightIndex = interactionStageOrder.indexOf(right as (typeof interactionStageOrder)[number]);
      const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

      if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight;
      }

      return left.localeCompare(right);
    })
    .map((stageId) => ({
      stageId,
      items: grouped[stageId] ?? [],
    }));
}

export function extractInteractionTextSnapshot(interaction: NormalizedPreviewInteraction): InteractionTextSnapshot {
  if (interaction.source === 't2i') {
    const raw = interaction.raw as PreviewT2IInteraction;
    return {
      promptText: String(raw.prompt || ''),
      responseText: raw.errorMessage
        ? `Error: ${raw.errorMessage}`
        : 'Image request completed. Inspect Full JSON for the resolved input payload.',
    };
  }

  const raw = interaction.raw as PreviewLlmInteraction;
  const requestBody = parseJsonSafely(raw.requestBody) as {
    messages?: Array<{ role?: unknown; content?: unknown }>;
  } | null;
  const responseBody = parseJsonSafely(raw.responseBody) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;
  const promptText = Array.isArray(requestBody?.messages)
    ? requestBody.messages
      .map((message: { role?: unknown; content?: unknown }) => {
        return `[${String(message.role || 'unknown')}]\n${String(message.content || '')}`;
      })
      .join('\n\n---\n\n')
    : String(raw.requestBody || '');
  const responseText = typeof responseBody?.choices?.[0]?.message?.content === 'string'
    ? responseBody.choices[0].message.content
    : typeof responseBody?.error?.message === 'string'
      ? `Error: ${responseBody.error.message}`
      : String(raw.responseBody || raw.errorMessage || '');

  return {
    promptText,
    responseText,
  };
}

export function formatPreviewDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

export function sanitizeClassName(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function describeInteraction(interaction: NormalizedPreviewInteraction): string {
  if (interaction.source === 'llm') {
    return `${interaction.requestType || 'text'} • ${interaction.status || 'unknown'}`;
  }

  return `${interaction.provider || 'replicate'} • ${interaction.status || 'unknown'}`;
}

function getInteractionStartedAt(raw: PreviewLlmInteraction | PreviewT2IInteraction): string {
  return 'startedAt' in raw ? raw.startedAt : '';
}

function parseJsonSafely(value: string | null): unknown {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}