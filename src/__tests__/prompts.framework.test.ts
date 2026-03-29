import { buildArticlePlanJsonSchema, buildArticlePlanMessages } from '../llm/prompts/articlePlan.js';
import {
  buildIntroMessages,
  buildOutroMessages,
  buildSectionMessages,
} from '../llm/prompts/articleSection.js';
import { buildSingleShotContentMessages } from '../llm/prompts/channelContent.js';
import {
  buildRunContextDirective,
  buildStyleDirective,
  buildTargetLengthDirective,
  buildWritingFrameworkInstruction,
} from '../llm/prompts/writingFramework.js';
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
  it('returns universal framework guidance with do and avoid examples', () => {
    const framework = buildWritingFrameworkInstruction();

    expect(framework).toContain('Writing framework:');
    expect(framework).toContain('Do examples:');
    expect(framework).toContain('Avoid examples:');
    expect(framework).toContain('Information density mandate');
    expect(framework).toContain('Authenticity filter');
  });

  it('returns style-specific directive and fallback for unknown style', () => {
    expect(buildStyleDirective('technical')).toContain('Style directive (technical)');
    expect(buildStyleDirective('unknown-style')).toContain('Style directive: keep tone consistent');
  });

  it('includes normalized run context when no content types are provided', () => {
    expect(buildRunContextDirective([])).toContain('requested content types are article');
  });

  it('returns format-specific and fallback target length directives', () => {
    expect(buildTargetLengthDirective('article', 'small')).toContain('Target length (small article)');
    expect(buildTargetLengthDirective('unknown-channel', 'medium')).toContain('Target length (medium):');
    expect(buildTargetLengthDirective('linkedin-post', 'unknown-size')).toContain('Target length (medium linkedin post)');
  });
});

describe('article prompt builders', () => {
  it('builds article plan prompt with framework, style, and run context', () => {
    const messages = buildArticlePlanMessages('Ship better docs with AI', {
      style: 'friendly',
      contentTypes: ['article', 'x-thread'],
      contentBrief: mockBrief(),
      targetLength: 'medium',
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[0]?.content).toContain('Writing framework:');
    expect(messages[0]?.content).toContain('Style directive (friendly)');
    expect(messages[0]?.content).toContain('requested content types are article, x-thread');
    expect(messages[0]?.content).toContain('Target length (medium article)');
    expect(messages[0]?.content).toContain('adaptive persuasion structure');
    expect(messages[1]?.content).toContain('Avoid AI giveaway phrasing');
  });

  it('falls back to medium section ranges for unknown targetLength in messages', () => {
    const messages = buildArticlePlanMessages('Fallback sizing test', {
      style: 'professional',
      contentTypes: ['article'],
      contentBrief: mockBrief(),
      targetLength: 'invalid-length',
    });

    expect(messages[1]?.content).toContain('Plan 4 to 6 strong sections');
    expect(messages[1]?.content).toContain('sections: array of 4 to 6 objects');
  });

  it('builds article plan schema ranges by target length', () => {
    const smallSchema = buildArticlePlanJsonSchema('small');
    const mediumSchema = buildArticlePlanJsonSchema('medium');
    const largeSchema = buildArticlePlanJsonSchema('large');
    const fallbackSchema = buildArticlePlanJsonSchema('invalid-length');

    expect(smallSchema.properties.sections.minItems).toBe(2);
    expect(smallSchema.properties.sections.maxItems).toBe(4);
    expect(mediumSchema.properties.sections.minItems).toBe(4);
    expect(mediumSchema.properties.sections.maxItems).toBe(7);
    expect(largeSchema.properties.sections.minItems).toBe(6);
    expect(largeSchema.properties.sections.maxItems).toBe(10);
    expect(fallbackSchema.properties.sections.minItems).toBe(4);
    expect(fallbackSchema.properties.sections.maxItems).toBe(7);
  });

  it('builds intro, section, and outro prompts with shared framework and style overlay', () => {
    const plan = mockPlan();

    const intro = buildIntroMessages(plan, 'professional', ['article', 'linkedin-post'], 'small');
    const section = buildSectionMessages(plan, plan.sections[0]!, 'technical', ['article'], 'medium');
    const outro = buildOutroMessages(plan, 'storytelling', ['article', 'newsletter'], 'large');

    expect(intro[0]?.content).toContain('Writing framework:');
    expect(intro[0]?.content).toContain('Style directive (professional)');
    expect(intro[0]?.content).toContain('Target length (small article)');

    expect(section[0]?.content).toContain('Style directive (technical)');
    expect(section[1]?.content).toContain('Write the section titled');
    expect(section[1]?.content).toContain('3 to 6 paragraphs.');

    expect(outro[0]?.content).toContain('Style directive (storytelling)');
    expect(outro[0]?.content).toContain('requested content types are article, newsletter');
    expect(outro[1]?.content).toContain('3 to 5 paragraphs.');
  });

  it('falls back to medium paragraph targets when targetLength is unknown', () => {
    const plan = mockPlan();

    const intro = buildIntroMessages(plan, 'professional', ['article'], 'not-a-tier');
    const section = buildSectionMessages(plan, plan.sections[0]!, 'technical', ['article'], 'not-a-tier');
    const outro = buildOutroMessages(plan, 'storytelling', ['article'], 'not-a-tier');

    expect(intro[1]?.content).toContain('2 to 4 paragraphs.');
    expect(section[1]?.content).toContain('3 to 6 paragraphs.');
    expect(outro[1]?.content).toContain('2 to 3 paragraphs.');
  });
});

describe('channel prompt builder', () => {
  it('embeds framework and style directives for channel outputs', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Announce workflow automation update',
      contentType: 'linkedin-post',
      role: 'secondary',
      primaryContentType: 'article',
      style: 'opinionated',
      outputIndex: 1,
      outputCountForType: 1,
      contentBrief: mockBrief(),
      articleReferenceMarkdown: '# Anchor\n\nReference body',
      targetLength: 'large',
    });

    expect(messages[0]?.content).toContain('Writing framework:');
    expect(messages[0]?.content).toContain('Style directive (opinionated)');
    expect(messages[0]?.content).toContain('LinkedIn-native post');
    expect(messages[1]?.content).toContain('Shared content brief');
    expect(messages[1]?.content).toContain('Reference primary context');
    expect(messages[1]?.content).toContain('Target length (large linkedin post)');
  });

  it('adds explicit x-thread guidance without xMode metadata', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Share launch takeaways',
      contentType: 'x-thread',
      role: 'secondary',
      primaryContentType: 'article',
      style: 'professional',
      outputIndex: 2,
      outputCountForType: 3,
      contentBrief: mockBrief(),
      targetLength: 'small',
    });

    expect(messages[0]?.content).toContain('Return a numbered thread');
    expect(messages[0]?.content).toContain('prefixed like "1/7"');
    expect(messages[1]?.content).not.toContain('X mode:');
  });

  it('uses explicit x-post single-output guidance', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Ship one short launch note',
      contentType: 'x-post',
      role: 'secondary',
      primaryContentType: 'article',
      style: 'professional',
      outputIndex: 1,
      outputCountForType: 1,
      contentBrief: mockBrief(),
      targetLength: 'small',
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
      outputIndex: 1,
      outputCountForType: 1,
      contentBrief: mockBrief(),
      targetLength: 'medium',
    });

    expect(messages[0]?.content).toContain('Write channel-native Markdown content.');
  });
});