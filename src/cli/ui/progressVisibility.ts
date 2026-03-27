import type { StageItemViewModel, StageViewModel } from '../../pipeline/events.js';

export function getVisibleStages(stages: StageViewModel[]): StageViewModel[] {
  return stages.filter((stage) => stage.status !== 'pending');
}

export function getVisibleItems(
  items: StageItemViewModel[],
  showPendingItems: boolean,
  maxVisibleItems: number,
): { visibleItems: StageItemViewModel[]; overflow: number } {
  const filtered = showPendingItems ? items : items.filter((item) => item.status !== 'pending');
  const overflow = Math.max(0, filtered.length - maxVisibleItems);
  const visibleItems = overflow > 0 ? filtered.slice(-maxVisibleItems) : filtered;
  return { visibleItems, overflow };
}

export function computeMaxVisibleItemsPerStage({
  terminalRows,
  visibleStageCount,
  hasError,
  hasResult,
}: {
  terminalRows?: number;
  visibleStageCount: number;
  hasError: boolean;
  hasResult: boolean;
}): number {
  const rows = terminalRows ?? 24;

  // Header, prompt, and baseline stage rows consume a fixed minimum.
  const reservedRows =
    5 +
    (hasError ? 4 : 0) +
    (hasResult ? 10 : 0) +
    (visibleStageCount * 2);
  const availableRows = Math.max(0, rows - reservedRows);
  const perStageBudget = Math.floor(availableRows / Math.max(1, visibleStageCount));

  return clamp(perStageBudget, 2, 20);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
