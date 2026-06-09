import {
  computeSeoPassed,
  countSeoErrors,
  countSeoWarnings,
  lintArticleSeo,
  measureSectionOpener,
} from '../seo/lint.js';
import type { ArticlePlan } from '../types/article.js';

function mockPlan(overrides: Partial<ArticlePlan> = {}): ArticlePlan {
  return {
    contentType: 'article',
    title: 'Container Orchestration Guide',
    subtitle: 'A practical overview',
    primaryKeyword: 'container orchestration',
    keywords: ['container orchestration', 'kubernetes', 'pod scheduling'],
    slug: 'container-orchestration-guide',
    description: 'Learn how container orchestration reduces deployment failures with practical patterns for Kubernetes teams and platform engineers building reliable systems.',
    introBrief: 'Intro',
    outroBrief: 'Outro',
    coverImageDescription: 'Cover',
    sections: [
      {
        title: 'Why container orchestration matters',
        description: 'Context',
        targetKeywords: ['kubernetes'],
      },
      {
        title: 'Pod scheduling in practice',
        description: 'Mechanics',
        targetKeywords: ['pod scheduling'],
      },
    ],
    inlineImages: [],
    ...overrides,
  };
}

describe('lintArticleSeo', () => {
  it('passes when primary keyword is in title and intro', () => {
    const plan = mockPlan();
    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Container orchestration is the automated management of workloads across clusters because manual deploys do not scale.',
        sections: [
          {
            title: plan.sections[0]!.title,
            body: 'Kubernetes adoption grew 37% in 2024 according to industry surveys.\n\nTeams report faster rollouts.',
          },
          {
            title: plan.sections[1]!.title,
            body: 'Pod scheduling assigns workloads to nodes based on constraints and observed capacity signals.\n\nOperators tune affinity rules carefully.',
          },
        ],
        outro: 'Container orchestration remains foundational for modern platforms.',
      },
    });

    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
  });

  it('flags missing primary keyword in intro', () => {
    const plan = mockPlan();
    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Modern platforms need reliable deploy patterns without naming the core topic.',
        sections: [
          { title: plan.sections[0]!.title, body: 'Kubernetes clusters need 40+ words in the opener because operators must understand baseline scheduling constraints and failure domains before tuning workloads.' },
          { title: plan.sections[1]!.title, body: 'Pod scheduling uses 42% fewer incidents when constraints are explicit according to one 2024 benchmark report.' },
        ],
        outro: 'Wrap up.',
      },
    });

    expect(result.issues.some((issue) => issue.id === 'primary-in-intro')).toBe(true);
  });

  it('skips primary keyword checks when primaryKeyword is missing', () => {
    const plan = mockPlan({ primaryKeyword: '' });
    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Intro without explicit primary keyword mention.',
        sections: [
          { title: plan.sections[0]!.title, body: 'Kubernetes clusters need 40+ words in the opener because operators must understand baseline scheduling constraints and failure domains before tuning workloads for reliability.' },
          { title: plan.sections[1]!.title, body: 'Pod scheduling uses 42% fewer incidents when constraints are explicit according to one 2024 benchmark report and operator interviews.' },
        ],
        outro: 'Wrap up.',
      },
    });

    expect(result.issues.some((issue) => issue.id === 'primary-in-title')).toBe(false);
    expect(result.issues.some((issue) => issue.id === 'primary-in-intro')).toBe(false);
  });

  it('flags title and description length issues', () => {
    const plan = mockPlan({
      title: 'This title is intentionally longer than sixty characters for SEO lint testing',
      description: 'Too short.',
    });
    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Container orchestration intro with enough words.',
        sections: [],
        outro: 'Outro.',
      },
    });

    expect(result.issues.some((issue) => issue.id === 'title-length')).toBe(true);
    expect(result.issues.some((issue) => issue.id === 'description-length')).toBe(true);
  });

  it('passes errors-only mode when only warnings remain', () => {
    const plan = mockPlan({
      title: 'Container orchestration patterns for reliable platform teams operating at global scale',
    });
    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Container orchestration intro with enough words and the primary keyword container orchestration mentioned early.',
        sections: [
          {
            title: plan.sections[0]!.title,
            body: 'Kubernetes adoption grew 37% in 2024 according to industry surveys.\n\nTeams report faster rollouts.',
          },
          {
            title: plan.sections[1]!.title,
            body: 'Pod scheduling assigns workloads to nodes based on constraints and observed capacity signals.\n\nOperators tune affinity rules carefully.',
          },
        ],
        outro: 'Container orchestration remains foundational for modern platforms.',
      },
      mode: 'errors-only',
    });

    expect(countSeoErrors(result.issues)).toBe(0);
    expect(countSeoWarnings(result.issues)).toBeGreaterThan(0);
    expect(result.passed).toBe(true);
    expect(computeSeoPassed(result.issues, 'strict')).toBe(false);
  });

  it('requires zero issues in strict mode', () => {
    const plan = mockPlan({
      title: 'Container orchestration patterns for reliable platform teams operating at global scale',
    });
    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Container orchestration intro with enough words and the primary keyword container orchestration mentioned early.',
        sections: [],
        outro: 'Outro.',
      },
      mode: 'strict',
    });

    expect(result.passed).toBe(false);
    expect(computeSeoPassed(result.issues, 'errors-only')).toBe(true);
  });

  it('flags bluf-length for a short key takeaway even when a long body follows', () => {
    const plan = mockPlan({ primaryKeyword: '' });
    const longBody = 'This follow-on paragraph has plenty of words because operators need concrete scheduling constraints failure domains capacity signals affinity rules and rollout practices before they tune workloads for reliability in production environments according to recent surveys.';

    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Intro.',
        sections: [
          {
            title: plan.sections[0]!.title,
            body: `**Key takeaway:** Short summary line.\n\n${longBody}`,
          },
        ],
        outro: 'Outro.',
      },
    });

    expect(result.issues.some((issue) => issue.id === 'bluf-length-0')).toBe(true);
  });

  it('flags bluf-length for a short key takeaway block when it is the only opener content', () => {
    const plan = mockPlan({ primaryKeyword: '' });
    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Intro.',
        sections: [{ title: plan.sections[0]!.title, body: '**Key takeaway:** Too short.' }],
        outro: 'Outro.',
      },
    });

    expect(result.issues.some((issue) => issue.id === 'bluf-length-0')).toBe(true);
    expect(measureSectionOpener('**Key takeaway:** Too short.').kind).toBe('key_takeaway');
  });

  it('does not flag bluf-length for a long key takeaway block', () => {
    const plan = mockPlan({ primaryKeyword: '' });
    const takeaway = '**Key takeaway:** Container orchestration reduces deployment failures by 60% and cuts infrastructure costs by 30% when you standardize on a single control plane because automated scheduling networking and self-healing replace manual deploy scripts across clusters. The trade-off is upfront configuration complexity.';
    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Intro.',
        sections: [{ title: plan.sections[0]!.title, body: `${takeaway}\n\nSupporting detail follows.` }],
        outro: 'Outro.',
      },
    });

    expect(measureSectionOpener(takeaway).wordCount).toBeGreaterThanOrEqual(40);
    expect(result.issues.some((issue) => issue.id === 'bluf-length-0')).toBe(false);
  });

  it('flags bluf-length for a short plain first paragraph', () => {
    const plan = mockPlan({ primaryKeyword: '' });
    const result = lintArticleSeo({
      plan,
      text: {
        intro: 'Intro.',
        sections: [{ title: plan.sections[0]!.title, body: 'Too short without a key takeaway label.' }],
        outro: 'Outro.',
      },
    });

    expect(measureSectionOpener('Too short without a key takeaway label.').kind).toBe('paragraph');
    expect(result.issues.some((issue) => issue.id === 'bluf-length-0')).toBe(true);
  });
});
