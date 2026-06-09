import type { MetaJson } from '../../types/meta.js';

export interface AuthorIdentity {
  displayName: string;
  initials: string;
  handle: string;
}

export interface FormatPreviewContext {
  generationId: string;
  metaJson: MetaJson | null;
  publicationName: string | null;
  publicationSlug: string | null;
  authorName: string | null;
  authorSlug: string | null;
}

export interface FormatPreviewInput extends FormatPreviewContext {
  contentType: string;
  htmlBody: string;
  markdownBody: string;
  title: string;
}
