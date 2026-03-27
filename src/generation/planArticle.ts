import type { AppSettings } from '../config/schema.js';
import { buildArticlePlanMessages, articlePlanSchema } from '../llm/prompts/articlePlan.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import { resolveUniqueSlug } from '../output/filesystem.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { ArticlePlan } from '../types/article.js';
import { articlePlanSchema as articlePlanResultSchema } from '../types/articleSchema.js';

export async function planArticle({
  idea,
  settings,
  markdownOutputDir,
  openRouter,
  dryRun,
  onLlmMetrics,
}: {
  idea: string;
  settings: AppSettings;
  markdownOutputDir: string;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onLlmMetrics?: (metrics: LlmCallMetrics) => void;
}): Promise<ArticlePlan> {
  const basePlan = dryRun || !openRouter
    ? buildDryRunPlan(idea)
    : await openRouter.requestStructured<ArticlePlan>({
        schemaName: 'article_plan',
        schema: articlePlanSchema,
        messages: buildArticlePlanMessages(idea),
        settings,
        onMetrics: onLlmMetrics,
        parse(data) {
          return articlePlanResultSchema.parse(data);
        },
      });

  const normalizedSlug = slugify(basePlan.slug || basePlan.title);
  const uniqueSlug = await resolveUniqueSlug(markdownOutputDir, normalizedSlug);

  return {
    ...basePlan,
    slug: uniqueSlug,
    keywords: basePlan.keywords.slice(0, 8),
    inlineImages: basePlan.inlineImages
      .filter((image) => image.anchorAfterSection <= basePlan.sections.length)
      .slice(0, 3),
  };
}

function buildDryRunPlan(idea: string): ArticlePlan {
  const title = idea
    .trim()
    .split(/\s+/)
    .slice(0, 7)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title,
    subtitle: 'A practical editorial blueprint for turning a good idea into a strong article',
    keywords: ['writing', 'editorial workflow', 'ai tools', 'content strategy'],
    slug: slugify(title),
    description: `A detailed article exploring ${idea.trim()}.`,
    introBrief: 'Frame the tension between having ideas and actually shaping them into useful published work.',
    outroBrief: 'End by emphasizing disciplined workflows, taste, and iteration.',
    sections: [
      {
        title: 'Why raw ideas are not enough',
        description: 'Explain why strong articles need structure, intent, and editorial judgment.',
      },
      {
        title: 'Designing the article before drafting',
        description: 'Show how planning title, sections, and narrative flow improves the final result.',
      },
      {
        title: 'Using AI as an editorial collaborator',
        description: 'Describe how models can help with planning, drafting, and revision without replacing judgment.',
      },
      {
        title: 'Keeping the prose concrete and useful',
        description: 'Focus on specificity, examples, and clarity over generic abstraction.',
      },
      {
        title: 'Building a repeatable publishing workflow',
        description: 'Summarize how teams can turn this into a repeatable production system.',
      },
    ],
    coverImageDescription: 'A refined editorial workspace with notebooks, sketches, and glowing structured outlines, cinematic but minimal.',
    inlineImages: [
      {
        anchorAfterSection: 1,
        description: 'A rough idea evolving into a structured article outline on a desk full of notes.',
      },
      {
        anchorAfterSection: 3,
        description: 'A collaborative editorial scene where human judgment and AI suggestions coexist.',
      },
    ],
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-article';
}