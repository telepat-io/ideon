import {
  buildFaqGuideInstruction,
  buildIntroGuideInstruction,
  buildOutroGuideInstruction,
  buildPrimaryPlanGuideInstruction,
  buildSectionGuideInstruction,
} from '../llm/prompts/guideBundles.js';

describe('guideBundles', () => {
  it('includes keyword-integration guide when keywords are provided to primary plan bundle', () => {
    const withKeywords = buildPrimaryPlanGuideInstruction('tutorial', 'article', ['kubernetes', 'pods']);
    const withoutKeywords = buildPrimaryPlanGuideInstruction('tutorial', 'article');

    expect(withKeywords).toContain('writing-guide/seo/keyword-integration.md');
    expect(withKeywords).toContain('writing-guide/seo/ai-search-extraction.md');
    expect(withoutKeywords).not.toContain('writing-guide/seo/keyword-integration.md');
    expect(withoutKeywords).toContain('writing-guide/seo/ai-search-extraction.md');
  });

  it('loads tiered section bundles with distinct guide sets', () => {
    const intro = buildIntroGuideInstruction('professional', 'tutorial', 'article', ['seo term']);
    const section = buildSectionGuideInstruction('professional', 'tutorial', 'article', ['seo term']);
    const outro = buildOutroGuideInstruction('professional', 'tutorial', 'article');

    expect(intro).toContain('writing-guide/seo/keyword-integration.md');
    expect(intro).toContain('writing-guide/seo/ai-search-extraction.md');
    expect(section).toContain('writing-guide/seo/fact-density.md');
    expect(section).toContain('writing-guide/seo/ai-search-extraction.md');
    expect(section).toContain('writing-guide/seo/keyword-integration.md');
    expect(outro).not.toContain('writing-guide/seo/keyword-integration.md');
    expect(outro).not.toContain('writing-guide/seo/fact-density.md');
    expect(outro).not.toContain('writing-guide/seo/ai-search-extraction.md');
  });

  it('loads ai-search-extraction only for long-form primary plan bundles', () => {
    const longForm = buildPrimaryPlanGuideInstruction('tutorial', 'article');
    const shortForm = buildPrimaryPlanGuideInstruction('announcement', 'x-post');

    expect(longForm).toContain('writing-guide/seo/ai-search-extraction.md');
    expect(shortForm).not.toContain('writing-guide/seo/ai-search-extraction.md');
  });

  it('loads faq guide instruction from ai-search-extraction', () => {
    const faqGuide = buildFaqGuideInstruction();
    expect(faqGuide).toContain('writing-guide/seo/ai-search-extraction.md');
  });
});
