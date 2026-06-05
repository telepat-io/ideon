import React from 'react';
import { Box } from 'ink';
import { ExpandFlow } from './expandFlow.js';
import { ExploreFlow } from './exploreFlow.js';

interface PlanExploreInput {
  contentIdea: string;
  publication: string;
  businessContext: string;
  countryCodes: string;
  language: string;
  seriesCount: string;
  articlesPerSeries: string;
  seedKeywords: string;
  excludeSeries: string;
  contentType: string;
}

interface PlanExpandInput {
  seriesSlug: string;
  publication: string;
  countryCodes: string;
  language: string;
  articleCount: string;
  seedKeywords: string;
  contentType: string;
}

interface PlanInputFlowProps {
  readonly mode: 'explore' | 'expand';
  readonly initialPublication?: string;
  readonly initialSeries?: string;
  readonly onDone: (result: PlanExploreInput | PlanExpandInput | null) => void;
}

export function PlanInputFlow({
  mode,
  initialPublication,
  initialSeries,
  onDone,
}: PlanInputFlowProps): React.JSX.Element {
  if (mode === 'expand') {
    return (
      <ExpandFlow
        initialPublication={initialPublication}
        initialSeries={initialSeries}
        onDone={onDone}
      />
    );
  }

  if (mode === 'explore') {
    return (
      <ExploreFlow
        initialPublication={initialPublication}
        onDone={onDone}
      />
    );
  }

  return <Box />;
}
