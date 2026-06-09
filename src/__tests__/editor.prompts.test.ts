import { buildEditorUserPrompt } from '../editor/prompts.js';
import type { ArticlePlan } from '../types/article.js';

function mockPlan(): ArticlePlan {
  return {
    contentType: 'article',
    title: 'Test Article',
    subtitle: 'Subtitle',
    primaryKeyword: 'alpha',
    keywords: ['alpha'],
    slug: 'test-article',
    description: 'A long enough meta description for SEO lint checks that spans at least one hundred and twenty characters in total length.',
    introBrief: 'Intro brief',
    outroBrief: 'Outro brief',
    coverImageDescription: 'Cover',
    sections: [{ title: 'First Section', description: 'First' }],
    inlineImages: [],
  };
}

describe('editor prompts', () => {
  it('includes section opener stats in lint issue lines', () => {
    const plan = mockPlan();
    const prompt = buildEditorUserPrompt(
      [
        {
          id: 'bluf-length-0',
          severity: 'warning',
          message: 'Section "First Section" opener is under 40 words (BLUF heuristic)',
          location: { sectionIndex: 0, sectionTitle: 'First Section' },
        },
      ],
      plan,
      {
        intro: 'Intro.',
        sections: [{ title: 'First Section', body: '**Key takeaway:** Too short.' }],
        outro: 'Outro.',
      },
    );

    expect(prompt).toContain('bluf-length-0 @ sectionIndex=0 (key_takeaway,');
    expect(prompt).toContain('words)');
  });
});
