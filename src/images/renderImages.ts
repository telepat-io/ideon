import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Limn, ModelId } from '@telepat/limn';
import type { AppSettings } from '../config/schema.js';
import { buildImagePromptMessages, imagePromptSchema } from '../llm/prompts/imagePrompt.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import { relativeAssetPath } from '../output/filesystem.js';
import { estimateLlmCostUsd, type LlmCallMetrics } from '../pipeline/analytics.js';
import type { CostSource, LlmInteractionRecord, T2IInteractionRecord } from '../pipeline/events.js';
import type { ArticleImagePrompt, ArticlePlan, GeneratedArticle, GeneratedArticleSection, RenderedArticleImage } from '../types/article.js';
import { imagePromptResultSchema } from '../types/articleSchema.js';

export const MIN_IMAGE_BYTES = 1024;

export interface ImagePromptCallMetrics {
  imageId: string;
  kind: 'cover' | 'inline';
  modelId: string;
  durationMs: number;
  attempts: number;
  retries: number;
  retryBackoffMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  costSource: CostSource;
}

export interface ImageRenderCallMetrics {
  imageId: string;
  kind: 'cover' | 'inline';
  modelId: string;
  durationMs: number;
  attempts: number;
  retries: number;
  retryBackoffMs: number;
  outputBytes: number;
  costUsd: number | null;
  costSource: CostSource;
}

export function buildImageSlots(
  plan: ArticlePlan,
  sections: GeneratedArticleSection[],
  options?: { maxImages?: number },
): ArticleImagePrompt[] {
  const sectionCount = sections.length;

  const slots: ArticleImagePrompt[] = [
    {
      id: 'cover',
      kind: 'cover',
      prompt: '',
      description: plan.coverImageDescription,
      anchorAfterSection: null,
    },
  ];

  let inlineCount = plan.inlineImages.length;
  const maxImages = options?.maxImages;
  if (maxImages !== undefined && maxImages >= 1) {
    inlineCount = Math.min(inlineCount, Math.max(0, maxImages - 1));
  }

  for (let i = 0; i < inlineCount; i++) {
    const img = plan.inlineImages[i];
    if (!img) {
      continue;
    }

    slots.push({
      id: `inline-${i + 1}`,
      kind: 'inline',
      prompt: '',
      description: img.description,
      anchorAfterSection: Math.max(1, Math.min(sectionCount, img.anchorAfterSection)),
    });
  }

  return slots;
}

export async function expandImagePrompts({
  slots,
  planContext,
  sections,
  settings,
  openRouter,
  dryRun,
  onProgress,
  onPromptComplete,
  onInteraction,
}: {
  slots: ArticleImagePrompt[];
  planContext: Pick<ArticlePlan, 'title' | 'subtitle' | 'description'>;
  sections?: GeneratedArticleSection[];
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onProgress?: (detail: string) => void;
  onPromptComplete?: (metrics: ImagePromptCallMetrics) => void;
  onInteraction?: (interaction: LlmInteractionRecord) => void;
}): Promise<ArticleImagePrompt[]> {
  const prompts: ArticleImagePrompt[] = [];

  for (let index = 0; index < slots.length; index += 1) {
    const image = slots[index];
    onProgress?.(`Expanding prompt ${index + 1}/${slots.length}: ${image.kind === 'cover' ? 'cover image' : image.description}`);
    const sectionForImage =
      image.kind === 'inline' && image.anchorAfterSection != null && sections
        ? sections[image.anchorAfterSection - 1]
        : undefined;
    if (dryRun || !openRouter) {
      const dryRunStartMs = Date.now();
      prompts.push({
        ...image,
        prompt: `${image.description}`,
      });
      onPromptComplete?.({
        imageId: image.id,
        kind: image.kind,
        modelId: settings.model,
        durationMs: Date.now() - dryRunStartMs,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        costUsd: 0,
        costSource: 'estimated',
      });
      continue;
    }

    let observedMetrics: LlmCallMetrics | undefined;

    const response = await openRouter.requestStructured<{ prompt: string }>({
      schemaName: 'image_prompt',
      schema: imagePromptSchema,
      messages: buildImagePromptMessages(planContext, image, sectionForImage),
      settings,
      interactionContext: {
        stageId: 'image-prompts',
        operationId: `image-prompts:${image.id}`,
      },
      onInteraction,
      onMetrics(metrics) {
        observedMetrics = observedMetrics ? mergeLlmMetrics(observedMetrics, metrics) : { ...metrics };
      },
      parse(data) {
        return imagePromptResultSchema.parse(data);
      },
    });

    prompts.push({
      ...image,
      prompt: response.prompt,
    });

    const usage = observedMetrics?.usage ?? {
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      providerTotalCostUsd: null,
    };
    const cost = estimateLlmCostUsd(settings.model, usage);
    onPromptComplete?.({
      imageId: image.id,
      kind: image.kind,
      modelId: settings.model,
      durationMs: observedMetrics?.durationMs ?? 0,
      attempts: observedMetrics?.attempts ?? 1,
      retries: observedMetrics?.retries ?? 0,
      retryBackoffMs: observedMetrics?.retryBackoffMs ?? 0,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd: cost.usd,
      costSource: cost.source,
    });
  }

  return prompts;
}

export async function renderExpandedImages({
  prompts,
  settings,
  limn,
  markdownPath,
  assetDir,
  dryRun,
  onProgress,
  onRenderComplete,
  onInteraction,
}: {
  prompts: ArticleImagePrompt[];
  settings: AppSettings;
  limn: Limn | null;
  markdownPath: string;
  assetDir: string;
  dryRun: boolean;
  onProgress?: (detail: string) => void;
  onRenderComplete?: (metrics: ImageRenderCallMetrics) => void;
  onInteraction?: (interaction: T2IInteractionRecord) => void;
}): Promise<RenderedArticleImage[]> {

  const renderedImages: RenderedArticleImage[] = [];
  for (let index = 0; index < prompts.length; index += 1) {
    const prompt = prompts[index];
    onProgress?.(`Rendering image ${index + 1}/${prompts.length} with ${settings.t2i.modelId}`);
    const fileName = `${prompt.kind === 'cover' ? 'cover' : `inline-${prompt.anchorAfterSection}`}-${index + 1}.png`;
    const outputPath = path.join(assetDir, fileName);

    if (dryRun || !limn) {
      const dryRunStartMs = Date.now();
      await writeFile(outputPath, `Placeholder image for: ${prompt.prompt}\n`, 'utf8');
      const outputBytes = Buffer.byteLength(`Placeholder image for: ${prompt.prompt}\n`, 'utf8');
      renderedImages.push({
        ...prompt,
        outputPath,
        relativePath: relativeAssetPath(markdownPath, outputPath),
      });
      onRenderComplete?.({
        imageId: prompt.id,
        kind: prompt.kind,
        modelId: settings.t2i.modelId,
        durationMs: Date.now() - dryRunStartMs,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        outputBytes,
        costUsd: null,
        costSource: 'unavailable',
      });
      onInteraction?.({
        stageId: 'images',
        operationId: `images:${prompt.id}`,
        provider: 'limn-dry-run',
        modelId: settings.t2i.modelId,
        kind: prompt.kind,
        startedAt: new Date(dryRunStartMs).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: Date.now() - dryRunStartMs,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        status: 'succeeded',
        prompt: prompt.prompt,
        input: {},
        errorMessage: null,
      });
      continue;
    }

    const family = settings.t2i.modelId as ModelId;
    const renderStartedAtMs = Date.now();
    try {
      const result = await limn.generate(prompt.prompt, family, {
        replicateModel: settings.t2i.modelId,
        aspectRatio: '16:9',
      });

      const ext = mimeTypeToExtension(result.mimeType);
      const liveFileName = `${prompt.kind === 'cover' ? 'cover' : `inline-${prompt.anchorAfterSection}`}-${index + 1}.${ext}`;
      const liveOutputPath = path.join(assetDir, liveFileName);

      if (result.image.byteLength < MIN_IMAGE_BYTES) {
        throw new Error(
          `Image ${index + 1} download appears corrupted: only ${result.image.byteLength} bytes received.`,
        );
      }
      await writeFile(liveOutputPath, result.image);

      renderedImages.push({
        ...prompt,
        outputPath: liveOutputPath,
        relativePath: relativeAssetPath(markdownPath, liveOutputPath),
      });

      const costSource: CostSource = result.analytics.costSource === 'unknown' ? 'unavailable' : 'estimated';
      onRenderComplete?.({
        imageId: prompt.id,
        kind: prompt.kind,
        modelId: result.modelSlug,
        durationMs: result.analytics.totalDurationMs,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        outputBytes: result.image.byteLength,
        costUsd: result.analytics.totalEstimatedCostUsd,
        costSource,
      });
      onInteraction?.({
        stageId: 'images',
        operationId: `images:${prompt.id}`,
        provider: 'limn',
        modelId: result.modelSlug,
        kind: prompt.kind,
        startedAt: new Date(renderStartedAtMs).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: result.analytics.totalDurationMs,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        status: 'succeeded',
        prompt: prompt.prompt,
        input: {},
        errorMessage: null,
      });
    } catch (error) {
      const durationMs = Date.now() - renderStartedAtMs;
      onInteraction?.({
        stageId: 'images',
        operationId: `images:${prompt.id}`,
        provider: 'limn',
        modelId: settings.t2i.modelId,
        kind: prompt.kind,
        startedAt: new Date(renderStartedAtMs).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        status: 'failed',
        prompt: prompt.prompt,
        input: {},
        errorMessage: error instanceof Error ? error.message : 'Unknown image render error.',
      });
      throw error;
    }
  }

  return renderedImages;
}

export async function buildAndRenderImages({
  plan,
  writtenSections,
  maxImages,
  settings,
  openRouter,
  limn,
  markdownPath,
  assetDir,
  dryRun,
  onProgress,
}: {
  plan: ArticlePlan;
  writtenSections: GeneratedArticleSection[];
  maxImages?: number;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  limn: Limn | null;
  markdownPath: string;
  assetDir: string;
  dryRun: boolean;
  onProgress?: (detail: string) => void;
}): Promise<Pick<GeneratedArticle, 'imagePrompts' | 'renderedImages'>> {
  const slots = buildImageSlots(plan, writtenSections, { maxImages });
  const imagePrompts = await expandImagePrompts({
    slots,
    planContext: plan,
    sections: writtenSections,
    settings,
    openRouter,
    dryRun,
    onProgress,
  });

  const renderedImages = await renderExpandedImages({
    prompts: imagePrompts,
    settings,
    limn,
    markdownPath,
    assetDir,
    dryRun,
    onProgress,
  });

  return {
    imagePrompts,
    renderedImages,
  };
}

function sumNullable(left: number | null, right: number | null): number | null {
  const a = left ?? 0;
  const b = right ?? 0;
  if (left === null && right === null) {
    return null;
  }

  return a + b;
}

function mergeLlmMetrics(left: LlmCallMetrics, right: LlmCallMetrics): LlmCallMetrics {
  const usageTotal = (left.usage.totalTokens ?? 0) + (right.usage.totalTokens ?? 0);
  return {
    ...left,
    durationMs: left.durationMs + right.durationMs,
    attempts: left.attempts + right.attempts,
    retries: left.retries + right.retries,
    retryBackoffMs: left.retryBackoffMs + right.retryBackoffMs,
    usage: {
      promptTokens: sumNullable(left.usage.promptTokens, right.usage.promptTokens),
      completionTokens: sumNullable(left.usage.completionTokens, right.usage.completionTokens),
      totalTokens: usageTotal > 0 ? usageTotal : null,
      providerTotalCostUsd: sumNullable(left.usage.providerTotalCostUsd, right.usage.providerTotalCostUsd),
    },
  };
}

function mimeTypeToExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}