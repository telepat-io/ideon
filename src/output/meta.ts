import path from 'node:path';
import type {
  ArticleImagePrompt,
  ArticlePlan,
  PrimaryPlan,
  RenderedArticleImage,
} from '../types/article.js';
import type {
  MetaJson,
  MetaJsonCoverImage,
  MetaJsonImage,
  MetaJsonOutput,
  MetaJsonSection,
} from '../types/meta.js';
import type { ContentPlan } from '../types/contentPlan.js';

export interface BuildMetaJsonInput {
  idea: string;
  generationDir: string;
  contentPlan: ContentPlan | null;
  plan: PrimaryPlan | null;
  renderedImages: RenderedArticleImage[];
  outputs: Array<{ fileId: string; contentType: string; markdownPath: string }>;
  generatedAt: string;
  style: string;
  intent: string;
  targetLength: string | null;
  publication?: string;
  series?: string;
}

export function buildMetaJson(input: BuildMetaJsonInput): MetaJson {
  const plan = input.plan;
  const contentPlan = input.contentPlan;
  const generationDir = input.generationDir;

  const title = plan?.title ?? contentPlan?.title ?? input.idea;
  const slug = plan?.slug ?? '';
  const description = plan?.description ?? contentPlan?.description ?? '';
  const subtitle = (plan && 'subtitle' in plan ? (plan as ArticlePlan).subtitle : null) ?? null;
  const keywords = (plan && 'keywords' in plan ? (plan as ArticlePlan).keywords : null) ?? [];
  const contentType = plan?.contentType ?? contentPlan?.primaryContentType ?? 'article';
  const angle = plan?.angle ?? null;

  const coverImage = input.renderedImages.find((image) => image.kind === 'cover') ?? null;

  const cover: MetaJsonCoverImage | null = coverImage
    ? {
        path: coverImage.outputPath,
        relativePath: coverImage.relativePath,
        description: coverImage.description,
      }
    : null;

  const sections: MetaJsonSection[] =
    plan?.sections?.map((section) => ({
      title: section.title,
      description: section.description,
    })) ?? [];

  const images: MetaJsonImage[] = input.renderedImages.map((image) => ({
    id: image.id,
    kind: image.kind,
    path: image.outputPath,
    relativePath: image.relativePath,
    description: image.description,
    anchorAfterSection: image.anchorAfterSection,
  }));

  const outputs: MetaJsonOutput[] = input.outputs.map((output) => ({
    fileId: output.fileId,
    contentType: output.contentType,
    path: output.markdownPath,
    relativePath: path.relative(generationDir, output.markdownPath),
  }));

  return {
    version: 1,
    title,
    slug,
    idea: input.idea,
    description,
    subtitle,
    keywords,
    contentType,
    style: input.style,
    intent: input.intent,
    targetLength: input.targetLength,
    angle,
    cover,
    sections,
    images,
    outputs,
    generatedAt: input.generatedAt,
    generationDir,
    ...(input.publication ? { publication: input.publication } : {}),
    ...(input.series ? { series: input.series } : {}),
  };
}
