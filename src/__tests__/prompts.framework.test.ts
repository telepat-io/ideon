import { buildArticlePlanJsonSchema, buildArticlePlanMessages } from '../llm/prompts/articlePlan.js';
import {
  buildIntroMessages,
  buildOutroMessages,
  buildSectionMessages,
} from '../llm/prompts/articleSection.js';
import { buildSingleShotContentMessages } from '../llm/prompts/channelContent.js';
import {
  buildRunContextDirective,
  buildTargetLengthDirective,
} from '../llm/prompts/writingFramework.js';
import { buildContentBriefMessages } from '../llm/prompts/contentBrief.js';
import type { ArticlePlan } from '../types/article.js';
import type { ContentBrief } from '../types/contentBrief.js';

function mockBrief(): ContentBrief {
  return {
    title: 'Shipping AI-Assisted Workflows Across Channels',
    description: 'A practical cross-channel content body about shipping AI-assisted workflows with clear operational guidance.',
    targetAudience: 'Content and product teams running repeatable publishing workflows.',
    corePromise: 'Readers leave with a concrete plan they can run in the next production cycle.',
    keyPoints: [
      'Define boundaries between human review and model generation.',
      'Use consistent prompt contracts across channels.',
      'Adapt format per channel while preserving core message.',
    ],
    voiceNotes: 'Direct, practical, and specific tone. Avoid hype and vague statements.',
    primaryContentType: 'article',
    secondaryContentTypes: ['x-thread', 'linkedin-post'],
    secondaryContentStrategy: 'Secondaries should provide standalone value and create curiosity that leads to the primary piece.',
  };
}

function mockPlan(): ArticlePlan {
  return {
    title: 'Practical AI Workflows',
    subtitle: 'How teams ship faster with guardrails',
    keywords: ['ai', 'workflows', 'delivery'],
    slug: 'practical-ai-workflows',
    description: 'A guide to practical AI workflow design.',
    introBrief: 'Open with the delivery gap and why it matters.',
    outroBrief: 'Close with a practical rollout checklist.',
    sections: [
      { title: 'Define the workflow boundary', description: 'Choose where AI helps and where human review stays mandatory.' },
      { title: 'Build a repeatable prompt contract', description: 'Use stable templates, examples, and acceptance criteria.' },
      { title: 'Measure quality in production', description: 'Track defect classes and response quality over time.' },
      { title: 'Scale with governance', description: 'Add policy checks and ownership to each step.' },
    ],
    coverImageDescription: 'A product team planning board with workflow swimlanes and checklists.',
    inlineImages: [
      { anchorAfterSection: 1, description: 'Workflow boundary diagram with human and AI handoffs.' },
      { anchorAfterSection: 3, description: 'Quality dashboard showing trend lines and defect categories.' },
    ],
  };
}

describe('writing framework helpers', () => {
  it('includes normalized run context when no content types are provided', () => {
    expect(buildRunContextDirective([])).toContain('requested content types are article');
  });

  it('returns format-specific and fallback target length directives', () => {
    expect(buildTargetLengthDirective('article', 500)).toContain('aim for about 500 words total');
    expect(buildTargetLengthDirective('unknown-channel', 900)).toContain('Target length (medium):');
    expect(buildTargetLengthDirective('linkedin-post', Number.NaN)).toContain('Target length (medium linkedin post)');
  });
});

describe('article prompt builders', () => {
  it('builds article plan prompt with guide bundle and run context only', () => {
    const messages = buildArticlePlanMessages('Ship better docs with AI', {
      intent: 'tutorial',
      contentTypes: ['article', 'x-thread'],
      contentBrief: mockBrief(),
      targetLength: 900,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[0]?.content).toContain('requested content types are article, x-thread');
    expect(messages[0]?.content).toContain('aim for about 900 words total');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/references/headline-writing-systems.md');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/references/content-frameworks.md');
    expect(messages[0]?.content).not.toContain('Writing framework:');
    expect(messages[0]?.content).not.toContain('Style directive (friendly)');
    expect(messages[0]?.content).not.toContain('Intent directive (tutorial)');
    expect(messages[0]?.content).not.toContain('adaptive persuasion structure');
    expect(messages[0]?.content).not.toContain('Quality bar:');
    expect(messages[0]?.content).not.toContain('Avoid generic filler');
    expect(messages[1]?.content).not.toContain('Avoid AI giveaway phrasing');
  });

  it('builds content brief prompt with shared-brief guide bundle', () => {
    const messages = buildContentBriefMessages('Ship better docs with AI', {
      intent: 'tutorial',
      primaryContentType: 'article',
      secondaryContentTypes: ['x-thread', 'linkedin-post'],
    });

    expect(messages[0]?.content).toContain('Guide source: writing-guide/references/multi-channel-brief-strategy.md');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/references/target-length-guidance.md');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/formats/article.md');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/formats/x-thread.md');
  });

  it('falls back to medium section ranges for unknown targetLength in messages', () => {
    const messages = buildArticlePlanMessages('Fallback sizing test', {
      intent: 'how-to-guide',
      contentTypes: ['article'],
      contentBrief: mockBrief(),
      targetLength: Number.NaN,
    });

    expect(messages[1]?.content).toContain('Plan 3 to 5 strong sections');
    expect(messages[1]?.content).toContain('sections: array of 3 to 5 objects');
  });

  it('builds article plan schema ranges by target length', () => {
    const smallSchema = buildArticlePlanJsonSchema(500);
    const mediumSchema = buildArticlePlanJsonSchema(900);
    const largeSchema = buildArticlePlanJsonSchema(1400);
    const fallbackSchema = buildArticlePlanJsonSchema(Number.NaN);

    expect(smallSchema.properties.sections.minItems).toBe(2);
    expect(smallSchema.properties.sections.maxItems).toBe(3);
    expect(mediumSchema.properties.sections.minItems).toBe(3);
    expect(mediumSchema.properties.sections.maxItems).toBe(5);
    expect(largeSchema.properties.sections.minItems).toBe(5);
    expect(largeSchema.properties.sections.maxItems).toBe(7);
    expect(fallbackSchema.properties.sections.minItems).toBe(3);
    expect(fallbackSchema.properties.sections.maxItems).toBe(5);
  });

  it('builds intro, section, and outro prompts with guide bundles and operational constraints', () => {
    const plan = mockPlan();

    const intro = buildIntroMessages(plan, 'professional', 'tutorial', ['article', 'linkedin-post'], 500, 120);
    const section = buildSectionMessages(
      plan,
      plan.sections[0]!,
      '## Introduction\n\nExisting intro context.',
      'technical',
      'deep-dive-analysis',
      ['article'],
      900,
      210,
    );
    const outro = buildOutroMessages(plan, 'storytelling', 'opinion-piece', ['article', 'newsletter'], 1400, 200);

    expect(intro[0]?.content).toContain('Guide source: writing-guide/general/core-web-writing-rules.md');
    expect(intro[0]?.content).toContain('Guide source: writing-guide/references/skimmability-patterns.md');
    expect(intro[0]?.content).toContain('Guide source: writing-guide/styles/professional.md');
    expect(intro[0]?.content).toContain('Guide source: writing-guide/content-intent/tutorial.md');
    expect(intro[0]?.content).toContain('Guide source: writing-guide/formats/article.md');
    expect(intro[0]?.content).not.toContain('Writing framework:');
    expect(intro[0]?.content).not.toContain('Style directive (professional)');
    expect(intro[0]?.content).not.toContain('Intent directive (tutorial)');
    expect(intro[0]?.content).toContain('aim for about 500 words total');

    expect(section[0]?.content).toContain('Guide source: writing-guide/references/emotional-resonance.md');
    expect(section[0]?.content).toContain('Guide source: writing-guide/references/readability-and-pace.md');
    expect(section[0]?.content).toContain('Guide source: writing-guide/styles/technical.md');
    expect(section[0]?.content).toContain('Guide source: writing-guide/content-intent/deep-dive-analysis.md');
    expect(section[0]?.content).not.toContain('Style directive (technical)');
    expect(section[0]?.content).not.toContain('Intent directive (deep-dive-analysis)');
    expect(section[1]?.content).toContain('Write the section titled');
    expect(section[1]?.content).toContain('Article generated so far:');
    expect(section[1]?.content).toContain('Existing intro context.');
    expect(section[1]?.content).toContain('3 to 6 paragraphs.');
    expect(section[1]?.content).toContain('Target length: about 210 words.');

    expect(outro[0]?.content).toContain('Guide source: writing-guide/references/prose-quality-checks.md');
    expect(outro[0]?.content).toContain('Guide source: writing-guide/styles/storytelling.md');
    expect(outro[0]?.content).toContain('Guide source: writing-guide/content-intent/opinion-piece.md');
    expect(outro[0]?.content).not.toContain('Style directive (storytelling)');
    expect(outro[0]?.content).not.toContain('Intent directive (opinion-piece)');
    expect(outro[0]?.content).toContain('requested content types are article, newsletter');
    expect(outro[1]?.content).toContain('3 to 5 paragraphs.');
    expect(outro[1]?.content).toContain('Target length: about 200 words.');
  });

  it('falls back to medium paragraph targets when targetLength is unknown', () => {
    const plan = mockPlan();

    const intro = buildIntroMessages(plan, 'professional', 'tutorial', ['article'], Number.NaN, 140);
    const section = buildSectionMessages(
      plan,
      plan.sections[0]!,
      '## Introduction\n\nExisting intro context.',
      'technical',
      'tutorial',
      ['article'],
      Number.NaN,
      200,
    );
    const outro = buildOutroMessages(plan, 'storytelling', 'tutorial', ['article'], Number.NaN, 120);

    expect(intro[1]?.content).toContain('2 to 4 paragraphs.');
    expect(section[1]?.content).toContain('3 to 6 paragraphs.');
    expect(outro[1]?.content).toContain('2 to 3 paragraphs.');
  });
});

describe('channel prompt builder', () => {
  it('embeds guide-driven instructions and operational constraints for channel outputs', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Announce workflow automation update',
      contentType: 'linkedin-post',
      role: 'secondary',
      primaryContentType: 'article',
      style: 'authoritative',
      intent: 'announcement',
      outputIndex: 1,
      outputCountForType: 1,
      contentBrief: mockBrief(),
      articleReferenceMarkdown: '# Anchor\n\nReference body',
      targetLength: 1400,
    });

    expect(messages[0]?.content).toContain('Guide source: writing-guide/references/truthful-value-framing.md');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/formats/linkedin-post.md');
    expect(messages[0]?.content).not.toContain('Writing framework:');
    expect(messages[0]?.content).not.toContain('Style directive (authoritative)');
    expect(messages[0]?.content).not.toContain('Intent directive (announcement)');
    expect(messages[0]?.content).not.toContain('LinkedIn-native post');
    expect(messages[1]?.content).toContain('Shared content brief');
    expect(messages[1]?.content).toContain('Reference primary context');
    expect(messages[1]?.content).toContain('Target length (large linkedin post)');
    expect(messages[1]?.content).toContain('Overall run target is about 1400 words.');
  });

  it('adds explicit x-thread guidance without xMode metadata', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Share launch takeaways',
      contentType: 'x-thread',
      role: 'secondary',
      primaryContentType: 'article',
      style: 'professional',
      intent: 'tutorial',
      outputIndex: 2,
      outputCountForType: 3,
      contentBrief: mockBrief(),
      targetLength: 500,
    });

    expect(messages[0]?.content).toContain('Return a numbered thread');
    expect(messages[0]?.content).toContain('prefixed like "1/7"');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/references/x-thread-hooks.md');
    expect(messages[1]?.content).not.toContain('X mode:');
  });

  it('uses explicit x-post single-output guidance', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Ship one short launch note',
      contentType: 'x-post',
      role: 'secondary',
      primaryContentType: 'article',
      style: 'professional',
      intent: 'tutorial',
      outputIndex: 1,
      outputCountForType: 1,
      contentBrief: mockBrief(),
      targetLength: 500,
    });

    expect(messages[0]?.content).toContain('Return one concise post only.');
    expect(messages[0]?.content).toContain('Do not return numbered thread lines.');
  });

  it('falls back to generic channel rule for unknown content types', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Fallback channel guidance',
      contentType: 'unknown-channel',
      role: 'secondary',
      primaryContentType: 'article',
      style: 'professional',
      intent: 'tutorial',
      outputIndex: 1,
      outputCountForType: 1,
      contentBrief: mockBrief(),
      targetLength: 900,
    });

    expect(messages[0]?.content).not.toContain('Write channel-native Markdown content.');
  });
});