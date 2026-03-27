import { z } from 'zod';

export const articleSectionPlanSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const inlineImagePlanSchema = z.object({
  anchorAfterSection: z.number().int().min(1).max(6),
  description: z.string().min(1),
});

export const articlePlanSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(3).max(8),
  slug: z.string().min(1),
  description: z.string().min(1),
  introBrief: z.string().min(1),
  outroBrief: z.string().min(1),
  sections: z.array(articleSectionPlanSchema).min(4).max(6),
  coverImageDescription: z.string().min(1),
  inlineImages: z.array(inlineImagePlanSchema).min(2).max(3),
});

export const imagePromptResultSchema = z.object({
  prompt: z.string().min(1),
});

export type ParsedArticlePlan = z.infer<typeof articlePlanSchema>;
export type ParsedImagePromptResult = z.infer<typeof imagePromptResultSchema>;