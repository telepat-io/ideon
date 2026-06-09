import type { ArticlePlan, GeneratedArticleSection } from '../types/article.js';

export type SeoIssueSeverity = 'error' | 'warning';

export type SeoIssueLocation =
  | 'title'
  | 'description'
  | 'intro'
  | 'outro'
  | { sectionIndex: number; sectionTitle: string }
  | 'plan';

export interface SeoIssue {
  id: string;
  severity: SeoIssueSeverity;
  message: string;
  location: SeoIssueLocation;
}

export interface ArticleTextSnapshot {
  intro: string;
  sections: GeneratedArticleSection[];
  outro: string;
}

export type SeoCheckMode = 'errors-only' | 'strict';

export interface SeoLintResult {
  passed: boolean;
  issues: SeoIssue[];
}

export function countSeoErrors(issues: SeoIssue[]): number {
  return issues.filter((issue) => issue.severity === 'error').length;
}

export function countSeoWarnings(issues: SeoIssue[]): number {
  return issues.filter((issue) => issue.severity === 'warning').length;
}

export function computeSeoPassed(issues: SeoIssue[], mode: SeoCheckMode): boolean {
  if (mode === 'strict') {
    return issues.length === 0;
  }
  return countSeoErrors(issues) === 0;
}

export function lintArticleSeo({
  plan,
  text,
  mode = 'errors-only',
}: {
  plan: ArticlePlan;
  text: ArticleTextSnapshot;
  mode?: SeoCheckMode;
}): SeoLintResult {
  const issues: SeoIssue[] = [];

  if (plan.title.length > 60) {
    issues.push({
      id: 'title-length',
      severity: 'warning',
      message: `Title is ${plan.title.length} chars (recommended: under 60)`,
      location: 'title',
    });
  }

  if (plan.description.length < 120 || plan.description.length > 160) {
    issues.push({
      id: 'description-length',
      severity: 'warning',
      message: `Description is ${plan.description.length} chars (recommended: 120-160)`,
      location: 'description',
    });
  }

  const primaryKeyword = plan.primaryKeyword?.trim();
  if (primaryKeyword) {
    if (!containsKeyword(plan.title, primaryKeyword)) {
      issues.push({
        id: 'primary-in-title',
        severity: 'error',
        message: `Primary keyword "${primaryKeyword}" not found in title`,
        location: 'title',
      });
    }

    if (!containsKeywordInFirstWords(text.intro, primaryKeyword, 100)) {
      issues.push({
        id: 'primary-in-intro',
        severity: 'error',
        message: `Primary keyword "${primaryKeyword}" not found in intro first 100 words`,
        location: 'intro',
      });
    }
  }

  for (const keyword of plan.keywords ?? []) {
    if (!keywordCoveredInDraft(keyword, plan, text)) {
      issues.push({
        id: `keyword-coverage-${slugifyId(keyword)}`,
        severity: 'warning',
        message: `Keyword "${keyword}" not covered in title, headings, or body`,
        location: 'plan',
      });
    }
  }

  for (let index = 0; index < text.sections.length; index += 1) {
    const section = text.sections[index]!;
    const planSection = plan.sections[index];
    const firstParagraph = firstParagraphText(section.body);

    if (firstParagraph.split(/\s+/).filter(Boolean).length < 40) {
      issues.push({
        id: `bluf-length-${index}`,
        severity: 'warning',
        message: `Section "${section.title}" opener is under 40 words (BLUF heuristic)`,
        location: { sectionIndex: index, sectionTitle: section.title },
      });
    }

    if (!hasFactDensitySignal(section.body)) {
      issues.push({
        id: `fact-density-${index}`,
        severity: 'warning',
        message: `Section "${section.title}" lacks statistics or citation-like patterns`,
        location: { sectionIndex: index, sectionTitle: section.title },
      });
    }

    for (const tk of planSection?.targetKeywords ?? []) {
      if (!containsKeyword(section.body, tk) && !containsKeyword(section.title, tk)) {
        issues.push({
          id: `section-target-keyword-${index}-${slugifyId(tk)}`,
          severity: 'warning',
          message: `targetKeyword "${tk}" not found in section "${section.title}" heading or body`,
          location: { sectionIndex: index, sectionTitle: section.title },
        });
      }
    }
  }

  return {
    passed: computeSeoPassed(issues, mode),
    issues,
  };
}

function keywordCoveredInDraft(keyword: string, plan: ArticlePlan, text: ArticleTextSnapshot): boolean {
  if (containsKeyword(plan.title, keyword)) {
    return true;
  }
  for (let index = 0; index < plan.sections.length; index += 1) {
    const section = plan.sections[index]!;
    if (containsKeyword(section.title, keyword)) {
      return true;
    }
    for (const tk of section.targetKeywords ?? []) {
      if (containsKeyword(tk, keyword)) {
        return true;
      }
    }
    const body = text.sections[index]?.body ?? '';
    if (containsKeyword(body, keyword)) {
      return true;
    }
  }
  if (containsKeyword(text.intro, keyword) || containsKeyword(text.outro, keyword)) {
    return true;
  }
  return false;
}

function containsKeyword(haystack: string, keyword: string | undefined): boolean {
  if (!keyword?.trim()) {
    return false;
  }
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}

function containsKeywordInFirstWords(text: string, keyword: string, wordLimit: number): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, wordLimit);
  return containsKeyword(words.join(' '), keyword);
}

function firstParagraphText(body: string): string {
  const normalized = body.trim();
  if (!normalized) {
    return '';
  }
  const blocks = normalized.split(/\n\s*\n/);
  return blocks[0]?.trim() ?? normalized;
}

function hasFactDensitySignal(body: string): boolean {
  if (/\d/.test(body)) {
    return true;
  }
  if (/\[[^\]]+\]\(https?:\/\//i.test(body)) {
    return true;
  }
  if (/\b(according to|source:|study|report|survey|research)\b/i.test(body)) {
    return true;
  }
  return false;
}

function slugifyId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kw';
}
