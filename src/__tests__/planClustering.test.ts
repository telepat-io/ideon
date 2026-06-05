import { describe, it, expect } from '@jest/globals';
import { clusterKeywordMap } from '../plan/clustering.js';
import type { Cluster } from '../types/plan.js';

describe('clusterKeywordMap', () => {
  it('creates map from pillar and supporting keywords', () => {
    const clusters: Cluster[] = [
      {
        seriesName: 'Series One',
        pillarKeyword: 'pillar-one',
        funnelStage: 'top',
        supportingKeywords: ['support-1', 'support-2'],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      },
      {
        seriesName: 'Series Two',
        pillarKeyword: 'pillar-two',
        funnelStage: 'middle',
        supportingKeywords: ['support-3'],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      },
    ];

    const map = clusterKeywordMap(clusters);

    expect(map.get('pillar-one')).toBe('Series One');
    expect(map.get('support-1')).toBe('Series One');
    expect(map.get('support-2')).toBe('Series One');
    expect(map.get('pillar-two')).toBe('Series Two');
    expect(map.get('support-3')).toBe('Series Two');
  });

  it('handles empty clusters', () => {
    const map = clusterKeywordMap([]);
    expect(map.size).toBe(0);
  });

  it('handles cluster with no supporting keywords', () => {
    const clusters: Cluster[] = [
      {
        seriesName: 'Solo Series',
        pillarKeyword: 'solo',
        funnelStage: 'bottom',
        supportingKeywords: [],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      },
    ];

    const map = clusterKeywordMap(clusters);

    expect(map.get('solo')).toBe('Solo Series');
    expect(map.size).toBe(1);
  });

  it('normalizes keywords to lowercase', () => {
    const clusters: Cluster[] = [
      {
        seriesName: 'Test Series',
        pillarKeyword: 'Pillar-Keyword',
        funnelStage: 'top',
        supportingKeywords: ['Support-Keyword'],
        clusterRationale: 'rationale',
        coverageGapNote: '',
      },
    ];

    const map = clusterKeywordMap(clusters);

    expect(map.get('pillar-keyword')).toBe('Test Series');
    expect(map.get('support-keyword')).toBe('Test Series');
    expect(map.get('Pillar-Keyword')).toBeUndefined();
  });
});
