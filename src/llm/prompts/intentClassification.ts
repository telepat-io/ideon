import type { ChatMessage } from '../openRouterClient.js';

export interface KeywordWithMetrics {
  keyword: string;
  avgMonthlySearches: number | null;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  highTopOfPageBidMicros: number | null;
}

export function buildIntentClassificationMessages(
  candidates: KeywordWithMetrics[],
): ChatMessage[] {
  const systemInstruction = 'Classify each keyword by search intent. Use CPC (highTopOfPageBidMicros, where 1,000,000 = $1) as a commercial signal alongside phrasing.';

  const items = candidates
    .map(
      (c) =>
        `- keyword: "${c.keyword}", avgMonthlySearches: ${c.avgMonthlySearches ?? 'dash'}, competition: ${c.competition ?? 'N/A'}, highTopOfPageBidMicros: ${c.highTopOfPageBidMicros ?? 'dash'}`,
    )
    .join('\n');

  const userContent = [
    `For each keyword return:`,
    `- intentType: "informational" | "commercial" | "transactional"`,
    `- intentScore: 1–5 (1 = generic info, no business tie; 5 = direct buying signal)`,
    `- reasoning: one sentence`,
    '',
    'High CPC (> $3) should push intentScore up by 1 unless phrasing is clearly navigational.',
    '',
    'Keywords to classify:',
    items,
    '',
    'Respond only in JSON: { "classifications": [{ "keyword": string, "intentType": string, "intentScore": number, "reasoning": string }] }',
  ].join('\n');

  return [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userContent },
  ];
}
