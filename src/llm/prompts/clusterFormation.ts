import type { ChatMessage } from '../openRouterClient.js';
import type { KeywordCandidate } from '../../types/plan.js';

export interface ClusterFormationInput {
  shortlist: KeywordCandidate[];
  coverageMapKeys: string[];
  excludeSeries: string[];
  desiredSeriesCount: number;
  countryCodes: string[];
  language: string;
}

export function buildClusterFormationMessages(input: ClusterFormationInput): ChatMessage[] {
  const systemInstruction = 'You are a content strategist. Group these scored keywords into topic clusters.';

  const shortlistJson = JSON.stringify(
    input.shortlist.map((c) => ({
      keyword: c.keyword,
      kobScore: c.kobScore,
      intentType: c.intentType,
      intentScore: c.intentScore,
      volumeScore: c.volumeScore,
      difficultyScore: c.difficultyScore,
    })),
    null,
  );

  const userContent = [
    `Scored keyword shortlist:`,
    shortlistJson,
    '',
    `Already covered by existing content (do not build clusters that primarily repeat these — gaps and adjacent angles are fine):`,
    `${input.coverageMapKeys.length > 0 ? input.coverageMapKeys.join(', ') : '(none)'}`,
    '',
    `Series to avoid duplicating: ${input.excludeSeries.length > 0 ? input.excludeSeries.join(', ') : '(none)'}`,
    '',
    `Target: ${input.desiredSeriesCount} series, each with a pillar keyword and 4–10 supporting keywords.`,
    '',
    'Rules:',
    '- Every keyword in a cluster must share a coherent parent topic',
    '- Each cluster needs one pillar keyword (broadest, most searched)',
    '- Clusters must not cannibalise each other — merge if overlap is high',
    '- Every cluster must map to a funnel stage: top / middle / bottom',
    '- Prefer clusters where gaps exist in existing coverage',
    '- A strong candidate (KOB >= 4) must anchor every cluster as pillar or primary supporting keyword — do not build clusters from supporting candidates alone',
    '',
    `For each cluster return:`,
    '{',
    '  "seriesName": string,',
    '  "pillarKeyword": string,',
    '  "funnelStage": "top" | "middle" | "bottom",',
    '  "supportingKeywords": string[],',
    '  "clusterRationale": string,',
    '  "coverageGapNote": string',
    '}',
    '',
    'Respond only in JSON: { "clusters": [...] }',
  ].join('\n');

  return [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userContent },
  ];
}
