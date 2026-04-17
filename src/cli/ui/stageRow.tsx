import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { StageItemViewModel, StageViewModel } from '../../pipeline/events.js';
import { getVisibleItems } from './progressVisibility.js';

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

function formatRetryContext(stage: StageViewModel): string {
  if (!stage.retryCount || stage.retryCount <= 0) {
    return '';
  }

  if (stage.lastRetryError) {
    return ` • retried ${stage.retryCount}x • last error: ${stage.lastRetryError}`;
  }

  return ` • retried ${stage.retryCount}x`;
}

export function StageRow({
  stage,
  isActive,
  showPendingItems = false,
  maxVisibleItems = 12,
}: {
  stage: StageViewModel;
  isActive: boolean;
  showPendingItems?: boolean;
  maxVisibleItems?: number;
}): React.JSX.Element {
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
        <Text color="gray">{stage.detail}{formatRetryContext(stage)}</Text>
      </Box>
      <ItemRows
        items={stage.items ?? []}
        showPendingItems={showPendingItems}
        maxVisibleItems={maxVisibleItems}
        isStageActive={isActive}
      />
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

function ItemRows({
  items,
  showPendingItems,
  maxVisibleItems,
  isStageActive,
}: {
  items: StageItemViewModel[];
  showPendingItems: boolean;
  maxVisibleItems: number;
  isStageActive: boolean;
}): React.JSX.Element | null {
  const { visibleItems, overflow } = getVisibleItems(items, showPendingItems, maxVisibleItems);
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <Box marginLeft={2} flexDirection="column">
      {overflow > 0 ? (
        <Text color="gray">... {overflow} earlier items</Text>
      ) : null}
      {visibleItems.map((item) => (
        <ItemRow key={item.id} item={item} isActive={isStageActive && item.status === 'running'} />
      ))}
    </Box>
  );
}

function ItemRow({ item, isActive }: { item: StageItemViewModel; isActive: boolean }): React.JSX.Element {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isActive || item.status !== 'running') {
      setFrameIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % spinnerFrames.length);
    }, 80);

    return () => {
      clearInterval(timer);
    };
  }, [isActive, item.status]);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={statusColor[item.status]}>{isActive && item.status === 'running' ? spinnerFrames[frameIndex] : statusGlyph[item.status]}</Text>
        <Text> </Text>
        <Text bold={item.status === 'running'}>{item.label}</Text>
        <Text color="gray"> - {item.detail}</Text>
      </Box>
      {item.summary ? (
        <Box marginLeft={2}>
          <Text color="green">{item.summary}</Text>
        </Box>
      ) : null}
      {item.status === 'succeeded' && item.analytics ? (
        <Box marginLeft={2}>
          <Text color="gray">analytics: {formatDuration(item.analytics.durationMs)} • cost: {formatItemCost(item)}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

function formatItemCost(item: StageItemViewModel): string {
  if (!item.analytics || item.analytics.costUsd === null) {
    return 'no cost data';
  }

  const formatted = `$${item.analytics.costUsd.toFixed(4)}`;
  return item.analytics.costSource === 'estimated' ? `~${formatted}` : formatted;
}
