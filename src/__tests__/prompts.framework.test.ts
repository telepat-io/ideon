import {
  buildPrimaryPlanJsonSchema,
  buildPrimaryPlanMessages,
} from '../llm/prompts/primaryPlan.js';
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
import { buildContentPlanMessages } from '../llm/prompts/contentPlan.js';
import { buildPrimaryPlanGuideInstruction } from '../llm/prompts/guideBundles.js';
import type { ArticlePlan, PrimaryPlan } from '../types/article.js';
import type { ContentPlan } from '../types/contentPlan.js';

function mockBrief(): ContentPlan {
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
    primaryKeyword: 'ai',
    slug: 'practical-ai-workflows',
    contentType: 'article',
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
      { description: 'Workflow boundary diagram with human and AI handoffs.', anchorAfterSection: 2 },
      { description: 'Quality dashboard showing trend lines and defect categories.', anchorAfterSection: 4 },
    ],
  };
}

function mockShortPlan(): PrimaryPlan {
  return {
    title: 'Ship Faster with AI',
    slug: 'ship-faster-with-ai',
    contentType: 'x-post',
    description: 'A concise post about AI-assisted shipping.',
    coverImageDescription: 'A fast-moving delivery drone over a city skyline.',
    angle: 'Concrete wins over hype: show how small AI workflows compound.',
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

describe('primary plan prompt builders', () => {
  it('builds long-form plan prompt with guide bundle and run context', () => {
    const messages = buildPrimaryPlanMessages('Ship better docs with AI', {
      contentType: 'article',
      intent: 'tutorial',
      contentTypes: ['article', 'x-thread'],
      contentPlan: mockBrief(),
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
    expect(messages[1]?.content).toContain('contentType: set to "article" exactly');
    // Verify medium article gets 1-2 inline image instruction
    expect(messages[1]?.content).toContain('Include a cover image description and 1 to 2 inline image descriptions');
    expect(messages[1]?.content).toContain('inlineImages: array of 1 to 2 objects');
    // Verify anchorAfterSection guidance starts at 1
    expect(messages[1]?.content).toContain('anchorAfterSection, starting at 1');
  
  });

  it('uses proportional image count instructions by target length for long-form', () => {
    const smallMessages = buildPrimaryPlanMessages('Small article idea', {
      contentType: 'article',
      intent: 'how-to-guide',
      contentTypes: ['article'],
      contentPlan: mockBrief(),
      targetLength: 500,
    });

    const largeMessages = buildPrimaryPlanMessages('Large article idea', {
      contentType: 'article',
      intent: 'deep-dive-analysis',
      contentTypes: ['article'],
      contentPlan: mockBrief(),
      targetLength: 1400,
    });

    // small (500 words) → 0-1 inline images
    expect(smallMessages[1]?.content).toContain('Include a cover image description and 0 to 1 inline image descriptions');
    expect(smallMessages[1]?.content).toContain('inlineImages: array of 0 to 1 objects');

    // large (1400 words) → 2-4 inline images
    expect(largeMessages[1]?.content).toContain('Include a cover image description and 2 to 4 inline image descriptions');
    expect(largeMessages[1]?.content).toContain('inlineImages: array of 2 to 4 objects');
  });

  it('builds short-form plan prompt without sections or keywords', () => {
    const messages = buildPrimaryPlanMessages('Ship better docs with AI', {
      contentType: 'x-post',
      intent: 'announcement',
      contentTypes: ['x-post', 'linkedin-post'],
      contentPlan: mockBrief(),
      targetLength: 500,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.content).toContain('contentType: set to "x-post" exactly');
    expect(messages[1]?.content).toContain('angle: string');
    expect(messages[1]?.content).not.toContain('sections:');
    expect(messages[1]?.content).not.toContain('keywords:');
    expect(messages[1]?.content).not.toContain('introBrief:');
    expect(messages[1]?.content).not.toContain('outroBrief:');
    expect(messages[1]?.content).not.toContain('subtitle:');
  });

  it('falls back to medium section ranges for unknown targetLength in long-form messages', () => {
    const messages = buildPrimaryPlanMessages('Fallback sizing test', {
      contentType: 'article',
      intent: 'how-to-guide',
      contentTypes: ['article'],
      contentPlan: mockBrief(),
      targetLength: Number.NaN,
    });

    expect(messages[1]?.content).toContain('Plan 3 to 5 strong sections');
    expect(messages[1]?.content).toContain('sections: array of 3 to 5 objects');
  });

  it('builds long-form plan schema ranges by target length', () => {
    const smallSchema = buildPrimaryPlanJsonSchema('article', 500);
    const mediumSchema = buildPrimaryPlanJsonSchema('article', 900);
    const largeSchema = buildPrimaryPlanJsonSchema('article', 1400);
    const fallbackSchema = buildPrimaryPlanJsonSchema('article', Number.NaN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((smallSchema as any).properties.sections.minItems).toBe(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((smallSchema as any).properties.sections.maxItems).toBe(3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mediumSchema as any).properties.sections.minItems).toBe(3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mediumSchema as any).properties.sections.maxItems).toBe(5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((largeSchema as any).properties.sections.minItems).toBe(5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((largeSchema as any).properties.sections.maxItems).toBe(7);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((fallbackSchema as any).properties.sections.minItems).toBe(3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((fallbackSchema as any).properties.sections.maxItems).toBe(5);
  });

  it('generates proportional inline image counts by target length for long-form', () => {
    const smallSchema = buildPrimaryPlanJsonSchema('article', 500);
    const mediumSchema = buildPrimaryPlanJsonSchema('article', 900);
    const largeSchema = buildPrimaryPlanJsonSchema('article', 1400);
    const fallbackSchema = buildPrimaryPlanJsonSchema('article', Number.NaN);

    // small: 0-1 inline images (+ 1 cover = 1-2 total)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((smallSchema as any).properties.inlineImages.minItems).toBe(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((smallSchema as any).properties.inlineImages.maxItems).toBe(1);

    // medium: 1-2 inline images (+ 1 cover = 2-3 total)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mediumSchema as any).properties.inlineImages.minItems).toBe(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mediumSchema as any).properties.inlineImages.maxItems).toBe(2);

    // large: 2-4 inline images (+ 1 cover = 3-5 total)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((largeSchema as any).properties.inlineImages.minItems).toBe(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((largeSchema as any).properties.inlineImages.maxItems).toBe(4);

    // fallback (medium): 1-2 inline images
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((fallbackSchema as any).properties.inlineImages.minItems).toBe(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((fallbackSchema as any).properties.inlineImages.maxItems).toBe(2);
  });

  it('builds short-form plan schema without sections or inlineImages', () => {
    const schema = buildPrimaryPlanJsonSchema('x-post', 500);

    expect(schema.required).not.toContain('sections');
    expect(schema.required).not.toContain('inlineImages');
    expect(schema.required).not.toContain('keywords');
    expect(schema.required).not.toContain('introBrief');
    expect(schema.required).not.toContain('outroBrief');
    expect(schema.required).not.toContain('subtitle');
    expect(schema.properties).not.toHaveProperty('sections');
    expect(schema.properties).not.toHaveProperty('inlineImages');
    expect(schema.required).toContain('angle');
  });
});

describe('article section prompt builders', () => {
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

describe('content plan prompt builder', () => {
  it('builds content plan prompt with shared-plan guide bundle', () => {
    const messages = buildContentPlanMessages('Ship better docs with AI', {
      intent: 'tutorial',
      primaryContentType: 'article',
      secondaryContentTypes: ['x-thread', 'linkedin-post'],
    });

    expect(messages[0]?.content).toContain('Guide source: writing-guide/references/multi-channel-plan-strategy.md');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/references/target-length-guidance.md');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/formats/article.md');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/formats/x-thread.md');
  });
});

describe('primary plan guide instruction', () => {
  it('returns full guide bundle for long-form content types', () => {
    const instruction = buildPrimaryPlanGuideInstruction('tutorial', 'article');

    expect(instruction).toContain('Guide source: writing-guide/references/headline-writing-systems.md');
    expect(instruction).toContain('Guide source: writing-guide/references/ideation-and-credibility-systems.md');
    expect(instruction).toContain('Guide source: writing-guide/references/content-frameworks.md');
    expect(instruction).toContain('Guide source: writing-guide/content-intent/tutorial.md');
    expect(instruction).toContain('Guide source: writing-guide/formats/article.md');
  });

  it('returns reduced guide bundle for short-form content types', () => {
    const instruction = buildPrimaryPlanGuideInstruction('announcement', 'x-post');

    expect(instruction).toContain('Guide source: writing-guide/references/headline-writing-systems.md');
    expect(instruction).not.toContain('Guide source: writing-guide/references/ideation-and-credibility-systems.md');
    expect(instruction).not.toContain('Guide source: writing-guide/references/content-frameworks.md');
    expect(instruction).toContain('Guide source: writing-guide/content-intent/announcement.md');
    expect(instruction).toContain('Guide source: writing-guide/formats/x-post.md');
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
      contentPlan: mockBrief(),
      articleReferenceMarkdown: '# Anchor\n\nReference body',
      targetLength: 1400,
    });

    expect(messages[0]?.content).toContain('Guide source: writing-guide/references/truthful-value-framing.md');
    expect(messages[0]?.content).toContain('Guide source: writing-guide/formats/linkedin-post.md');
    expect(messages[0]?.content).not.toContain('Writing framework:');
    expect(messages[0]?.content).not.toContain('Style directive (authoritative)');
    expect(messages[0]?.content).not.toContain('Intent directive (announcement)');
    expect(messages[0]?.content).not.toContain('LinkedIn-native post');
    expect(messages[1]?.content).toContain('Shared content plan');
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
      contentPlan: mockBrief(),
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
      contentPlan: mockBrief(),
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
      contentPlan: mockBrief(),
      targetLength: 900,
    });

    expect(messages[0]?.content).not.toContain('Write channel-native Markdown content.');
  });

  it('embeds primary plan context when plan is provided', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Announce workflow automation update',
      contentType: 'linkedin-post',
      role: 'secondary',
      primaryContentType: 'x-post',
      style: 'authoritative',
      intent: 'announcement',
      outputIndex: 1,
      outputCountForType: 1,
      contentPlan: mockBrief(),
      plan: mockShortPlan(),
      targetLength: 500,
    });

    expect(messages[1]?.content).toContain('Primary content plan (use to guide tone, angle, and structure)');
    expect(messages[1]?.content).toContain('title: Ship Faster with AI');
    expect(messages[1]?.content).toContain('description: A concise post about AI-assisted shipping.');
    expect(messages[1]?.content).toContain('angle: Concrete wins over hype: show how small AI workflows compound.');
  });

  it('omits primary plan context when plan is not provided', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Announce workflow automation update',
      contentType: 'linkedin-post',
      role: 'secondary',
      primaryContentType: 'article',
      style: 'authoritative',
      intent: 'announcement',
      outputIndex: 1,
      outputCountForType: 1,
      contentPlan: mockBrief(),
      targetLength: 500,
    });

    expect(messages[1]?.content).not.toContain('Primary content plan (use to guide tone, angle, and structure)');
  });
});
