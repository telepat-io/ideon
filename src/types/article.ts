export interface ArticleSectionPlan {
  title: string;
  description: string;
}

export interface InlineImagePlan {
  anchorAfterSection: number;
  description: string;
}

export interface ArticlePlan {
  title: string;
  subtitle: string;
  keywords: string[];
  slug: string;
  description: string;
  introBrief: string;
  outroBrief: string;
  sections: ArticleSectionPlan[];
  coverImageDescription: string;
  inlineImages: InlineImagePlan[];
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