import {
  countSeoErrors,
  countSeoWarnings,
  lintArticleSeo,
  measureSectionOpener,
  type SeoCheckMode,
} from '../seo/lint.js';
import type { EditorSessionSnapshot, EditorToolResult } from './snapshot.js';

function success(
  snapshot: EditorSessionSnapshot,
  mode: SeoCheckMode,
  message?: string,
  blufSectionIndex?: number,
): EditorToolResult {
  const lint = lintArticleSeo({ plan: snapshot.plan, text: snapshot.text, mode });
  const remainingErrors = countSeoErrors(lint.issues);
  const remainingWarnings = countSeoWarnings(lint.issues);
  let finalMessage = message;
  if (blufSectionIndex !== undefined && finalMessage) {
    const body = snapshot.text.sections[blufSectionIndex]?.body ?? '';
    finalMessage = appendBlufHintIfNeeded(finalMessage, blufSectionIndex, lint.issues, body);
  }
  return {
    ok: true,
    message: finalMessage,
    remainingErrors,
    remainingWarnings,
    remainingIssues: lint.issues.length,
  };
}

function failure(error: string): EditorToolResult {
  return { ok: false, error };
}

function clampSectionIndex(snapshot: EditorSessionSnapshot, index: number): number | null {
  if (!Number.isInteger(index) || index < 0 || index >= snapshot.plan.sections.length) {
    return null;
  }
  return index;
}

function syncSectionTitle(snapshot: EditorSessionSnapshot, index: number): void {
  const planSection = snapshot.plan.sections[index];
  const textSection = snapshot.text.sections[index];
  if (planSection && textSection) {
    textSection.title = planSection.title;
  }
}

function appendBlufHintIfNeeded(
  message: string,
  sectionIndex: number,
  issues: ReturnType<typeof lintArticleSeo>['issues'],
  body: string,
): string {
  if (!issues.some((issue) => issue.id === `bluf-length-${sectionIndex}`)) {
    return message;
  }

  const opener = measureSectionOpener(body);
  const expandTarget = opener.kind === 'key_takeaway'
    ? 'expand **Key takeaway:** line to at least 40 words'
    : 'expand the first paragraph to at least 40 words';
  return `${message} Opener still ${opener.wordCount} words (${opener.kind}); ${expandTarget}.`;
}

export function createEditorToolHandlers(
  getSnapshot: () => EditorSessionSnapshot,
  options: { mode: SeoCheckMode },
): Record<string, (args: Record<string, unknown>) => EditorToolResult> {
  const { mode } = options;

  return {
    edit_plan_metadata(args) {
      const snapshot = getSnapshot();
      if (typeof args.title === 'string') snapshot.plan.title = args.title;
      if (typeof args.subtitle === 'string') snapshot.plan.subtitle = args.subtitle;
      if (typeof args.description === 'string') snapshot.plan.description = args.description;
      if (typeof args.slug === 'string') snapshot.plan.slug = args.slug;
      if (typeof args.primaryKeyword === 'string') {
        if (!snapshot.plan.keywords.includes(args.primaryKeyword)) {
          return failure('primaryKeyword must be one of the plan keywords');
        }
        snapshot.plan.primaryKeyword = args.primaryKeyword;
      }
      return success(snapshot, mode, 'Plan metadata updated');
    },

    edit_section_heading(args) {
      const snapshot = getSnapshot();
      const sectionIndex = clampSectionIndex(snapshot, Number(args.sectionIndex));
      if (sectionIndex === null) {
        return failure('Invalid sectionIndex');
      }
      const section = snapshot.plan.sections[sectionIndex]!;
      if (typeof args.title === 'string') {
        section.title = args.title;
        syncSectionTitle(snapshot, sectionIndex);
      }
      if (Array.isArray(args.targetKeywords)) {
        section.targetKeywords = args.targetKeywords
          .filter((value): value is string => typeof value === 'string')
          .slice(0, 2);
      }
      return success(snapshot, mode, 'Section heading updated');
    },

    edit_intro(args) {
      const snapshot = getSnapshot();
      if (typeof args.body !== 'string' || !args.body.trim()) {
        return failure('body is required');
      }
      snapshot.text.intro = args.body.trim();
      return success(snapshot, mode, 'Intro updated');
    },

    edit_section_body(args) {
      const snapshot = getSnapshot();
      const sectionIndex = clampSectionIndex(snapshot, Number(args.sectionIndex));
      if (sectionIndex === null) {
        return failure('Invalid sectionIndex');
      }
      if (typeof args.body !== 'string' || !args.body.trim()) {
        return failure('body is required');
      }
      snapshot.text.sections[sectionIndex]!.body = args.body.trim();
      return success(snapshot, mode, 'Section body updated', sectionIndex);
    },

    edit_outro(args) {
      const snapshot = getSnapshot();
      if (typeof args.body !== 'string' || !args.body.trim()) {
        return failure('body is required');
      }
      snapshot.text.outro = args.body.trim();
      return success(snapshot, mode, 'Outro updated');
    },
  };
}
