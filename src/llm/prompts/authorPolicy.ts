import type { Author } from '../../types/author.js';

export interface AuthorRunContext {
  author: Author | null;
  experienceNotes?: string;
}

export function buildAuthorRunContext(
  author: Author | null | undefined,
  experienceNotes?: string,
): AuthorRunContext | null {
  if (!author) {
    return null;
  }

  return {
    author,
    experienceNotes,
  };
}

export function buildAuthorDirective(context: AuthorRunContext | null | undefined): string {
  if (!context?.author) {
    return '';
  }

  const sections: string[] = [
    `Author: ${context.author.name}`,
    `Author profile: ${context.author.profile || '[No profile provided — use third-person expert voice and [AUTHOR: add first-hand example] placeholders where experience is needed.]'}`,
  ];

  if (context.experienceNotes?.trim()) {
    sections.push(`Article-specific experience and anecdotes (weave these into the draft; first person is allowed only when drawing from this material): ${context.experienceNotes.trim()}`);
  }

  sections.push(
    'Experience rules: Use first-person practitioner voice only when supported by the author profile or experience notes above. Do not invent first-person stories, credentials, or anecdotes. Without supplied experience, write in third-person expert voice or insert explicit [AUTHOR: add first-hand example here] placeholders.',
    'Publishing rules: Do not add author bylines or AI/methodology disclosures to the draft body — a human editor adds Who and How at publish time.',
  );

  return sections.join('\n');
}
