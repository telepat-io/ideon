import React from 'react';
import { Box, Text } from 'ink';
import type { PipelineArtifactSummary, PipelineRunAnalytics } from '../../pipeline/events.js';

function formatCost(costUsd: number | null): string {
  if (costUsd === null) {
    return 'unavailable';
  }

  return `$${costUsd.toFixed(4)}`;
}

export function FinalSummary({
  artifact,
  analytics,
}: {
  artifact: PipelineArtifactSummary;
  analytics: PipelineRunAnalytics;
}): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1} paddingY={0}>
      <Text bold color="green">
        Article Ready
      </Text>
      <Text>{artifact.title}</Text>
      <Text color="gray">slug: {artifact.slug}</Text>
      <Text color="gray">sections: {artifact.sectionCount} • images: {artifact.imageCount}</Text>
      <Text color="gray">markdown: {artifact.markdownPath}</Text>
      <Text color="gray">assets: {artifact.assetDir}</Text>
      <Text color="gray">analytics: {artifact.analyticsPath}</Text>
      <Text color="gray">
        duration: {analytics.summary.totalDurationMs}ms • retries: {analytics.summary.totalRetries} • cost: {formatCost(analytics.summary.totalCostUsd)}
      </Text>
    </Box>
  );
}