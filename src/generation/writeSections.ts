import type { AppSettings } from '../config/schema.js';
import { buildIntroMessages, buildOutroMessages, buildSectionMessages } from '../llm/prompts/articleSection.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { ArticlePlan, GeneratedArticleSection } from '../types/article.js';

export async function writeArticleSections({
  plan,
  settings,
  openRouter,
  dryRun,
  onSectionStart,
  onLlmMetrics,
}: {
  plan: ArticlePlan;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onSectionStart?: (label: string) => void;
  onLlmMetrics?: (phase: 'intro' | 'section' | 'outro', metrics: LlmCallMetrics, sectionIndex?: number) => void;
}): Promise<{ intro: string; sections: GeneratedArticleSection[]; outro: string }> {
  onSectionStart?.('Writing introduction');
  const intro = dryRun || !openRouter
    ? dryRunIntro(plan)
    : await openRouter.requestText({
        messages: buildIntroMessages(
          plan,
          settings.style,
          settings.contentTargets.map((target) => target.contentType),
          settings.targetLength,
        ),
        settings,
        onMetrics(metrics) {
          onLlmMetrics?.('intro', metrics);
        },
      });

  const sections: GeneratedArticleSection[] = [];
  for (let index = 0; index < plan.sections.length; index += 1) {
    const section = plan.sections[index];
    onSectionStart?.(`Writing section ${index + 1}/${plan.sections.length}: ${section.title}`);
    const body = dryRun || !openRouter
      ? dryRunSection(section, index)
      : await openRouter.requestText({
          messages: buildSectionMessages(
            plan,
            section,
            settings.style,
            settings.contentTargets.map((target) => target.contentType),
            settings.targetLength,
          ),
          settings,
          onMetrics(metrics) {
            onLlmMetrics?.('section', metrics, index);
          },
        });
    sections.push({
      title: section.title,
      body: normalizeGeneratedSection(body, section.title),
    });
  }

  onSectionStart?.('Writing conclusion');
  const outro = dryRun || !openRouter
    ? dryRunOutro(plan)
    : await openRouter.requestText({
        messages: buildOutroMessages(
          plan,
          settings.style,
          settings.contentTargets.map((target) => target.contentType),
          settings.targetLength,
        ),
        settings,
        onMetrics(metrics) {
          onLlmMetrics?.('outro', metrics);
        },
      });

  return {
    intro: normalizeGeneratedSection(intro, 'introduction'),
    sections,
    outro: normalizeGeneratedSection(outro, 'conclusion'),
  };
}

function dryRunIntro(plan: ArticlePlan): string {
  return [
    `${plan.title} is the kind of topic that sounds simple until you try to turn it into something worth publishing.`,
    `The real work starts when an idea has to become structure, argument, and momentum. ${plan.introBrief}`,
  ].join('\n\n');
}

function dryRunSection(section: ArticleSectionPlanLike, index: number): string {
  return [
    `Section ${index + 1} should make a concrete argument: ${section.description}`,
    `Instead of speaking in abstractions, it should show what changes in practice when a team treats writing like a deliberate production process rather than a burst of inspiration.`,
  ].join('\n\n');
}

function dryRunOutro(plan: ArticlePlan): string {
  return [
    `Strong articles rarely emerge from a single pass. ${plan.outroBrief}`,
    'What matters is a workflow that can repeatedly transform a promising idea into a piece that is clear, useful, and worth reading.',
  ].join('\n\n');
}

interface ArticleSectionPlanLike {
  title: string;
  description: string;
}

function normalizeGeneratedSection(content: string, label: string): string {
  const normalized = content.trim();
  if (!normalized) {
    throw new Error(`The model returned an empty ${label} draft.`);
  }

  return normalized.replace(/^```(?:markdown)?\s*/i, '').replace(/```\s*$/i, '').trim();
}