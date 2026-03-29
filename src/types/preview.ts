export interface PreviewArticleListItem {
  slug: string;
  title: string;
  mtime: number;
  previewSnippet: string;
  coverImageUrl: string | null;
}

export interface PreviewArticleOutput {
  id: string;
  contentType: string;
  contentTypeLabel: string;
  index: number;
  slug: string;
  title: string;
  htmlBody: string;
}

export interface PreviewLlmInteraction {
  stageId: string;
  operationId: string;
  requestType: 'structured' | 'text' | 'web-search';
  provider: 'openrouter';
  modelId: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  attempts: number;
  retries: number;
  retryBackoffMs: number;
  status: 'succeeded' | 'failed';
  requestBody: string;
  responseBody: string | null;
  errorMessage: string | null;
}

export interface PreviewT2IInteraction {
  stageId: 'images';
  operationId: string;
  provider: 'replicate' | 'replicate-dry-run';
  modelId: string;
  kind: 'cover' | 'inline';
  startedAt: string;
  endedAt: string;
  durationMs: number;
  attempts: number;
  retries: number;
  retryBackoffMs: number;
  status: 'succeeded' | 'failed';
  prompt: string;
  input: Record<string, unknown>;
  errorMessage: string | null;
}

export interface PreviewInteractionsPayload {
  llmCalls: PreviewLlmInteraction[];
  t2iCalls: PreviewT2IInteraction[];
}

export interface PreviewAnalyticsSummary {
  totalDurationMs: number | null;
  totalCostUsd: number | null;
  totalCostSource: string | null;
}

export interface PreviewArticleContent {
  title: string;
  generationId: string;
  sourcePath: string;
  interactions: PreviewInteractionsPayload;
  analyticsSummary: PreviewAnalyticsSummary | null;
  outputs: PreviewArticleOutput[];
}

export interface PreviewBootstrapData {
  title: string;
  sourcePath: string;
  currentSlug: string;
  emptyStateMessage: string | null;
}

export interface NormalizedPreviewInteraction {
  id: string;
  source: 'llm' | 't2i';
  stageId: string;
  operationId: string;
  status: string;
  requestType: string;
  provider: string;
  modelId: string;
  durationMs: number;
  raw: PreviewLlmInteraction | PreviewT2IInteraction;
}