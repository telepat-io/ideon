export type StageStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface StageViewModel {
  id: string;
  title: string;
  status: StageStatus;
  detail: string;
  summary?: string;
}

export interface PipelineArtifactSummary {
  title: string;
  slug: string;
  sectionCount: number;
  imageCount: number;
  markdownPath: string;
  assetDir: string;
}

export interface PipelineRunResult {
  stages: StageViewModel[];
  artifact: PipelineArtifactSummary;
}