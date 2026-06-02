import type { AppSettings } from '../config/schema.js';
import type { Publication } from '../types/publication.js';
import { buildPrimaryPlanMessages, buildPrimaryPlanJsonSchema } from '../llm/prompts/primaryPlan.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import { resolveUniqueSlug } from '../output/filesystem.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { LlmInteractionRecord } from '../pipeline/events.js';
import type { ArticlePlan, PrimaryPlan } from '../types/article.js';
import { isLongFormContentType } from '../types/article.js';
import type { ContentPlan } from '../types/contentPlan.js';
import { primaryPlanSchema, longFormPlanSchema, shortFormPlanSchema } from '../types/articleSchema.js';

export async function planPrimaryContent({
  idea,
  contentType,
  contentPlan,
  settings,
  publication,
  markdownOutputDir,
  openRouter,
  dryRun,
  onLlmMetrics,
  onInteraction,
}: {
  idea: string;
  contentType: string;
  contentPlan: ContentPlan;
  settings: AppSettings;
  publication?: Publication | null;
  markdownOutputDir: string;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onLlmMetrics?: (metrics: LlmCallMetrics) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<PrimaryPlan> {
  const isLongForm = isLongFormContentType(contentType);

  const basePlan = dryRun || !openRouter
    ? buildDryRunPlan(idea, contentType, contentPlan)
    : await openRouter.requestStructured<PrimaryPlan>({
        schemaName: 'primary_plan',
        schema: buildPrimaryPlanJsonSchema(contentType, settings.targetLength),
        messages: buildPrimaryPlanMessages(idea, {
          contentType,
          intent: settings.intent,
          contentTypes: settings.contentTargets.map((target) => target.contentType),
          contentPlan,
          targetLength: settings.targetLength,
          publication,
        }),
        settings,
        interactionContext: {
          stageId: 'planning',
          operationId: `planning:${contentType}-plan`,
        },
        onInteraction,
        onMetrics: onLlmMetrics,
        parse(data) {
          if (isLongForm) {
            return longFormPlanSchema.parse(data);
          }
          return shortFormPlanSchema.parse(data);
        },
      });

  if (!dryRun) {
    const seoWarnings: string[] = [];

    if (basePlan.title && basePlan.title.length > 60) {
      seoWarnings.push(`Title is ${basePlan.title.length} chars (recommended: under 60 for search display safety)`);
    }

    if (basePlan.description) {
      if (basePlan.description.length < 120) {
        seoWarnings.push(`Description is ${basePlan.description.length} chars (recommended: 120-160 for meta description effectiveness)`);
      } else if (basePlan.description.length > 160) {
        seoWarnings.push(`Description is ${basePlan.description.length} chars (recommended: 120-160 for meta description effectiveness)`);
      }
    }

    if (isLongForm) {
      const longPlan = basePlan as ArticlePlan;
      const headings = longPlan.sections.map((s) => s.title.toLowerCase());
      const duplicateKeywords = longPlan.keywords.filter((kw) => headings.includes(kw.toLowerCase()));
      if (duplicateKeywords.length > 0) {
        seoWarnings.push(`Keywords duplicate heading text: ${duplicateKeywords.join(', ')} (consider using semantic variants)`);
      }
    }

    for (const warning of seoWarnings) {
      console.warn(`[seo] ${warning}`);
    }
  }

  const normalizedSlug = slugify(basePlan.slug || basePlan.title);
  const uniqueSlug = await resolveUniqueSlug(markdownOutputDir, normalizedSlug);

  if (isLongForm) {
    const longPlan = basePlan as ArticlePlan;
    const sectionCount = longPlan.sections.length;

    return {
      ...longPlan,
      slug: uniqueSlug,
      keywords: longPlan.keywords.slice(0, 8),
      inlineImages: longPlan.inlineImages
        .slice(0, 3)
        .map((img) => ({
          ...img,
          anchorAfterSection: Math.max(1, Math.min(sectionCount, img.anchorAfterSection)),
        })),
    };
  }

  return {
    ...basePlan,
    slug: uniqueSlug,
  };
}

function buildDryRunPlan(idea: string, contentType: string, contentPlan: ContentPlan): PrimaryPlan {
  const title = idea
    .trim()
    .split(/\s+/)
    .slice(0, 7)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || contentPlan.title;

  if (!isLongFormContentType(contentType)) {
    return {
      contentType,
      title,
      slug: slugify(title),
      description: contentPlan.description,
      coverImageDescription: `A visually striking cover image for a ${contentType} about ${idea.trim().split(/\s+/).slice(0, 5).join(' ')}.`,
      angle: `Direct, practical framing that hooks the audience immediately with a clear value proposition tied to ${contentPlan.corePromise}`,
    };
  }

  return {
    contentType,
    title,
    subtitle: 'A practical editorial blueprint for turning a good idea into strong published content',
    keywords: ['writing', 'editorial workflow', 'ai tools', 'content strategy'],
    slug: slugify(title),
    description: contentPlan.description,
    introBrief: 'Frame the tension between having ideas and actually shaping them into useful published work.',
    outroBrief: 'End by emphasizing disciplined workflows, taste, and iteration.',
    sections: [
      {
        title: 'Why raw ideas are not enough',
        description: 'Explain why strong content needs structure, intent, and editorial judgment.',
      },
      {
        title: 'Designing the content before drafting',
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
        description: 'A rough idea evolving into a structured content outline on a desk full of notes.',
        anchorAfterSection: 2,
      },
      {
        description: 'A collaborative editorial scene where human judgment and AI suggestions coexist.',
        anchorAfterSection: 4,
      },
    ],
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-content';
}
