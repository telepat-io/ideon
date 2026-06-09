import { readGuideFile } from '../llm/prompts/guideBundles.js';
import { measureSectionOpener, type SeoCheckMode, type SeoIssue } from '../seo/lint.js';
import type { ArticlePlan } from '../types/article.js';
import type { EditorTextSnapshot } from './snapshot.js';

const ISSUE_PLAYBOOK = [
  'Issue playbook (lint id → tool + tactic):',
  '- primary-in-title → edit_plan_metadata.title (include primary keyword naturally)',
  '- primary-in-intro → edit_intro (place primary keyword in first 100 words)',
  '- title-length / description-length → edit_plan_metadata (adjust length to SEO targets)',
  '- keyword-coverage-* → edit_section_heading or edit_section_body (place keyword in heading or body)',
  '- section-target-keyword-* → edit_section_body or edit_section_heading for that sectionIndex',
  '- bluf-length-N → edit_section_body for sectionIndex N. If opener is key_takeaway, expand the **Key takeaway:** line to ≥40 words (definition-first). Do not only edit paragraphs below the takeaway.',
  '- fact-density-* → edit_section_body (add a statistic or citation-like phrase in prose; do not invent URLs)',
].join('\n');

export function loadKeywordIntegrationGuide(): string {
  return readGuideFile('writing-guide/seo/keyword-integration.md');
}

export function buildEditorSystemPrompt(mode: SeoCheckMode, includeKeywordGuide: boolean): string {
  const stopRule = mode === 'strict'
    ? 'Stop calling tools when remainingIssues is 0.'
    : 'Stop calling tools when remainingErrors is 0 (warnings may remain in errors-only mode).';

  const parts = [
    'You are an editorial SEO fixer for long-form articles.',
    'Use only the five provided tools. Do not restructure the article (no add/remove/reorder sections).',
    'Prefer minimal surgical edits. Fix highest-severity issues first.',
    'After each tool call, check remainingErrors, remainingWarnings, and remainingIssues in the tool response.',
    stopRule,
    '',
    ISSUE_PLAYBOOK,
  ];

  if (includeKeywordGuide) {
    parts.push('', 'Keyword integration guide:', loadKeywordIntegrationGuide());
  }

  return parts.join('\n');
}

export function buildEditorUserPrompt(
  issues: SeoIssue[],
  plan: ArticlePlan,
  text: EditorTextSnapshot,
): string {
  const issueSummary = issues.length === 0
    ? '(none)'
    : issues.map((issue) => formatIssueLine(issue, text)).join('\n');

  const sectionBlocks = text.sections.map((section, index) => {
    const planSection = plan.sections[index];
    const targets = planSection?.targetKeywords?.length
      ? planSection.targetKeywords.join(', ')
      : '(none)';
    return [
      `### Section ${index}: ${section.title}`,
      `targetKeywords: ${targets}`,
      '',
      section.body,
    ].join('\n');
  });

  return [
    'Fix the SEO issues listed below using the available tools.',
    '',
    '## Lint issues',
    issueSummary,
    '',
    `Primary keyword: ${plan.primaryKeyword}`,
    `Keywords: ${plan.keywords.join(', ')}`,
    '',
    '## Plan metadata',
    `title: ${plan.title}`,
    `subtitle: ${plan.subtitle}`,
    `description: ${plan.description}`,
    `slug: ${plan.slug}`,
    '',
    '## Intro',
    text.intro,
    '',
    '## Sections',
    ...sectionBlocks,
    '',
    '## Outro',
    text.outro,
  ].join('\n');
}

function formatIssueLine(issue: SeoIssue, text: EditorTextSnapshot): string {
  const context = formatIssueContext(issue, text);
  return `- [${issue.severity}] ${issue.id}${context}: ${issue.message}`;
}

function formatIssueContext(issue: SeoIssue, text: EditorTextSnapshot): string {
  if (typeof issue.location === 'object' && 'sectionIndex' in issue.location) {
    const sectionIndex = issue.location.sectionIndex;
    const body = text.sections[sectionIndex]?.body ?? '';
    const opener = measureSectionOpener(body);
    return ` @ sectionIndex=${sectionIndex} (${opener.kind}, ${opener.wordCount} words)`;
  }
  if (issue.location !== 'plan') {
    return ` @ ${issue.location}`;
  }
  return '';
}
