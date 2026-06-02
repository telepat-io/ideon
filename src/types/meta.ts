import { z } from 'zod';

export const metaJsonCoverImageSchema = z.object({
  path: z.string().min(1),
  relativePath: z.string().min(1),
  description: z.string().min(1),
});

export const metaJsonSectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
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
});

export type MetaJsonCoverImage = z.infer<typeof metaJsonCoverImageSchema>;
export type MetaJsonSection = z.infer<typeof metaJsonSectionSchema>;
export type MetaJsonImage = z.infer<typeof metaJsonImageSchema>;
export type MetaJsonOutput = z.infer<typeof metaJsonOutputSchema>;
export type MetaJson = z.infer<typeof metaJsonSchema>;
