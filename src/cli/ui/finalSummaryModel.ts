import type { PipelineArtifactSummary, PipelineRunAnalytics } from '../../pipeline/events.js';

export type FinalSummarySegment = {
  id: string;
  text: string;
  color?: string;
  bold?: boolean;
};

export type FinalSummaryRow = {
  id: string;
  segments: FinalSummarySegment[];
};

function formatCost(costUsd: number | null): string {
  if (costUsd === null) {
    return 'unavailable';
  }

  return `$${costUsd.toFixed(4)}`;
}

function label(id: string, text: string, color: string): FinalSummarySegment {
  return { id, text, color, bold: true };
}

function separator(id: string, text = ' • '): FinalSummarySegment {
  return { id, text, color: 'gray' };
}

function colon(id: string): FinalSummarySegment {
  return { id, text: ': ', color: 'gray' };
}

function value(id: string, text: string): FinalSummarySegment {
  return { id, text, color: 'white' };
}

function formatStageCost(costUsd: number | null, costSource: PipelineRunAnalytics['stages'][number]['costSource']): string {
  const formatted = formatCost(costUsd);
  if (costUsd === null) {
    return formatted;
  }

  return costSource === 'estimated' ? `~${formatted}` : formatted;
}

function formatStageId(stageId: string): string {
  if (stageId === 'shared-brief') return 'shared-brief';
  if (stageId === 'planning') return 'planning';
  if (stageId === 'sections') return 'sections';
  if (stageId === 'image-prompts') return 'image-prompts';
  if (stageId === 'images') return 'images';
  if (stageId === 'output') return 'output';
  if (stageId === 'links') return 'links';
  return stageId;
}

export function buildFinalSummaryRows({
  artifact,
  analytics,
}: {
  artifact: PipelineArtifactSummary;
  analytics: PipelineRunAnalytics;
}): FinalSummaryRow[] {
  const rows: FinalSummaryRow[] = [
    {
      id: 'slug',
      segments: [
        label('slug-label', 'slug', 'cyanBright'),
        colon('slug-colon'),
        value('slug-value', artifact.slug),
      ],
    },
    {
      id: 'counts',
      segments: [
        label('sections-label', 'sections', 'yellowBright'),
        colon('sections-colon'),
        value('sections-value', String(artifact.sectionCount)),
        separator('sections-separator'),
        label('images-label', 'images', 'magentaBright'),
        colon('images-colon'),
        value('images-value', String(artifact.imageCount)),
        separator('images-separator'),
        label('outputs-label', 'outputs', 'greenBright'),
        colon('outputs-colon'),
        value('outputs-value', String(artifact.outputCount)),
      ],
    },
    {
      id: 'generation',
      segments: [
        label('generation-label', 'generation', 'blueBright'),
        colon('generation-colon'),
        value('generation-value', artifact.generationDir),
      ],
    },
    {
      id: 'metrics',
      segments: [
        label('duration-label', 'duration', 'cyanBright'),
        colon('duration-colon'),
        value('duration-value', `${analytics.summary.totalDurationMs}ms`),
        separator('duration-separator'),
        label('retries-label', 'retries', 'yellowBright'),
        colon('retries-colon'),
        value('retries-value', String(analytics.summary.totalRetries)),
        separator('retries-separator'),
        label('cost-label', 'cost', 'greenBright'),
        colon('cost-colon'),
        value('cost-value', formatCost(analytics.summary.totalCostUsd)),
      ],
    },
  ];

  const stageCostRows = analytics.stages.map((stage) => ({
    id: `stage-cost:${stage.stageId}`,
    segments: [
      label(`stage-cost-label:${stage.stageId}`, `cost/${formatStageId(stage.stageId)}`, 'greenBright'),
      colon(`stage-cost-colon:${stage.stageId}`),
      value(`stage-cost-value:${stage.stageId}`, formatStageCost(stage.costUsd, stage.costSource)),
    ],
  }));

  rows.push(...stageCostRows);
  return rows;
}