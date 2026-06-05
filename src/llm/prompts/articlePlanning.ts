import type { ChatMessage } from '../openRouterClient.js';
import type { Cluster, PlannedArticle } from '../../types/plan.js';

export interface ExistingArticle {
  title: string;
  keywords: string[];
}

export interface CoverageOverlap {
  title: string;
  keywords: string[];
  ageMonths: number;
}

export interface ArticlePlanningInput {
  seriesName: string;
  pillarKeyword: string;
  supportingKeywords: string[];
  funnelStage: 'top' | 'middle' | 'bottom';
  desiredArticlesPerSeries: number;
  targetMarket: {
    countryCodes: string[];
    language: string;
  };
  existingArticles: ExistingArticle[];
  coverageOverlap: CoverageOverlap[];
  isPillar: boolean;
}

export function buildArticlePlanningMessages(input: ArticlePlanningInput): ChatMessage[] {
  const systemInstruction = 'You are a content strategist planning articles for a content series.';

  const existingBlock = input.existingArticles.length > 0
    ? input.existingArticles
        .map((a) => `- ${a.title} [${a.keywords.join(', ')}]`)
        .join('\n')
    : '(none)';

  const overlapBlock = input.coverageOverlap.length > 0
    ? input.coverageOverlap
        .map((c) => `- ${c.title} [${c.keywords.join(', ')}] published ${c.ageMonths}mo ago`)
        .join('\n')
    : '(none)';

  const userContent = [
    `Series: ${input.seriesName}`,
    `Pillar keyword: ${input.pillarKeyword}`,
    `Supporting keywords: ${input.supportingKeywords.join(', ')}`,
    `Funnel stage: ${input.funnelStage}`,
    `Target market: ${input.targetMarket.countryCodes.join(', ')}, language: ${input.targetMarket.language}`,
    '',
    `Existing articles in this series (do not duplicate these):`,
    existingBlock,
    '',
    'Overlapping existing coverage (may need refresh if old):',
    overlapBlock,
    '',
    `Plan ${input.desiredArticlesPerSeries} articles. For each:`,
    '- One must be the pillar article (comprehensive overview, 1500–3000 words)',
    '- Remaining are cluster articles (specific subtopics, 800–1500 words)',
    '- Every article must have a distinct angle — no two articles should answer the same question',
    '- Angles must be differentiated enough that internal linking between them is natural, not forced',
    '',
    `For each article return:`,
    '{',
    '  "title": string,',
    '  "primaryKeyword": string,',
    '  "secondaryKeywords": string[],',
    '  "intentType": "informational" | "commercial" | "transactional",',
    '  "funnelStage": "top" | "middle" | "bottom",',
    '  "contentAngle": string,',
    '  "format": "guide" | "listicle" | "comparison" | "case-study" | "tutorial" | "opinion",',
    '  "isPillar": boolean,',
    '  "priority": "high" | "medium" | "low",',
    '  "confidenceNote": string | undefined,',
    '  "refreshCandidate": string | null',
    '}',
    '',
    'Priority rules:',
    '- high: KOB >= 4, intentScore >= 3, funnel middle or bottom',
    '- medium: KOB >= 2, or top-of-funnel with strong topical authority value',
    '- low: KOB < 2, included for cluster completeness only',
    '',
    'Respond only in JSON: { "articles": [...] }',
  ].join('\n');

  return [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userContent },
  ];
}
