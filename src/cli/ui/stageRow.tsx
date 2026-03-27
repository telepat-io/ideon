import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { StageViewModel } from '../../pipeline/events.js';

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const statusGlyph: Record<StageViewModel['status'], string> = {
  pending: '○',
  running: '◌',
  succeeded: '●',
  failed: '×',
};

const statusColor: Record<StageViewModel['status'], string> = {
  pending: 'gray',
  running: 'cyan',
  succeeded: 'green',
  failed: 'red',
};

function formatDuration(durationMs: number): string {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  return `${durationMs}ms`;
}

function formatStageCost(stage: StageViewModel): string {
  const analytics = stage.stageAnalytics;
  if (!analytics || analytics.costUsd === null) {
    return 'no cost data';
  }

  const formatted = `$${analytics.costUsd.toFixed(4)}`;
  return analytics.costSource === 'estimated' ? `~${formatted}` : formatted;
}

export function StageRow({ stage, isActive }: { stage: StageViewModel; isActive: boolean }): React.JSX.Element {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isActive || stage.status !== 'running') {
      setFrameIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % spinnerFrames.length);
    }, 80);

    return () => {
      clearInterval(timer);
    };
  }, [isActive, stage.status]);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={statusColor[stage.status]}>{isActive && stage.status === 'running' ? spinnerFrames[frameIndex] : statusGlyph[stage.status]}</Text>
        <Text> </Text>
        <Text bold={stage.status === 'running'}>{stage.title}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text color="gray">{stage.detail}</Text>
      </Box>
      {stage.summary ? (
        <Box marginLeft={2}>
          <Text color="green">{stage.summary}</Text>
        </Box>
      ) : null}
      {stage.status === 'succeeded' && stage.stageAnalytics ? (
        <Box marginLeft={2}>
          <Text color="gray">analytics: {formatDuration(stage.stageAnalytics.durationMs)} • cost: {formatStageCost(stage)}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
