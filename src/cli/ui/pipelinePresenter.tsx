import React from 'react';
import { Box, Text } from 'ink';
import { FinalSummary } from './finalSummary.js';
import { StageRow } from './stageRow.js';
import type { PipelineRunResult, StageViewModel } from '../../pipeline/events.js';

export function PipelinePresenter({
  prompt,
  stages,
  result,
  errorMessage,
}: {
  prompt: string;
  stages: StageViewModel[];
  result: PipelineRunResult | null;
  errorMessage?: string | null;
}): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyanBright">
        Ideon Pipeline
      </Text>
      <Text color="gray">{prompt}</Text>
      <Box marginTop={1} flexDirection="column">
        {stages.map((stage) => (
          <StageRow key={stage.id} stage={stage} isActive={stage.status === 'running'} />
        ))}
      </Box>
      {errorMessage ? (
        <Box marginTop={1} borderStyle="round" borderColor="red" paddingX={1}>
          <Text color="red">{errorMessage}</Text>
        </Box>
      ) : null}
      {result ? (
        <Box marginTop={1}>
          <FinalSummary artifact={result.artifact} />
        </Box>
      ) : null}
    </Box>
  );
}