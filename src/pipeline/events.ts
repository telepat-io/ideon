export type StageStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface StageViewModel {
  id: string;
  title: string;
  status: StageStatus;
  detail: string;
  summary?: string;
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
}

export interface PipelineRunResult {
  stages: StageViewModel[];
  artifact: PipelineArtifactSummary;
  analytics: PipelineRunAnalytics;
}