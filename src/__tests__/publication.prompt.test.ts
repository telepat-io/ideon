import { jest } from '@jest/globals';
import type { Publication } from '../types/publication.js';
import { buildContentPlanMessages } from '../llm/prompts/contentPlan.js';
import { buildPrimaryPlanMessages } from '../llm/prompts/primaryPlan.js';
import { buildIntroMessages, buildSectionMessages, buildOutroMessages } from '../llm/prompts/articleSection.js';
import { buildSingleShotContentMessages } from '../llm/prompts/channelContent.js';
import { publicationSchema } from '../types/publication.js';
import { defaultAppSettings } from '../config/schema.js';

const testPublication: Publication = publicationSchema.parse({
  name: 'Tech Blog',
  slug: 'tech-blog',
  editorialPolicy: {
    tone: 'authoritative',
    forbiddenTopics: ['competitor names'],
    disclosureRequirements: ['FTC compliance'],
    audienceRestrictions: ['no jargon'],
    notes: 'Always cite sources.',
  },
  defaults: {
    style: 'technical',
  },
});

const testPlan = {
  title: 'Test Plan',
  subtitle: 'Subtitle',
  keywords: ['a', 'b', 'c'],
  primaryKeyword: 'a',
  slug: 'test-plan',
  contentType: 'article',
  description: 'A test article about testing.',
  introBrief: 'Introduce testing.',
  outroBrief: 'Conclude testing.',
  sections: [
    { title: 'Section One', description: 'Section one description.' },
    { title: 'Section Two', description: 'Section two description.' },
  ],
  coverImageDescription: 'A test cover image.',
  inlineImages: [],
};

const testContentPlan = {
  title: 'Content Plan',
  description: 'A shared content plan for testing prompt injection of editorial policies.',
  targetAudience: 'Developers who write tests for their code.',
  corePromise: 'Learn to test effectively.',
  keyPoints: ['Test early', 'Test often', 'Test everything'],
  voiceNotes: 'Practical and direct tone throughout.',
  primaryContentType: 'article',
  secondaryContentTypes: [] as string[],
  secondaryContentStrategy: '',
};

describe('prompt builders inject editorial policy', () => {
  describe('buildContentPlanMessages', () => {
    it('includes editorial policy when publication is provided', () => {
      const messages = buildContentPlanMessages('test idea', {
        intent: 'tutorial',
        primaryContentType: 'article',
        secondaryContentTypes: [],
        publication: testPublication,
      });

      const systemContent = messages[0]!.content as string;
      expect(systemContent).toContain('Publication: "Tech Blog"');
      expect(systemContent).toContain('Tone: authoritative');
      expect(systemContent).toContain('Forbidden topics: competitor names');
      expect(systemContent).toContain('Disclosure requirements: FTC compliance');
      expect(systemContent).toContain('Audience restrictions: no jargon');
      expect(systemContent).toContain('Editorial policy notes: Always cite sources.');
    });

    it('does not include editorial policy when no publication', () => {
      const messages = buildContentPlanMessages('test idea', {
        intent: 'tutorial',
        primaryContentType: 'article',
        secondaryContentTypes: [],
      });

      const systemContent = messages[0]!.content as string;
      expect(systemContent).not.toContain('Publication:');
      expect(systemContent).not.toContain('Tone:');
      expect(systemContent).not.toContain('Forbidden topics:');
    });
  });

  describe('buildPrimaryPlanMessages', () => {
    it('includes editorial policy for long-form content', () => {
      const messages = buildPrimaryPlanMessages('test idea', {
        contentType: 'article',
        intent: 'tutorial',
        contentTypes: ['article'],
        contentPlan: testContentPlan,
        targetLength: 900,
        publication: testPublication,
      });

      const systemContent = messages[0]!.content as string;
      expect(systemContent).toContain('Publication: "Tech Blog"');
      expect(systemContent).toContain('Tone: authoritative');
    });

    it('includes editorial policy for short-form content', () => {
      const messages = buildPrimaryPlanMessages('test idea', {
        contentType: 'x-post',
        intent: 'tutorial',
        contentTypes: ['x-post'],
        contentPlan: testContentPlan,
        targetLength: 280,
        publication: testPublication,
      });

      const systemContent = messages[0]!.content as string;
      expect(systemContent).toContain('Publication: "Tech Blog"');
      expect(systemContent).toContain('Tone: authoritative');
    });

    it('does not include editorial policy when no publication', () => {
      const messages = buildPrimaryPlanMessages('test idea', {
        contentType: 'article',
        intent: 'tutorial',
        contentTypes: ['article'],
        contentPlan: testContentPlan,
        targetLength: 900,
      });

      const systemContent = messages[0]!.content as string;
      expect(systemContent).not.toContain('Publication:');
    });
  });

  describe('buildIntroMessages', () => {
    it('includes editorial policy', () => {
      const messages = buildIntroMessages(
        testPlan,
        'professional',
        'tutorial',
        ['article'],
        900,
        135,
        testPublication,
      );

      const systemContent = messages[0]!.content as string;
      expect(systemContent).toContain('Publication: "Tech Blog"');
      expect(systemContent).toContain('Tone: authoritative');
    });

    it('defaults to null publication', () => {
      const messages = buildIntroMessages(
        testPlan,
        'professional',
        'tutorial',
        ['article'],
        900,
        135,
      );

      const systemContent = messages[0]!.content as string;
      expect(systemContent).not.toContain('Publication:');
    });
  });

  describe('buildSectionMessages', () => {
    it('includes editorial policy', () => {
      const messages = buildSectionMessages(
        testPlan,
        testPlan.sections[0]!,
        '',
        'professional',
        'tutorial',
        ['article'],
        900,
        300,
        testPublication,
      );

      const systemContent = messages[0]!.content as string;
      const userContent = messages[1]!.content as string;
      expect(systemContent).toContain('Publication: "Tech Blog"');
      expect(systemContent).toContain('Forbidden topics: competitor names');
      expect(userContent).toContain('If the section opens with **Key takeaway:**, that labeled line must be at least 40 words');
    });
  });

  describe('buildOutroMessages', () => {
    it('includes editorial policy', () => {
      const messages = buildOutroMessages(
        testPlan,
        'professional',
        'tutorial',
        ['article'],
        900,
        90,
        testPublication,
      );

      const systemContent = messages[0]!.content as string;
      expect(systemContent).toContain('Publication: "Tech Blog"');
      expect(systemContent).toContain('Editorial policy notes: Always cite sources.');
    });
  });

  describe('buildSingleShotContentMessages', () => {
    it('includes editorial policy for primary content', () => {
      const messages = buildSingleShotContentMessages({
        idea: 'test idea',
        contentType: 'x-post',
        role: 'primary',
        primaryContentType: 'article',
        style: 'professional',
        intent: 'tutorial',
        outputIndex: 1,
        outputCountForType: 1,
        contentPlan: testContentPlan,
        targetLength: 280,
        publication: testPublication,
      });

      const systemContent = messages[0]!.content as string;
      expect(systemContent).toContain('Publication: "Tech Blog"');
      expect(systemContent).toContain('Tone: authoritative');
    });

    it('includes editorial policy for secondary content', () => {
      const messages = buildSingleShotContentMessages({
        idea: 'test idea',
        contentType: 'linkedin-post',
        role: 'secondary',
        primaryContentType: 'article',
        style: 'professional',
        intent: 'tutorial',
        outputIndex: 1,
        outputCountForType: 1,
        contentPlan: testContentPlan,
        plan: testPlan,
        targetLength: 500,
        publication: testPublication,
      });

      const systemContent = messages[0]!.content as string;
      expect(systemContent).toContain('Publication: "Tech Blog"');
    });

    it('does not include editorial policy when no publication', () => {
      const messages = buildSingleShotContentMessages({
        idea: 'test idea',
        contentType: 'x-post',
        role: 'primary',
        primaryContentType: 'article',
        style: 'professional',
        intent: 'tutorial',
        outputIndex: 1,
        outputCountForType: 1,
        contentPlan: testContentPlan,
        targetLength: 280,
      });

      const systemContent = messages[0]!.content as string;
      expect(systemContent).not.toContain('Publication:');
    });
  });
});
