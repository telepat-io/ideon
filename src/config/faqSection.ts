import type { AppSettings } from './schema.js';
import { isLongFormContentType } from '../types/article.js';

export const FAQ_DEFAULT_INTENTS = [
  'tutorial',
  'how-to-guide',
  'cornerstone',
  'deep-dive-analysis',
  'case-study',
  'roundup-curation',
] as const;

export function resolveFaqSectionEnabled(settings: AppSettings): boolean {
  if (settings.faqSection !== undefined) {
    return settings.faqSection;
  }

  const primary = settings.contentTargets.find((target) => target.role === 'primary');
  if (!primary || !isLongFormContentType(primary.contentType)) {
    return false;
  }

  return (FAQ_DEFAULT_INTENTS as readonly string[]).includes(settings.intent);
}
