import { cloneEditorSnapshot } from '../editor/snapshot.js';
import { createEditorToolHandlers } from '../editor/tools.js';
import type { ArticlePlan } from '../types/article.js';

function mockPlan(): ArticlePlan {
  return {
    contentType: 'article',
    title: 'Test Article',
    subtitle: 'Subtitle',
    primaryKeyword: 'alpha',
    keywords: ['alpha', 'beta'],
    slug: 'test-article',
    description: 'A long enough meta description for SEO lint checks that spans at least one hundred and twenty characters in total length.',
    introBrief: 'Intro brief',
    outroBrief: 'Outro brief',
    coverImageDescription: 'Cover',
    sections: [
      { title: 'First Section', description: 'First', targetKeywords: ['beta'] },
      { title: 'Second Section', description: 'Second' },
    ],
    inlineImages: [{ description: 'Inline image', anchorAfterSection: 5 }],
  };
}

const handlerOptions = { mode: 'errors-only' as const };

describe('editor tools', () => {
  it('exposes only the five surgical SEO check handlers', () => {
    const snapshot = cloneEditorSnapshot(mockPlan(), {
      intro: 'Alpha intro.',
      sections: [
        { title: 'First Section', body: 'First body.' },
        { title: 'Second Section', body: 'Second body.' },
      ],
      outro: 'Outro.',
    });
    const handlers = createEditorToolHandlers(() => snapshot, handlerOptions);

    expect(Object.keys(handlers).sort()).toEqual([
      'edit_intro',
      'edit_outro',
      'edit_plan_metadata',
      'edit_section_body',
      'edit_section_heading',
    ]);
  });

  it('syncs section heading changes to text snapshot', () => {
    const snapshot = cloneEditorSnapshot(mockPlan(), {
      intro: 'Alpha keyword appears here in the introduction for coverage.',
      sections: [
        { title: 'First Section', body: 'Body one with enough words for BLUF checks and beta keyword mention.' },
        { title: 'Second Section', body: 'Body two with enough words for BLUF checks and supporting detail.' },
      ],
      outro: 'Outro text.',
    });
    const handlers = createEditorToolHandlers(() => snapshot, handlerOptions);

    const result = handlers.edit_section_heading({
      sectionIndex: 0,
      title: 'Renamed Section',
    });

    expect(result.ok).toBe(true);
    expect(snapshot.plan.sections[0]?.title).toBe('Renamed Section');
    expect(snapshot.text.sections[0]?.title).toBe('Renamed Section');
  });

  it('updates plan metadata and validates primaryKeyword membership', () => {
    const snapshot = cloneEditorSnapshot(mockPlan(), {
      intro: 'Alpha intro.',
      sections: [
        { title: 'First Section', body: 'First body.' },
        { title: 'Second Section', body: 'Second body.' },
      ],
      outro: 'Outro.',
    });
    const handlers = createEditorToolHandlers(() => snapshot, handlerOptions);

    const invalid = handlers.edit_plan_metadata({ primaryKeyword: 'missing' });
    expect(invalid.ok).toBe(false);

    const valid = handlers.edit_plan_metadata({
      title: 'Updated Title',
      primaryKeyword: 'beta',
    });
    expect(valid.ok).toBe(true);
    expect(snapshot.plan.title).toBe('Updated Title');
    expect(snapshot.plan.primaryKeyword).toBe('beta');
  });

  it('edits intro, section body, and outro', () => {
    const snapshot = cloneEditorSnapshot(mockPlan(), {
      intro: 'Alpha intro.',
      sections: [
        { title: 'First Section', body: 'First body.' },
        { title: 'Second Section', body: 'Second body.' },
      ],
      outro: 'Outro.',
    });
    const handlers = createEditorToolHandlers(() => snapshot, handlerOptions);

    expect(handlers.edit_intro({ body: 'New intro.' }).ok).toBe(true);
    expect(handlers.edit_section_body({ sectionIndex: 1, body: 'New section body.' }).ok).toBe(true);
    expect(handlers.edit_outro({ body: 'New outro.' }).ok).toBe(true);
    expect(snapshot.text.intro).toBe('New intro.');
    expect(snapshot.text.sections[1]?.body).toBe('New section body.');
    expect(snapshot.text.outro).toBe('New outro.');
  });

  it('returns split remaining issue counts after edits', () => {
    const snapshot = cloneEditorSnapshot(mockPlan(), {
      intro: 'This intro does not mention the primary keyword at all.',
      sections: [
        { title: 'First Section', body: 'Short.' },
        { title: 'Second Section', body: 'Short.' },
      ],
      outro: 'Outro.',
    });
    const handlers = createEditorToolHandlers(() => snapshot, handlerOptions);

    const result = handlers.edit_intro({
      body: 'Alpha keyword appears here in the introduction for coverage.',
    });

    expect(result.ok).toBe(true);
    expect(result.remainingIssues).toBeGreaterThan(0);
    expect(result.remainingErrors).toBeDefined();
    expect(result.remainingWarnings).toBeDefined();
    expect((result.remainingErrors ?? 0) + (result.remainingWarnings ?? 0)).toBe(result.remainingIssues);
  });
});
