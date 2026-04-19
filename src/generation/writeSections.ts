import type { AppSettings } from '../config/schema.js';
import { buildIntroMessages, buildOutroMessages, buildSectionMessages } from '../llm/prompts/articleSection.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { LlmInteractionRecord } from '../pipeline/events.js';
import type { ArticlePlan, GeneratedArticleSection } from '../types/article.js';

export async function writeArticleSections({
  plan,
  settings,
  openRouter,
  dryRun,
  onSectionStart,
  onLlmMetrics,
  onInteraction,
}: {
  plan: ArticlePlan;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onSectionStart?: (label: string) => void;
  onLlmMetrics?: (phase: 'intro' | 'section' | 'outro', metrics: LlmCallMetrics, sectionIndex?: number) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<{ intro: string; sections: GeneratedArticleSection[]; outro: string }> {
  const wordBudgets = allocateWordBudgets(settings.targetLength, plan.sections.length);

  onSectionStart?.('Writing introduction');
  const intro = dryRun || !openRouter
    ? dryRunIntro(plan)
    : await openRouter.requestText({
        messages: buildIntroMessages(
          plan,
          settings.style,
          settings.intent,
          settings.contentTargets.map((target) => target.contentType),
          settings.targetLength,
          wordBudgets.intro,
        ),
        settings,
        interactionContext: {
          stageId: 'sections',
          operationId: 'sections:intro',
        },
        onInteraction,
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
            buildArticleSoFarContext(intro, sections),
            settings.style,
            settings.intent,
            settings.contentTargets.map((target) => target.contentType),
            settings.targetLength,
            wordBudgets.sections[index] ?? wordBudgets.sections[wordBudgets.sections.length - 1] ?? 150,
          ),
          settings,
          interactionContext: {
            stageId: 'sections',
            operationId: `sections:section-${index + 1}`,
          },
          onInteraction,
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
          settings.intent,
          settings.contentTargets.map((target) => target.contentType),
          settings.targetLength,
          wordBudgets.outro,
        ),
        settings,
        interactionContext: {
          stageId: 'sections',
          operationId: 'sections:outro',
        },
        onInteraction,
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

function allocateWordBudgets(totalTargetWords: number, sectionCount: number): { intro: number; sections: number[]; outro: number } {
  const normalizedTotal = Number.isFinite(totalTargetWords) && totalTargetWords > 0 ? Math.round(totalTargetWords) : 900;
  const normalizedSectionCount = Math.max(1, sectionCount);
  const intro = Math.max(80, Math.round(normalizedTotal * 0.15));
  const outro = Math.max(80, Math.round(normalizedTotal * 0.1));
  const remainingForSections = Math.max(normalizedSectionCount * 120, normalizedTotal - intro - outro);
  const baseSectionWords = Math.floor(remainingForSections / normalizedSectionCount);
  let remainder = remainingForSections - (baseSectionWords * normalizedSectionCount);

  const sections = Array.from({ length: normalizedSectionCount }, () => {
    const next = baseSectionWords + (remainder > 0 ? 1 : 0);
    if (remainder > 0) {
      remainder -= 1;
    }
    return Math.max(120, next);
  });

  return { intro, sections, outro };
}

function buildArticleSoFarContext(intro: string, sections: GeneratedArticleSection[]): string {
  const parts = ['## Introduction', intro.trim()];

  for (const section of sections) {
    parts.push(`## ${section.title}`);
    parts.push(section.body.trim());
  }

  return parts.join('\n\n').trim();
}

function normalizeGeneratedSection(content: string, label: string): string {
  const normalized = content.trim();
  if (!normalized) {
    throw new Error(`The model returned an empty ${label} draft.`);
  }

  return normalized.replace(/^```(?:markdown)?\s*/i, '').replace(/```\s*$/i, '').trim();
}