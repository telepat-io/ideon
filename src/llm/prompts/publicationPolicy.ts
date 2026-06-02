import type { Publication } from '../../types/publication.js';

export function buildEditorialPolicyDirective(publication: Publication | null): string {
  if (!publication) {
    return '';
  }

  const sections: string[] = [];

  sections.push(`Publication: "${publication.name}"`);

  const { editorialPolicy } = publication;

  if (editorialPolicy.tone) {
    sections.push(`Tone: ${editorialPolicy.tone}`);
  }

  if (editorialPolicy.forbiddenTopics.length > 0) {
    sections.push(`Forbidden topics: ${editorialPolicy.forbiddenTopics.join(', ')}`);
  }

  if (editorialPolicy.disclosureRequirements.length > 0) {
    sections.push(`Disclosure requirements: ${editorialPolicy.disclosureRequirements.join('; ')}`);
  }

  if (editorialPolicy.audienceRestrictions.length > 0) {
    sections.push(`Audience restrictions: ${editorialPolicy.audienceRestrictions.join('; ')}`);
  }

  if (editorialPolicy.notes) {
    sections.push(`Editorial policy notes: ${editorialPolicy.notes}`);
  }

  return sections.join('\n');
}
