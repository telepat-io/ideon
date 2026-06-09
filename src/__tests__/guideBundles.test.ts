import {
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
    expect(withoutKeywords).not.toContain('writing-guide/seo/keyword-integration.md');
  });

  it('loads tiered section bundles with distinct guide sets', () => {
    const intro = buildIntroGuideInstruction('professional', 'tutorial', 'article', ['seo term']);
    const section = buildSectionGuideInstruction('professional', 'tutorial', 'article', ['seo term']);
    const outro = buildOutroGuideInstruction('professional', 'tutorial', 'article');

    expect(intro).toContain('writing-guide/seo/keyword-integration.md');
    expect(section).toContain('writing-guide/seo/fact-density.md');
    expect(section).toContain('writing-guide/seo/keyword-integration.md');
    expect(outro).not.toContain('writing-guide/seo/keyword-integration.md');
    expect(outro).not.toContain('writing-guide/seo/fact-density.md');
  });
});
