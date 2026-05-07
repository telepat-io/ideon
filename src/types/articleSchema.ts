import { z } from 'zod';

export const articleSectionPlanSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const inlineImagePlanSchema = z.object({
  description: z.string().min(1),
  anchorAfterSection: z.number().int().min(1),
});

export const primaryPlanSchema = z.object({
  contentType: z.string().min(1).default('article'),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  coverImageDescription: z.string().min(1),
  subtitle: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).min(3).max(8).optional(),
  introBrief: z.string().min(1).optional(),
  outroBrief: z.string().min(1).optional(),
  sections: z.array(articleSectionPlanSchema).min(2).max(10).optional(),
  inlineImages: z.array(inlineImagePlanSchema).min(2).max(3).optional(),
  angle: z.string().min(1).optional(),
});

export const longFormPlanSchema = z.object({
  contentType: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(3).max(8),
  slug: z.string().min(1),
  description: z.string().min(1),
  introBrief: z.string().min(1),
  outroBrief: z.string().min(1),
  sections: z.array(articleSectionPlanSchema).min(2).max(10),
  coverImageDescription: z.string().min(1),
  inlineImages: z.array(inlineImagePlanSchema).min(2).max(3),
});

export const shortFormPlanSchema = z.object({
  contentType: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  coverImageDescription: z.string().min(1),
  angle: z.string().min(1).optional(),
});

export const articlePlanSchema = longFormPlanSchema;

export const imagePromptResultSchema = z.object({
  prompt: z.string().min(1),
});

export type ParsedPrimaryPlan = z.infer<typeof primaryPlanSchema>;
export type ParsedArticlePlan = z.infer<typeof articlePlanSchema>;
export type ParsedImagePromptResult = z.infer<typeof imagePromptResultSchema>;