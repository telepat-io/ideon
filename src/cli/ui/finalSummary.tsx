import React from 'react';
import { Box, Text } from 'ink';
import type { PipelineArtifactSummary } from '../../pipeline/events.js';

export function FinalSummary({ artifact }: { artifact: PipelineArtifactSummary }): React.JSX.Element {
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
    </Box>
  );
}