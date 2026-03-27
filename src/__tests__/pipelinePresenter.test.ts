import {
  computeMaxVisibleItemsPerStage,
  getVisibleItems,
  getVisibleStages,
} from '../cli/ui/progressVisibility.js';
import type { StageItemViewModel, StageViewModel } from '../pipeline/events.js';

describe('pipeline presenter visibility helpers', () => {
  it('hides pending stages from the live list', () => {
    const stages: StageViewModel[] = [
      {
        id: 'shared-brief',
        title: 'Shared Brief',
        status: 'running',
        detail: 'Working',
      },
      {
        id: 'planning',
        title: 'Planning',
        status: 'pending',
        detail: 'Waiting',
      },
      {
        id: 'output',
        title: 'Output',
        status: 'succeeded',
        detail: 'Done',
      },
    ];

    const visible = getVisibleStages(stages);

    expect(visible.map((stage) => stage.id)).toEqual(['shared-brief', 'output']);
  });

  it('returns only non-pending items and truncates to latest history', () => {
    const items: StageItemViewModel[] = [
      { id: 'a', label: 'A', status: 'pending', detail: 'pending' },
      { id: 'b', label: 'B', status: 'succeeded', detail: 'done' },
      { id: 'c', label: 'C', status: 'running', detail: 'working' },
      { id: 'd', label: 'D', status: 'succeeded', detail: 'done' },
    ];

    const result = getVisibleItems(items, false, 2);

    expect(result.overflow).toBe(1);
    expect(result.visibleItems.map((item) => item.id)).toEqual(['c', 'd']);
  });

  it('keeps pending items when explicitly requested', () => {
    const items: StageItemViewModel[] = [
      { id: 'a', label: 'A', status: 'pending', detail: 'pending' },
      { id: 'b', label: 'B', status: 'running', detail: 'working' },
    ];

    const result = getVisibleItems(items, true, 5);

    expect(result.overflow).toBe(0);
    expect(result.visibleItems.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('shrinks item history window on short terminals', () => {
    const budget = computeMaxVisibleItemsPerStage({
      terminalRows: 16,
      visibleStageCount: 2,
      hasError: false,
      hasResult: false,
    });

    expect(budget).toBe(3);
  });

  it('accounts for error and final summary chrome in item budget', () => {
    const budget = computeMaxVisibleItemsPerStage({
      terminalRows: 32,
      visibleStageCount: 2,
      hasError: true,
      hasResult: true,
    });

    expect(budget).toBe(4);
  });

  it('uses bounded defaults when terminal size is unavailable', () => {
    const budget = computeMaxVisibleItemsPerStage({
      terminalRows: undefined,
      visibleStageCount: 1,
      hasError: false,
      hasResult: false,
    });

    expect(budget).toBeGreaterThanOrEqual(2);
    expect(budget).toBeLessThanOrEqual(20);
  });
});
