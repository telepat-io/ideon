export interface ArticleSectionPlan {
  title: string;
  description: string;
  targetKeywords?: string[];
}

export interface InlineImagePlan {
  description: string;
  anchorAfterSection: number;
}

export const LONG_FORM_CONTENT_TYPES = [
  'article',
  'blog-post',
  'newsletter',
  'press-release',
  'science-paper',
] as const;

export type LongFormContentType = (typeof LONG_FORM_CONTENT_TYPES)[number];

export function isLongFormContentType(contentType: string): contentType is LongFormContentType {
  return (LONG_FORM_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export interface PrimaryPlan {
  contentType: string;
  title: string;
  slug: string;
  description: string;
  coverImageDescription: string;
  subtitle?: string;
  keywords?: string[];
  primaryKeyword?: string;
  introBrief?: string;
  outroBrief?: string;
  sections?: ArticleSectionPlan[];
  inlineImages?: InlineImagePlan[];
  angle?: string;
}

export type ArticlePlan = PrimaryPlan & {
  subtitle: string;
  keywords: string[];
  primaryKeyword: string;
  introBrief: string;
  outroBrief: string;
  sections: ArticleSectionPlan[];
  inlineImages: InlineImagePlan[];
};

export function isLongFormPlan(plan: PrimaryPlan): plan is ArticlePlan {
  return (
    isLongFormContentType(plan.contentType) &&
    plan.sections !== undefined &&
    plan.sections.length > 0
  );
}

export interface ArticleImagePrompt {
  id: string;
  kind: 'cover' | 'inline';
  prompt: string;
  description: string;
  anchorAfterSection: number | null;
}

export interface RenderedArticleImage extends ArticleImagePrompt {
  outputPath: string;
  relativePath: string;
}

export interface GeneratedArticleSection {
  title: string;
  body: string;
}

export interface GeneratedArticle {
  plan: ArticlePlan;
  intro: string;
  sections: GeneratedArticleSection[];
  outro: string;
  imagePrompts: ArticleImagePrompt[];
  renderedImages: RenderedArticleImage[];
}

export interface LinkEntry {
  expression: string;
  url: string;
  title: string | null;
  /**
   * When true, the enrichment engine will link every occurrence of this
   * expression in the markdown body (subject to protected-span rules).
   * Generated links (isCustom: false / undefined) are only applied to the
   * first unprotected occurrence.
   */
  isCustom?: boolean;
}

export interface ContentItemLinks {
  fileId: string;
  contentType: string;
  markdownPath: string;
  links: LinkEntry[];
  customLinks: LinkEntry[];
}