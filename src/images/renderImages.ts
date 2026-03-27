import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppSettings } from '../config/schema.js';
import { buildImagePromptMessages, imagePromptSchema } from '../llm/prompts/imagePrompt.js';
import type { OpenRouterClient } from '../llm/openRouterClient.js';
import { coerceT2IFieldValue, getT2IFieldDefault, sanitizeT2IOverrides } from '../models/t2i/options.js';
import { relativeAssetPath } from '../output/filesystem.js';
import { getT2IModel } from '../models/t2i/registry.js';
import type { ArticleImagePrompt, ArticlePlan, GeneratedArticle, RenderedArticleImage } from '../types/article.js';
import { imagePromptResultSchema } from '../types/articleSchema.js';
import type { ReplicateClient } from './replicateClient.js';

export async function expandImagePrompts({
  plan,
  settings,
  openRouter,
  dryRun,
  onProgress,
}: {
  plan: ArticlePlan;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  dryRun: boolean;
  onProgress?: (detail: string) => void;
}): Promise<ArticleImagePrompt[]> {
  const imageSlots = buildImageSlots(plan);
  const prompts: ArticleImagePrompt[] = [];

  for (let index = 0; index < imageSlots.length; index += 1) {
    const image = imageSlots[index];
    onProgress?.(`Expanding prompt ${index + 1}/${imageSlots.length}: ${image.kind === 'cover' ? 'cover image' : image.description}`);
    if (dryRun || !openRouter) {
      prompts.push({
        ...image,
        prompt: `${image.description}, editorial illustration, detailed lighting, modern magazine art direction`,
      });
      continue;
    }

    const response = await openRouter.requestStructured<{ prompt: string }>({
      schemaName: 'image_prompt',
      schema: imagePromptSchema,
      messages: buildImagePromptMessages(plan, image),
      settings,
      parse(data) {
        return imagePromptResultSchema.parse(data);
      },
    });

    prompts.push({
      ...image,
      prompt: response.prompt,
    });
  }

  return prompts;
}

export async function renderExpandedImages({
  prompts,
  settings,
  replicate,
  markdownPath,
  assetDir,
  dryRun,
  onProgress,
}: {
  prompts: ArticleImagePrompt[];
  settings: AppSettings;
  replicate: ReplicateClient | null;
  markdownPath: string;
  assetDir: string;
  dryRun: boolean;
  onProgress?: (detail: string) => void;
}): Promise<RenderedArticleImage[]> {

  const renderedImages: RenderedArticleImage[] = [];
  for (let index = 0; index < prompts.length; index += 1) {
    const prompt = prompts[index];
    onProgress?.(`Rendering image ${index + 1}/${prompts.length} with ${settings.t2i.modelId}`);
    const fileName = `${prompt.kind === 'cover' ? 'cover' : `inline-${prompt.anchorAfterSection}`}-${index + 1}.${resolveOutputFormat(settings)}`;
    const outputPath = path.join(assetDir, fileName);

    if (dryRun || !replicate) {
      await writeFile(outputPath, `Placeholder image for: ${prompt.prompt}\n`, 'utf8');
      renderedImages.push({
        ...prompt,
        outputPath,
        relativePath: relativeAssetPath(markdownPath, outputPath),
      });
      continue;
    }

    const input = createReplicateInput(settings, prompt.prompt, prompt.kind);
    const output = await replicate.runModel(settings.t2i.modelId, input);
    const bytes = await normalizeReplicateOutput(output);
    await writeFile(outputPath, bytes);

    renderedImages.push({
      ...prompt,
      outputPath,
      relativePath: relativeAssetPath(markdownPath, outputPath),
    });
  }

  return renderedImages;
}

export async function buildAndRenderImages({
  plan,
  settings,
  openRouter,
  replicate,
  markdownPath,
  assetDir,
  dryRun,
  onProgress,
}: {
  plan: ArticlePlan;
  settings: AppSettings;
  openRouter: OpenRouterClient | null;
  replicate: ReplicateClient | null;
  markdownPath: string;
  assetDir: string;
  dryRun: boolean;
  onProgress?: (detail: string) => void;
}): Promise<Pick<GeneratedArticle, 'imagePrompts' | 'renderedImages'>> {
  const imagePrompts = await expandImagePrompts({
    plan,
    settings,
    openRouter,
    dryRun,
    onProgress,
  });

  const renderedImages = await renderExpandedImages({
    prompts: imagePrompts,
    settings,
    replicate,
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

function buildImageSlots(plan: ArticlePlan): ArticleImagePrompt[] {
  return [
    {
      id: 'cover',
      kind: 'cover',
      prompt: '',
      description: plan.coverImageDescription,
      anchorAfterSection: null,
    },
    ...plan.inlineImages.map((image, index) => ({
      id: `inline-${index + 1}`,
      kind: 'inline' as const,
      prompt: '',
      description: image.description,
      anchorAfterSection: image.anchorAfterSection,
    })),
  ];
}

function createReplicateInput(settings: AppSettings, prompt: string, kind: 'cover' | 'inline'): Record<string, unknown> {
  const model = getT2IModel(settings.t2i.modelId);
  const overrides = sanitizeT2IOverrides(settings.t2i.modelId, settings.t2i.inputOverrides);
  const input: Record<string, unknown> = { ...overrides, prompt };

  if (model.inputOptions.pipelineManaged.includes('aspect_ratio')) {
    input.aspect_ratio = kind === 'cover' ? '16:9' : '16:9';
  }

  if (model.inputOptions.pipelineManaged.includes('width')) {
    input.width = 1536;
  }

  if (model.inputOptions.pipelineManaged.includes('height')) {
    input.height = 864;
  }

  if (!('output_format' in input)) {
    const fallback = getT2IFieldDefault(settings.t2i.modelId, 'output_format');
    if (typeof fallback === 'string') {
      input.output_format = fallback;
    }
  }

  if (!('num_outputs' in input) && 'num_outputs' in model.inputOptions.fields) {
    input.num_outputs = coerceT2IFieldValue(settings.t2i.modelId, 'num_outputs', getT2IFieldDefault(settings.t2i.modelId, 'num_outputs')) ?? 1;
  }

  if (!('max_images' in input) && 'max_images' in model.inputOptions.fields) {
    input.max_images = coerceT2IFieldValue(settings.t2i.modelId, 'max_images', getT2IFieldDefault(settings.t2i.modelId, 'max_images')) ?? 1;
  }

  return input;
}

function resolveOutputFormat(settings: AppSettings): string {
  const outputFormat = coerceT2IFieldValue(settings.t2i.modelId, 'output_format', settings.t2i.inputOverrides.output_format);
  if (typeof outputFormat === 'string') {
    return outputFormat === 'jpeg' ? 'jpg' : outputFormat;
  }

  const fallback = getT2IFieldDefault(settings.t2i.modelId, 'output_format');
  const normalizedFallback = typeof fallback === 'string' ? fallback : 'png';
  return normalizedFallback === 'jpeg' ? 'jpg' : normalizedFallback;
}

async function normalizeReplicateOutput(output: unknown): Promise<Uint8Array> {
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) {
    throw new Error('Replicate returned no image output.');
  }

  if (typeof first === 'string') {
    return fetchBytes(first);
  }

  if (first instanceof URL) {
    return fetchBytes(first.toString());
  }

  if (first instanceof Uint8Array) {
    return first;
  }

  if (first instanceof ArrayBuffer) {
    return new Uint8Array(first);
  }

  if (typeof Blob !== 'undefined' && first instanceof Blob) {
    return new Uint8Array(await first.arrayBuffer());
  }

  if (typeof ReadableStream !== 'undefined' && first instanceof ReadableStream) {
    return new Uint8Array(await new Response(first).arrayBuffer());
  }

  const fromBlobMethod = await maybeBytesFromBlobMethod(first);
  if (fromBlobMethod) {
    return fromBlobMethod;
  }

  const fromUrlMethod = await maybeBytesFromUrlMethod(first);
  if (fromUrlMethod) {
    return fromUrlMethod;
  }

  const fromArrayBufferMethod = await maybeBytesFromArrayBufferMethod(first);
  if (fromArrayBufferMethod) {
    return fromArrayBufferMethod;
  }

  throw new Error('Unsupported Replicate output format.');
}

async function maybeBytesFromBlobMethod(value: unknown): Promise<Uint8Array | null> {
  if (!isRecord(value) || typeof value.blob !== 'function') {
    return null;
  }

  const blobLike = await value.blob();
  if (typeof Blob === 'undefined' || !(blobLike instanceof Blob)) {
    return null;
  }

  return new Uint8Array(await blobLike.arrayBuffer());
}

async function maybeBytesFromUrlMethod(value: unknown): Promise<Uint8Array | null> {
  if (!isRecord(value) || typeof value.url !== 'function') {
    return null;
  }

  const urlLike = value.url();
  if (typeof urlLike === 'string') {
    return fetchBytes(urlLike);
  }

  if (urlLike instanceof URL) {
    return fetchBytes(urlLike.toString());
  }

  return null;
}

async function maybeBytesFromArrayBufferMethod(value: unknown): Promise<Uint8Array | null> {
  if (!isRecord(value) || typeof value.arrayBuffer !== 'function') {
    return null;
  }

  const data = await value.arrayBuffer();
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download generated asset from ${url}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}