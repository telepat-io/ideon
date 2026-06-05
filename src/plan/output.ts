import type { Plan, PlannedArticle, PlannedSeries } from '../types/plan.js';

function formatArticleLines(article: PlannedArticle, showPillar: boolean): string[] {
  const lines: string[] = [
    `### Article: ${article.title}`,
    `Primary keyword: ${article.primaryKeyword}`,
  ];
  if (article.secondaryKeywords.length > 0) {
    lines.push(`Secondary keywords: ${article.secondaryKeywords.join(', ')}`);
  }
  lines.push(
    `Intent: ${article.intentType}`,
    `Funnel: ${article.funnelStage}`,
    `Format: ${article.format}`,
    `Priority: ${article.priority}`,
  );
  if (showPillar) {
    lines.push(`Pillar: ${article.isPillar ? 'yes' : 'no'}`);
  }
  lines.push(`Type: ${article.type}`);
  if (article.refreshTarget) {
    lines.push(`Refresh target: ${article.refreshTarget}`);
  }
  if (article.confidenceNote) {
    lines.push(`Confidence: ${article.confidenceNote}`);
  }
  return lines;
}

function formatArticleCommand(
  article: PlannedArticle,
  publicationSlug: string,
  series: PlannedSeries,
): string {
  const seriesSlug = series.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const keywords = [article.primaryKeyword, ...article.secondaryKeywords].join(', ');
  return `ideon queue add "${article.title}" --publication ${publicationSlug} --series ${seriesSlug} --keywords "${keywords}" --intent ${article.format} --type article`;
}

export function formatPlanOutput(plan: Plan, publicationSlug: string): string {
  const mode = plan.mode === 'new-idea' ? 'explore' : 'expand';
  const header = [
    `# Plan: ${mode}`,
    `Mode: ${plan.mode}`,
    `Publication: ${publicationSlug}`,
    ...plan.series.map((s) => `Series: ${s.name}`),
  ];

  if (plan.lowVolumeMode) {
    header.push('Low-volume: yes');
  }

  const stats = [
    '',
    '## Research',
    `Rounds: ${plan.researchStats.queryRoundsCompleted}`,
    `Candidates evaluated: ${plan.researchStats.candidatesEvaluated}`,
    `Candidates passed: ${plan.researchStats.candidatesPassed}`,
    `Cache hits: ${plan.researchStats.cacheHits}`,
    `API calls: ${plan.researchStats.apiCallsMade}`,
    '',
  ];

  const content: string[] = [];

  if (plan.mode === 'new-idea') {
    for (const series of plan.series) {
      content.push(
        '',
        `## Series: ${series.name}`,
        `Pillar keyword: ${series.pillarKeyword}`,
        `Funnel: ${series.funnelStage}`,
        `Rationale: ${series.clusterRationale}`,
        `Coverage gap: ${series.coverageGapNote}`,
      );

      for (const article of series.articles) {
        content.push(
          '',
          ...formatArticleLines(article, true),
          '',
          formatArticleCommand(article, publicationSlug, series),
        );
      }
    }
  } else {
    content.push('', '## Articles');

    for (const article of plan.articles) {
      content.push('', ...formatArticleLines(article, false));
    }
  }

  const discarded: string[] = [];
  if (plan.discardedCandidates.length > 0) {
    discarded.push('', '## Discarded');
    for (const d of plan.discardedCandidates) {
      discarded.push(`- "${d.keyword}" (KOB: ${d.kobScore.toFixed(2)}, reason: ${d.reason})`);
    }
  }

  return [...header, ...stats, ...content, ...discarded].join('\n');
}

export function formatNoResultsOutput(
  mode: 'new-idea' | 'expand-series',
  publicationSlug: string,
  pivotSuggestions: string[],
  candidatesFound: number,
): string {
  const header = [
    `# Plan: ${mode === 'new-idea' ? 'explore' : 'expand'}`,
    `Mode: ${mode}`,
    `Publication: ${publicationSlug}`,
    '',
    '## No Results',
    `Candidates found: ${candidatesFound}`,
    'Status: exhausted',
    '',
    'No sufficient demand signals found for this topic.',
  ];

  const suggestions: string[] = [];
  if (pivotSuggestions.length > 0) {
    suggestions.push('', '## Pivot Suggestions');
    for (const suggestion of pivotSuggestions) {
      suggestions.push(`- ${suggestion}`);
    }
  }

  return [...header, ...suggestions].join('\n');
}
