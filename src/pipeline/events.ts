export type StageStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface StageItemViewModel {
  id: string;
  label: string;
  status: StageStatus;
  detail: string;
  summary?: string;
  analytics?: {
    durationMs: number;
    costUsd: number | null;
    costSource: CostSource;
  };
}

export interface StageViewModel {
  id: string;
  title: string;
  status: StageStatus;
  detail: string;
  summary?: string;
  items?: StageItemViewModel[];
  stageAnalytics?: {
    durationMs: number;
    costUsd: number | null;
    costSource: CostSource;
  };
}

export interface PipelineArtifactSummary {
  title: string;
  slug: string;
  sectionCount: number;
  imageCount: number;
  outputCount: number;
  generationDir: string;
  markdownPaths: string[];
  markdownPath: string;
  assetDir: string;
  analyticsPath: string;
}

export type CostSource = 'provider' | 'estimated' | 'unavailable';

export interface PipelineStageAnalytics {
  stageId: string;
  durationMs: number;
  startedAt: string;
  endedAt: string;
  retries: number;
  costUsd: number | null;
  costSource: CostSource;
}

export interface ImagePromptAnalytics {
  imageId: string;
  kind: 'cover' | 'inline';
  durationMs: number;
  attempts: number;
  retries: number;
  retryBackoffMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  costSource: CostSource;
  modelId: string;
}

export interface ImageRenderAnalytics {
  imageId: string;
  kind: 'cover' | 'inline';
  durationMs: number;
  attempts: number;
  retries: number;
  retryBackoffMs: number;
  outputBytes: number;
  costUsd: number | null;
  costSource: CostSource;
  modelId: string;
}

export interface OutputItemAnalytics {
  itemId: string;
  contentType: string;
  filePrefix: string;
  index: number;
  outputCountForType: number;
  durationMs: number;
  retries: number;
  costUsd: number | null;
  costSource: CostSource;
}

export interface LinkEnrichmentItemAnalytics {
  fileId: string;
  contentType: string;
  phraseCount: number;
  durationMs: number;
  retries: number;
  costUsd: number | null;
  costSource: CostSource;
}

export interface PipelineAnalyticsSummary {
  totalDurationMs: number;
  totalRetries: number;
  totalCostUsd: number | null;
  totalCostSource: CostSource;
}

export interface PipelineRunAnalytics {
  runId: string;
  runMode: 'fresh' | 'resume';
  dryRun: boolean;
  startedAt: string;
  endedAt: string;
  summary: PipelineAnalyticsSummary;
  stages: PipelineStageAnalytics[];
  imagePromptCalls: ImagePromptAnalytics[];
  imageRenderCalls: ImageRenderAnalytics[];
  outputItemCalls: OutputItemAnalytics[];
  linkEnrichmentCalls: LinkEnrichmentItemAnalytics[];
}

export interface PipelineRunResult {
  stages: StageViewModel[];
  artifact: PipelineArtifactSummary;
  analytics: PipelineRunAnalytics;
}