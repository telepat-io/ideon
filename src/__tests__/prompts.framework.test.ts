import { buildArticlePlanMessages } from '../llm/prompts/articlePlan.js';
import {
  buildIntroMessages,
  buildOutroMessages,
  buildSectionMessages,
} from '../llm/prompts/articleSection.js';
import { buildSingleShotContentMessages } from '../llm/prompts/channelContent.js';
import {
  buildRunContextDirective,
  buildStyleDirective,
  buildWritingFrameworkInstruction,
} from '../llm/prompts/writingFramework.js';
import type { ArticlePlan } from '../types/article.js';
import type { ContentBrief } from '../types/contentBrief.js';

function mockBrief(): ContentBrief {
  return {
    description: 'A practical cross-channel content body about shipping AI-assisted workflows with clear operational guidance.',
    targetAudience: 'Content and product teams running repeatable publishing workflows.',
    corePromise: 'Readers leave with a concrete plan they can run in the next production cycle.',
    keyPoints: [
      'Define boundaries between human review and model generation.',
      'Use consistent prompt contracts across channels.',
      'Adapt format per channel while preserving core message.',
    ],
    voiceNotes: 'Direct, practical, and specific tone. Avoid hype and vague statements.',
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
  });

  it('returns style-specific directive and fallback for unknown style', () => {
    expect(buildStyleDirective('technical')).toContain('Style directive (technical)');
    expect(buildStyleDirective('unknown-style')).toContain('Style directive: keep the tone consistent');
  });

  it('includes normalized run context when no content types are provided', () => {
    expect(buildRunContextDirective([])).toContain('requested content types are article');
  });
});

describe('article prompt builders', () => {
  it('builds article plan prompt with framework, style, and run context', () => {
    const messages = buildArticlePlanMessages('Ship better docs with AI', {
      style: 'friendly',
      contentTypes: ['article', 'x-post'],
      contentBrief: mockBrief(),
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[0]?.content).toContain('Writing framework:');
    expect(messages[0]?.content).toContain('Style directive (friendly)');
    expect(messages[0]?.content).toContain('requested content types are article, x-post');
  });

  it('builds intro, section, and outro prompts with shared framework and style overlay', () => {
    const plan = mockPlan();

    const intro = buildIntroMessages(plan, 'professional', ['article', 'linkedin-post']);
    const section = buildSectionMessages(plan, plan.sections[0]!, 'technical', ['article']);
    const outro = buildOutroMessages(plan, 'storytelling', ['article', 'newsletter']);

    expect(intro[0]?.content).toContain('Writing framework:');
    expect(intro[0]?.content).toContain('Style directive (professional)');

    expect(section[0]?.content).toContain('Style directive (technical)');
    expect(section[1]?.content).toContain('Write the section titled');

    expect(outro[0]?.content).toContain('Style directive (storytelling)');
    expect(outro[0]?.content).toContain('requested content types are article, newsletter');
  });
});

describe('channel prompt builder', () => {
  it('embeds framework and style directives for channel outputs', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Announce workflow automation update',
      contentType: 'linkedin-post',
      style: 'opinionated',
      outputIndex: 1,
      outputCountForType: 1,
      contentBrief: mockBrief(),
      articleReferenceMarkdown: '# Anchor\n\nReference body',
    });

    expect(messages[0]?.content).toContain('Writing framework:');
    expect(messages[0]?.content).toContain('Style directive (opinionated)');
    expect(messages[0]?.content).toContain('LinkedIn-native post');
    expect(messages[1]?.content).toContain('Shared content brief');
    expect(messages[1]?.content).toContain('Reference article context');
  });

  it('adds explicit x thread guidance when xMode is thread', () => {
    const messages = buildSingleShotContentMessages({
      idea: 'Share launch takeaways',
      contentType: 'x-post',
      style: 'professional',
      outputIndex: 2,
      outputCountForType: 3,
      contentBrief: mockBrief(),
      xMode: 'thread',
    });

    expect(messages[0]?.content).toContain('If xMode is single, return one concise post.');
    expect(messages[0]?.content).toContain('prefixed like "1/7"');
    expect(messages[1]?.content).toContain('X mode: thread');
  });
});