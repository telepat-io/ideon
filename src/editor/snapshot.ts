import type { ArticlePlan, GeneratedArticleSection } from '../types/article.js';

export interface EditorTextSnapshot {
  intro: string;
  sections: GeneratedArticleSection[];
  outro: string;
}

export interface EditorSessionSnapshot {
  plan: ArticlePlan;
  text: EditorTextSnapshot;
  structureChanged: boolean;
  imagesChanged: boolean;
}

export interface EditorToolResult {
  ok: boolean;
  error?: string;
  message?: string;
  remainingErrors?: number;
  remainingWarnings?: number;
  remainingIssues?: number;
}

export function cloneEditorSnapshot(plan: ArticlePlan, text: EditorTextSnapshot): EditorSessionSnapshot {
  return {
    plan: structuredClone(plan),
    text: structuredClone(text),
    structureChanged: false,
    imagesChanged: false,
  };
}
