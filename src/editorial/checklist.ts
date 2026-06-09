import type { Author } from '../types/author.js';

export type EditorialChecklistSeverity = 'required' | 'recommended';

export interface EditorialChecklistItem {
  id: string;
  severity: EditorialChecklistSeverity;
  message: string;
}

export const GOOGLE_HELPFUL_CONTENT_URL = 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content';

export function buildEditorialChecklist({
  author,
  experienceNotes,
  draftText,
}: {
  author: Author | null;
  experienceNotes?: string;
  draftText?: string;
}): EditorialChecklistItem[] {
  const items: EditorialChecklistItem[] = [
    {
      id: 'add-byline',
      severity: 'required',
      message: 'Add a human author byline before publish (Google Who).',
    },
    {
      id: 'add-ai-disclosure',
      severity: 'required',
      message: 'Add AI/methodology disclosure before publish (Google How), for example: "Drafted with AI assistance and reviewed by…".',
    },
  ];

  if (!author) {
    items.push({
      id: 'assign-author',
      severity: 'required',
      message: 'Assign an author profile and add real expertise before publish.',
    });
  } else if (!experienceNotes?.trim() && !author.profile.trim()) {
    items.push({
      id: 'add-experience',
      severity: 'required',
      message: 'Add first-hand examples or practitioner observations — author profile and experience notes are empty.',
    });
  } else if (!experienceNotes?.trim()) {
    items.push({
      id: 'add-experience',
      severity: 'recommended',
      message: 'Consider adding article-specific anecdotes or first-hand examples in experience notes or during editorial review.',
    });
  }

  if (draftText && /\[AUTHOR:\s*[^\]]+\]/i.test(draftText)) {
    items.push({
      id: 'replace-author-placeholders',
      severity: 'required',
      message: 'Replace all [AUTHOR: …] placeholders with real experience or remove them.',
    });
  }

  if (draftText && hasVerifiableClaims(draftText)) {
    items.push({
      id: 'verify-stats',
      severity: 'required',
      message: 'Verify all statistics, named sources, and quotations before publish.',
    });
  }

  items.push({
    id: 'google-self-assessment',
    severity: 'recommended',
    message: `Run Google's helpful content self-assessment: ${GOOGLE_HELPFUL_CONTENT_URL}`,
  });

  return items;
}

function hasVerifiableClaims(text: string): boolean {
  if (/\d/.test(text)) {
    return true;
  }

  return /\b(according to|source:|study|report|survey|research)\b/i.test(text);
}

export function formatEditorialChecklistSummary(items: EditorialChecklistItem[]): string {
  if (items.length === 0) {
    return '';
  }

  const lines = items.map((item) => {
    const label = item.severity === 'required' ? 'REQUIRED' : 'RECOMMENDED';
    return `[${label}] ${item.message}`;
  });

  return ['Editorial checklist (complete before publish):', ...lines.map((line) => `  - ${line}`)].join('\n');
}
