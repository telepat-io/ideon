import type { Series } from '../../types/series.js';

export function buildSeriesDirective(series: Series | null): string {
  if (!series) {
    return '';
  }

  const sections: string[] = [];

  sections.push(`This article is part of the series "${series.name}".`);

  if (series.topic) {
    sections.push(`Series topic: ${series.topic}`);
  }

  sections.push('Maintain thematic coherence and continuity with this overarching subject.');

  const { editorialPolicy } = series;

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
