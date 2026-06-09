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
  MetaJsonSeoCheck,
} from '../types/meta.js';
import type { SeoCheckMode, SeoLintResult } from '../seo/lint.js';
import type { ContentPlan } from '../types/contentPlan.js';
import type { CostSource } from '../pipeline/events.js';

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
  author?: string;
  editorialChecklist?: MetaJson['editorialChecklist'];
  seoCheck?: SeoLintResult & {
    ranAt: string;
    seoCheckMode: SeoCheckMode;
    warningsRemaining: number;
    editorTurns?: number;
    skipped?: boolean;
    editorCostUsd?: number | null;
    editorCostSource?: CostSource;
  };
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
  const primaryKeyword = (plan && 'primaryKeyword' in plan ? (plan as ArticlePlan).primaryKeyword : null) ?? null;
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
      ...(section.targetKeywords && section.targetKeywords.length > 0
        ? { targetKeywords: section.targetKeywords }
        : {}),
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
    primaryKeyword,
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
    ...(input.author ? { author: input.author } : {}),
    ...(input.editorialChecklist && input.editorialChecklist.length > 0
      ? { editorialChecklist: input.editorialChecklist }
      : {}),
    ...(input.seoCheck ? { seoCheck: toMetaSeoCheck(input.seoCheck) } : {}),
  };
}

function toMetaSeoCheck(seoCheck: NonNullable<BuildMetaJsonInput['seoCheck']>): MetaJsonSeoCheck {
  return {
    ranAt: seoCheck.ranAt,
    passed: seoCheck.passed,
    issues: seoCheck.issues.map((issue) => ({
      id: issue.id,
      severity: issue.severity,
      message: issue.message,
    })),
    seoCheckMode: seoCheck.seoCheckMode,
    warningsRemaining: seoCheck.warningsRemaining,
    ...(seoCheck.editorTurns !== undefined ? { editorTurns: seoCheck.editorTurns } : {}),
    ...(seoCheck.skipped !== undefined ? { skipped: seoCheck.skipped } : {}),
    ...(seoCheck.editorCostUsd !== undefined ? { editorCostUsd: seoCheck.editorCostUsd } : {}),
    ...(seoCheck.editorCostSource !== undefined ? { editorCostSource: seoCheck.editorCostSource } : {}),
  };
}
