import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const guideCache = new Map<string, string>();

function normalizeGuideContent(content: string): string {
  return content.replace(/\r\n/g, '\n').trim();
}

function readGuideFile(relativePath: string): string {
  const cached = guideCache.get(relativePath);
  if (cached) {
    return cached;
  }

  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) {
    const fallback = `Guide unavailable: ${relativePath}. Continue with the remaining guidance.`;
    guideCache.set(relativePath, fallback);
    return fallback;
  }

  try {
    const content = normalizeGuideContent(readFileSync(absolutePath, 'utf8'));
    guideCache.set(relativePath, content);
    return content;
  } catch {
    const fallback = `Guide failed to load: ${relativePath}. Continue with the remaining guidance.`;
    guideCache.set(relativePath, fallback);
    return fallback;
  }
}

function buildGuideSection(relativePath: string): string {
  const content = readGuideFile(relativePath);
  return [
    `Guide source: ${relativePath}`,
    content,
  ].join('\n');
}

function formatToGuidePath(contentType: string): string {
  return `writing-guide/formats/${contentType}.md`;
}

function intentToGuidePath(intent: string): string {
  return `writing-guide/content-intent/${intent}.md`;
}

function styleToGuidePath(style: string): string {
  return `writing-guide/styles/${style}.md`;
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function buildGuideBundle(relativePaths: string[]): string {
  const blocks = dedupe(relativePaths).map((relativePath) => buildGuideSection(relativePath));
  return [
    'External writing guides (apply these rules directly):',
    ...blocks,
  ].join('\n\n');
}

export function buildArticlePlanGuideInstruction(intent: string, contentType: string): string {
  return buildGuideBundle([
    'writing-guide/references/headline-writing-systems.md',
    'writing-guide/references/ideation-and-credibility-systems.md',
    'writing-guide/references/content-frameworks.md',
    intentToGuidePath(intent),
    formatToGuidePath(contentType),
  ]);
}

export function buildArticleSectionGuideInstruction(style: string, intent: string, contentType: string): string {
  return buildGuideBundle([
    'writing-guide/general/core-web-writing-rules.md',
    'writing-guide/references/emotional-resonance.md',
    'writing-guide/references/prose-quality-checks.md',
    'writing-guide/references/readability-and-pace.md',
    'writing-guide/references/skimmability-patterns.md',
    styleToGuidePath(style),
    intentToGuidePath(intent),
    formatToGuidePath(contentType),
  ]);
}

export function buildContentBriefGuideInstruction(
  intent: string,
  primaryContentType: string,
  secondaryContentTypes: string[],
): string {
  return buildGuideBundle([
    'writing-guide/references/multi-channel-brief-strategy.md',
    'writing-guide/references/content-frameworks.md',
    'writing-guide/references/target-length-guidance.md',
    intentToGuidePath(intent),
    formatToGuidePath(primaryContentType),
    ...secondaryContentTypes.map((contentType) => formatToGuidePath(contentType)),
  ]);
}

export function buildChannelContentGuideInstruction(style: string, intent: string, contentType: string): string {
  const conditionalGuides = contentType === 'x-thread'
    ? ['writing-guide/references/x-thread-hooks.md']
    : [];

  return buildGuideBundle([
    'writing-guide/references/truthful-value-framing.md',
    'writing-guide/references/target-length-guidance.md',
    ...conditionalGuides,
    styleToGuidePath(style),
    intentToGuidePath(intent),
    formatToGuidePath(contentType),
  ]);
}
