import React from 'react';
import { Box, Text } from 'ink';
import { FinalSummary } from './finalSummary.js';
import { StageRow } from './stageRow.js';
import type { PipelineRunResult, StageViewModel } from '../../pipeline/events.js';
import { computeMaxVisibleItemsPerStage, getVisibleStages } from './progressVisibility.js';

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
  const visibleStages = getVisibleStages(stages);
  const maxVisibleItems = computeMaxVisibleItemsPerStage({
    terminalRows: process.stdout.rows,
    visibleStageCount: visibleStages.length,
    hasError: Boolean(errorMessage),
    hasResult: Boolean(result),
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyanBright">
        Ideon Pipeline
      </Text>
      <Text color="gray">{prompt}</Text>
      <Box marginTop={1} flexDirection="column">
        {visibleStages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            isActive={stage.status === 'running'}
            showPendingItems={false}
            maxVisibleItems={maxVisibleItems}
          />
        ))}
      </Box>
      {errorMessage ? (
        <Box marginTop={1} borderStyle="round" borderColor="red" paddingX={1}>
          <Text color="red">{errorMessage}</Text>
        </Box>
      ) : null}
      {result ? (
        <Box marginTop={1}>
          <FinalSummary artifact={result.artifact} analytics={result.analytics} />
        </Box>
      ) : null}
    </Box>
  );
}