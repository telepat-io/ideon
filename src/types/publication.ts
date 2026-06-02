import { z } from 'zod';
import {
  contentIntentValues,
  contentTypeValues,
  writingStyleValues,
  targetLengthWordsSchema,
  contentTargetRoleValues,
} from '../config/schema.js';

export const editorialPolicySchema = z.object({
  tone: z.string().default(''),
  forbiddenTopics: z.array(z.string()).default([]),
  disclosureRequirements: z.array(z.string()).default([]),
  audienceRestrictions: z.array(z.string()).default([]),
  notes: z.string().default(''),
});

export const publicationDefaultsSchema = z.object({
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  targetLength: targetLengthWordsSchema.optional(),
  contentTargets: z
    .array(
      z.object({
        contentType: z.enum(contentTypeValues),
        role: z.enum(contentTargetRoleValues),
        count: z.number().int().positive().default(1),
      }),
    )
    .min(1)
    .refine((targets) => targets.filter((target) => target.role === 'primary').length === 1, {
      message: 'contentTargets must include exactly one primary target.',
    })
    .optional(),
  targetAudienceHint: z.string().optional(),
  maxImages: z.number().int().positive().optional(),
  maxLinks: z.number().int().positive().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
});

export const publicationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  editorialPolicy: editorialPolicySchema.default(editorialPolicySchema.parse({})),
  defaults: publicationDefaultsSchema.default(publicationDefaultsSchema.parse({})),
});

export type EditorialPolicy = z.infer<typeof editorialPolicySchema>;
export type PublicationDefaults = z.infer<typeof publicationDefaultsSchema>;
export type Publication = z.infer<typeof publicationSchema>;

export function deriveSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-publication';
}
