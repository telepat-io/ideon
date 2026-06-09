import { z } from 'zod';

export const metaJsonCoverImageSchema = z.object({
  path: z.string().min(1),
  relativePath: z.string().min(1),
  description: z.string().min(1),
});

export const metaJsonSeoIssueSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(['error', 'warning']),
  message: z.string().min(1),
});

export const metaJsonSeoCheckSchema = z.object({
  ranAt: z.string().min(1),
  passed: z.boolean(),
  issues: z.array(metaJsonSeoIssueSchema),
  seoCheckMode: z.enum(['errors-only', 'strict']),
  warningsRemaining: z.number().int().nonnegative(),
  editorTurns: z.number().int().nonnegative().optional(),
  skipped: z.boolean().optional(),
  editorCostUsd: z.number().nonnegative().nullable().optional(),
  editorCostSource: z.enum(['provider', 'estimated', 'unavailable']).optional(),
});

export const metaJsonSectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  targetKeywords: z.array(z.string().min(1)).optional(),
});

export const metaJsonImageSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['cover', 'inline']),
  path: z.string().min(1),
  relativePath: z.string().min(1),
  description: z.string().min(1),
  anchorAfterSection: z.number().int().nonnegative().nullable(),
});

export const metaJsonOutputSchema = z.object({
  fileId: z.string().min(1),
  contentType: z.string().min(1),
  path: z.string().min(1),
  relativePath: z.string().min(1),
});

export const metaJsonSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  idea: z.string().min(1),
  description: z.string().min(1),
  subtitle: z.string().nullable(),
  keywords: z.array(z.string().min(1)),
  primaryKeyword: z.string().nullable().optional(),
  contentType: z.string().min(1),
  style: z.string().min(1),
  intent: z.string().min(1),
  targetLength: z.string().nullable(),
  angle: z.string().nullable(),
  cover: metaJsonCoverImageSchema.nullable(),
  sections: z.array(metaJsonSectionSchema),
  images: z.array(metaJsonImageSchema),
  outputs: z.array(metaJsonOutputSchema),
  generatedAt: z.string().min(1),
  generationDir: z.string().min(1),
  publication: z.string().optional(),
  series: z.string().optional(),
  seoCheck: metaJsonSeoCheckSchema.optional(),
});

export type MetaJsonSeoCheck = z.infer<typeof metaJsonSeoCheckSchema>;
export type MetaJsonCoverImage = z.infer<typeof metaJsonCoverImageSchema>;
export type MetaJsonSection = z.infer<typeof metaJsonSectionSchema>;
export type MetaJsonImage = z.infer<typeof metaJsonImageSchema>;
export type MetaJsonOutput = z.infer<typeof metaJsonOutputSchema>;
export type MetaJson = z.infer<typeof metaJsonSchema>;
