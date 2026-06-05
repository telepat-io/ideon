import type { ChatMessage } from '../openRouterClient.js';

export interface SeedGenerationInput {
  contentIdea: string;
  businessContext?: string;
  countryCodes: string[];
  language: string;
  coverageMapKeys: string[];
  cacheSummaryKeys: string[];
  exhaustionRecords: Array<{ seeds: string[]; exhaustedAt: string; pivotSuggestions: string[] }>;
  seedKeywords: string[];
}

export function buildSeedGenerationMessages(input: SeedGenerationInput): ChatMessage[] {
  const coverageBlock = input.coverageMapKeys.length > 0
    ? `Already covered keywords (do not re-suggest these as primary seeds):\n${truncate(input.coverageMapKeys.join(', '), 400)}\n`
    : '';

  const cacheBlock = input.cacheSummaryKeys.length > 0
    ? `Previously searched seeds for this topic (avoid repeating these):\n${truncate(input.cacheSummaryKeys.join(', '), 300)}\n`
    : '';

  const exhaustionBlock = input.exhaustionRecords.length > 0
    ? `Known exhausted seed sets to avoid:\n${input.exhaustionRecords.map((r) => `Seeds: ${r.seeds.join(', ')} (exhausted at ${r.exhaustedAt})`).join('\n')}\n`
    : '';

  const enforcedBlock = input.seedKeywords.length > 0
    ? `User-enforced seeds (always include these):\n${input.seedKeywords.join(', ')}\n`
    : 'User-enforced seeds (always include these): none\n';

  const systemInstruction = 'You are a keyword research strategist. Generate a diverse seed keyword list for GKP research.';

  const userContent = [
    `Content idea: ${input.contentIdea}`,
    `Business context: ${input.businessContext ?? 'not provided'}`,
    `Target market: ${input.countryCodes.join(', ')}, language: ${input.language}`,
    '',
    coverageBlock,
    cacheBlock,
    exhaustionBlock,
    enforcedBlock,
    '',
    'Generate 8–12 seed keywords. For each include:',
    '- The keyword itself',
    '- Phrasing rationale: why would the ICP search this exact phrase?',
    '- Scope: broad head term or specific long-tail?',
    '- Estimated intent: informational / commercial / transactional',
    '',
    'Respond only in JSON:',
    '{ "seeds": [{ "keyword": string, "rationale": string, "scope": "head" | "long-tail", "estimatedIntent": "informational" | "commercial" | "transactional" }] }',
  ].filter((line) => line.length > 0).join('\n');

  return [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userContent },
  ];
}

export function buildSeedBroadeningMessages(
  exhaustedSeeds: string[],
  topCandidates: Array<{ keyword: string; highTopOfPageBidMicros: number | null }>,
): ChatMessage[] {
  const systemInstruction = 'You are a keyword research strategist. Suggest adjacent angles when initial seeds are exhausted.';

  const topBlock = topCandidates.length > 0
    ? `Best candidates found so far (top 5 by CPC signal):\n${topCandidates.slice(0, 5).map((c) => `${c.keyword} (CPC: ${c.highTopOfPageBidMicros !== null ? `$${(c.highTopOfPageBidMicros / 1_000_000).toFixed(2)}` : 'N/A'})`).join('\n')}\n`
    : '';

  const userContent = [
    `The following seeds have been exhausted with few results:`,
    `${exhaustedSeeds.join(', ')}`,
    '',
    topBlock,
    'The topic may be niche. Suggest 5 adjacent angles or synonym phrasings this audience also searches for. Do not repeat exhausted seeds.',
    '',
    'Respond only in JSON:',
    '{ "seeds": [{ "keyword": string, "rationale": string, "scope": "head" | "long-tail", "estimatedIntent": "informational" | "commercial" | "transactional" }] }',
  ].filter((line) => line.length > 0).join('\n');

  return [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userContent },
  ];
}

function truncate(str: string, maxTokens: number): string {
  const approxChars = maxTokens * 4;
  if (str.length <= approxChars) return str;
  return str.slice(0, approxChars) + '...';
}
