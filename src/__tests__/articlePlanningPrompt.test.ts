import { describe, it, expect } from '@jest/globals';
import { buildArticlePlanningMessages } from '../llm/prompts/articlePlanning.js';

describe('buildArticlePlanningMessages', () => {
  it('returns system and user messages', () => {
    const messages = buildArticlePlanningMessages({
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      supportingKeywords: ['kw1'],
      funnelStage: 'top',
      desiredArticlesPerSeries: 3,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
      isPillar: true,
    });

    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes series details', () => {
    const messages = buildArticlePlanningMessages({
      seriesName: 'Content Strategy',
      pillarKeyword: 'content strategy',
      supportingKeywords: ['kw1', 'kw2'],
      funnelStage: 'middle',
      desiredArticlesPerSeries: 5,
      targetMarket: { countryCodes: ['US', 'GB'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
      isPillar: true,
    });

    expect(messages[1].content).toContain('Content Strategy');
    expect(messages[1].content).toContain('content strategy');
    expect(messages[1].content).toContain('kw1, kw2');
    expect(messages[1].content).toContain('middle');
    expect(messages[1].content).toContain('US, GB');
  });

  it('includes existing articles block', () => {
    const messages = buildArticlePlanningMessages({
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      supportingKeywords: [],
      funnelStage: 'top',
      desiredArticlesPerSeries: 3,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [
        { title: 'Existing Article', keywords: ['kw1', 'kw2'] },
      ],
      coverageOverlap: [],
      isPillar: true,
    });

    expect(messages[1].content).toContain('Existing Article');
    expect(messages[1].content).toContain('kw1, kw2');
    expect(messages[1].content).toContain('do not duplicate');
  });

  it('shows (none) when no existing articles', () => {
    const messages = buildArticlePlanningMessages({
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      supportingKeywords: [],
      funnelStage: 'top',
      desiredArticlesPerSeries: 3,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
      isPillar: true,
    });

    expect(messages[1].content).toContain('(none)');
  });

  it('includes coverage overlap block', () => {
    const messages = buildArticlePlanningMessages({
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      supportingKeywords: [],
      funnelStage: 'top',
      desiredArticlesPerSeries: 3,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [
        { title: 'Old Article', keywords: ['old-kw'], ageMonths: 8 },
      ],
      isPillar: true,
    });

    expect(messages[1].content).toContain('Old Article');
    expect(messages[1].content).toContain('8mo ago');
    expect(messages[1].content).toContain('Overlapping existing coverage');
  });

  it('includes desired article count', () => {
    const messages = buildArticlePlanningMessages({
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      supportingKeywords: [],
      funnelStage: 'top',
      desiredArticlesPerSeries: 7,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
      isPillar: true,
    });

    expect(messages[1].content).toContain('Plan 7 articles');
  });

  it('includes format options', () => {
    const messages = buildArticlePlanningMessages({
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      supportingKeywords: [],
      funnelStage: 'top',
      desiredArticlesPerSeries: 3,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
      isPillar: true,
    });

    expect(messages[1].content).toContain('guide');
    expect(messages[1].content).toContain('listicle');
    expect(messages[1].content).toContain('comparison');
    expect(messages[1].content).toContain('case-study');
    expect(messages[1].content).toContain('tutorial');
    expect(messages[1].content).toContain('opinion');
  });

  it('includes priority rules', () => {
    const messages = buildArticlePlanningMessages({
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      supportingKeywords: [],
      funnelStage: 'top',
      desiredArticlesPerSeries: 3,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
      isPillar: true,
    });

    expect(messages[1].content).toContain('Priority rules');
    expect(messages[1].content).toContain('KOB >= 4');
    expect(messages[1].content).toContain('KOB >= 2');
    expect(messages[1].content).toContain('KOB < 2');
  });

  it('includes JSON response format', () => {
    const messages = buildArticlePlanningMessages({
      seriesName: 'Test Series',
      pillarKeyword: 'pillar',
      supportingKeywords: [],
      funnelStage: 'top',
      desiredArticlesPerSeries: 3,
      targetMarket: { countryCodes: ['US'], language: 'en' },
      existingArticles: [],
      coverageOverlap: [],
      isPillar: true,
    });

    expect(messages[1].content).toContain('Respond only in JSON');
    expect(messages[1].content).toContain('articles');
  });
});
