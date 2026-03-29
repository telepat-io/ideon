import React from 'react';
import { Box, Text } from 'ink';
import type { PipelineArtifactSummary, PipelineRunAnalytics } from '../../pipeline/events.js';
import { buildFinalSummaryRows } from './finalSummaryModel.js';

export function FinalSummary({
  artifact,
  analytics,
}: {
  artifact: PipelineArtifactSummary;
  analytics: PipelineRunAnalytics;
}): React.JSX.Element {
  const rows = buildFinalSummaryRows({ artifact, analytics });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1} paddingY={0}>
      <Text bold color="green">
        Article Ready
      </Text>
      <Text>{artifact.title}</Text>
      {rows.map((row) => (
        <Box key={row.id}>
          {row.segments.map((segment) => (
            <Text key={segment.id} color={segment.color} bold={segment.bold}>
              {segment.text}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
}