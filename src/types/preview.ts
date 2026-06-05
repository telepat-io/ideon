import type { MetaJson } from './meta.js';

export interface PreviewArticleListItem {
  slug: string;
  title: string;
  mtime: number;
  previewSnippet: string;
  coverImageUrl: string | null;
  publication: string | null;
  series: string | null;
  keywords: string[];
}

export interface PreviewArticleOutput {
  id: string;
  contentType: string;
  contentTypeLabel: string;
  index: number;
  slug: string;
  title: string;
  htmlBody: string;
  markdownBody: string;
}

export interface PreviewEditorialPolicy {
  tone: string;
  forbiddenTopics: string[];
  disclosureRequirements: string[];
  audienceRestrictions: string[];
  notes: string;
}

export interface PreviewContentTarget {
  contentType: string;
  role: 'primary' | 'secondary';
  count: number;
}

export interface PreviewPublicationDefaults {
  style?: string;
  intent?: string;
  targetLength?: number;
  contentTargets?: PreviewContentTarget[];
  targetAudienceHint?: string;
  countryCodes?: string[];
  language?: string;
  maxImages?: number;
  maxLinks?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface PreviewPublicationSummary {
  name: string;
  slug: string;
  editorialPolicy: PreviewEditorialPolicy;
  defaults: PreviewPublicationDefaults;
}

export interface PreviewSeriesDefaults extends PreviewPublicationDefaults {
  keywords?: string[];
}

export interface PreviewSeriesSummary {
  name: string;
  slug: string;
  topic: string;
  publication?: string;
  editorialPolicy: PreviewEditorialPolicy;
  defaults: PreviewSeriesDefaults;
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
  metaJson: MetaJson | null;
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