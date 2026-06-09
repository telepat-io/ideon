import type { AppSettings } from '../config/schema.js';
import { resolveFaqSectionEnabled } from '../config/faqSection.js';
import type { Author } from '../types/author.js';
import type { Publication } from '../types/publication.js';
import type { Series } from '../types/series.js';
import { buildAuthorRunContext } from '../llm/prompts/authorPolicy.js';
import { buildFaqMessages, buildIntroMessages, buildOutroMessages, buildSectionMessages } from '../llm/prompts/articleSection.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';
import type { LlmInteractionRecord } from '../pipeline/events.js';
import type { ArticlePlan, GeneratedArticleSection } from '../types/article.js';

export type SectionWritePhase = 'intro' | 'section' | 'outro' | 'faq';

export async function writeArticleSections({
  plan,
  settings,
  publication,
  series,
  author,
  experienceNotes,
  openRouter,
  dryRun,
  existingFaq,
  onSectionStart,
  onLlmMetrics,
  onInteraction,
}: {
  plan: ArticlePlan;
  settings: AppSettings;
  publication?: Publication | null;
  series?: Series | null;
  author?: Author | null;
  experienceNotes?: string;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  existingFaq?: string;
  onSectionStart?: (label: string) => void;
  onLlmMetrics?: (phase: SectionWritePhase, metrics: LlmCallMetrics, sectionIndex?: number) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<{ intro: string; sections: GeneratedArticleSection[]; outro: string; faq?: string }> {
  const wordBudgets = allocateWordBudgets(settings.targetLength, plan.sections.length);
  const authorContext = buildAuthorRunContext(author ?? null, experienceNotes);
  const contentTypes = settings.contentTargets.map((target) => target.contentType);
  const faqEnabled = resolveFaqSectionEnabled(settings);

  onSectionStart?.('Writing introduction');
  const intro = dryRun || !openRouter
    ? dryRunIntro(plan)
    : await openRouter.requestText({
        messages: buildIntroMessages(
          plan,
          settings.style,
          settings.intent,
          contentTypes,
          settings.targetLength,
          wordBudgets.intro,
          publication ?? null,
          series ?? null,
          authorContext,
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
            contentTypes,
            settings.targetLength,
            wordBudgets.sections[index] ?? wordBudgets.sections[wordBudgets.sections.length - 1] ?? 150,
            publication ?? null,
            series ?? null,
            authorContext,
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
          contentTypes,
          settings.targetLength,
          wordBudgets.outro,
          publication ?? null,
          series ?? null,
          authorContext,
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

  const normalizedOutro = normalizeGeneratedSection(outro, 'conclusion');
  let faq: string | undefined = existingFaq?.trim() || undefined;

  if (faqEnabled && !faq) {
    faq = await writeFaqSection({
      plan,
      articleDraft: buildArticleSoFarContext(intro, sections, normalizedOutro),
      settings,
      contentTypes,
      publication: publication ?? null,
      series: series ?? null,
      authorContext,
      openRouter,
      dryRun,
      onSectionStart,
      onLlmMetrics,
      onInteraction,
    });
  }

  return {
    intro: normalizeGeneratedSection(intro, 'introduction'),
    sections,
    outro: normalizedOutro,
    ...(faq ? { faq } : {}),
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

async function writeFaqSection({
  plan,
  articleDraft,
  settings,
  contentTypes,
  publication,
  series,
  authorContext,
  openRouter,
  dryRun,
  onSectionStart,
  onLlmMetrics,
  onInteraction,
}: {
  plan: ArticlePlan;
  articleDraft: string;
  settings: AppSettings;
  contentTypes: string[];
  publication: Publication | null;
  series: Series | null;
  authorContext: ReturnType<typeof buildAuthorRunContext>;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onSectionStart?: (label: string) => void;
  onLlmMetrics?: (phase: SectionWritePhase, metrics: LlmCallMetrics, sectionIndex?: number) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<string> {
  onSectionStart?.('Writing FAQ');

  if (dryRun || !openRouter) {
    const faqBody = dryRunFaq(plan);
    const metrics = buildDryRunLlmMetrics(settings.model);
    onLlmMetrics?.('faq', metrics);
    emitDryRunFaqInteraction(onInteraction, plan, faqBody);
    return normalizeGeneratedFaq(faqBody);
  }

  const faqBody = await openRouter.requestText({
    messages: buildFaqMessages(
      plan,
      articleDraft,
      settings.style,
      settings.intent,
      contentTypes,
      settings.targetLength,
      publication,
      series,
      authorContext,
    ),
    settings,
    interactionContext: {
      stageId: 'sections',
      operationId: 'sections:faq',
    },
    onInteraction,
    onMetrics(metrics) {
      onLlmMetrics?.('faq', metrics);
    },
  });

  return normalizeGeneratedFaq(faqBody);
}

function buildDryRunLlmMetrics(modelId: string): LlmCallMetrics {
  return {
    durationMs: 0,
    attempts: 1,
    retries: 0,
    retryBackoffMs: 0,
    modelId,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      providerTotalCostUsd: null,
    },
  };
}

function emitDryRunFaqInteraction(
  onInteraction: ((interaction: LlmInteractionRecord) => void) | undefined,
  plan: ArticlePlan,
  responseBody: string,
): void {
  if (!onInteraction) {
    return;
  }

  const timestamp = new Date().toISOString();
  onInteraction({
    stageId: 'sections',
    operationId: 'sections:faq',
    requestType: 'text',
    provider: 'openrouter',
    modelId: 'dry-run',
    startedAt: timestamp,
    endedAt: timestamp,
    durationMs: 0,
    attempts: 1,
    retries: 0,
    retryBackoffMs: 0,
    status: 'succeeded',
    requestBody: JSON.stringify({ dryRun: true, title: plan.title, operation: 'sections:faq' }),
    responseBody,
    errorMessage: null,
  });
}

function dryRunFaq(plan: ArticlePlan): string {
  const firstSection = plan.sections[0];
  const secondSection = plan.sections[1];
  const lines = [
    '### What is the main takeaway from this article?',
    `${plan.title} rewards a deliberate drafting workflow that turns a promising idea into structured, evidence-backed prose.`,
  ];

  if (firstSection) {
    lines.push(
      '',
      `### ${firstSection.title}`,
      firstSection.description,
    );
  }

  if (secondSection) {
    lines.push(
      '',
      `### ${secondSection.title}`,
      secondSection.description,
    );
  }

  return lines.join('\n');
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

function buildArticleSoFarContext(
  intro: string,
  sections: GeneratedArticleSection[],
  outro?: string,
): string {
  const parts = ['## Introduction', intro.trim()];

  for (const section of sections) {
    parts.push(`## ${section.title}`);
    parts.push(section.body.trim());
  }

  if (outro?.trim()) {
    parts.push('## Conclusion');
    parts.push(outro.trim());
  }

  return parts.join('\n\n').trim();
}

function normalizeWhitespaceForHeadingMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function stripMatchingLeadingHeading(content: string, label: string): string {
  const headingMatch = content.match(/^#{1,6}\s+(.+?)(?:\r?\n|$)/);
  if (!headingMatch) {
    return content;
  }

  const headingText = normalizeWhitespaceForHeadingMatch(headingMatch[1] ?? '');
  const expectedLabel = normalizeWhitespaceForHeadingMatch(label);

  if (headingText !== expectedLabel) {
    return content;
  }

  return content.slice(headingMatch[0].length).trimStart();
}

function normalizeGeneratedSection(content: string, label: string): string {
  const normalized = content.trim();
  if (!normalized) {
    throw new Error(`The model returned an empty ${label} draft.`);
  }

  const withoutFences = normalized
    .replace(/^```(?:markdown)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return stripMatchingLeadingHeading(withoutFences, label).trim();
}

function normalizeGeneratedFaq(content: string): string {
  const normalized = content.trim();
  if (!normalized) {
    throw new Error('The model returned an empty FAQ draft.');
  }

  const withoutFences = normalized
    .replace(/^```(?:markdown)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return stripMatchingLeadingHeading(withoutFences, 'faq').trim();
}
