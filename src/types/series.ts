import { z } from 'zod';
import {
  contentIntentValues,
  contentTypeValues,
  writingStyleValues,
  targetLengthWordsSchema,
  contentTargetRoleValues,
} from '../config/schema.js';
import { countryCodeSchema, languageCodeSchema } from '../config/marketLocale.js';

export const seriesEditorialPolicySchema = z.object({
  tone: z.string().default(''),
  forbiddenTopics: z.array(z.string()).default([]),
  disclosureRequirements: z.array(z.string()).default([]),
  audienceRestrictions: z.array(z.string()).default([]),
  notes: z.string().default(''),
});

export const seriesDefaultsSchema = z.object({
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  targetLength: targetLengthWordsSchema.optional(),
  keywords: z.array(z.string().min(1)).optional(),
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
  countryCodes: z.array(countryCodeSchema).min(1).optional(),
  language: languageCodeSchema.optional(),
  maxImages: z.number().int().positive().optional(),
  maxLinks: z.number().int().positive().optional(),
  defaultAuthor: z.string().min(1).optional(),
  experienceNotes: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
});

export const seriesSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  topic: z.string().default(''),
  publication: z.string().optional(),
  editorialPolicy: seriesEditorialPolicySchema.default(seriesEditorialPolicySchema.parse({})),
  defaults: seriesDefaultsSchema.default(seriesDefaultsSchema.parse({})),
});

export type SeriesEditorialPolicy = z.infer<typeof seriesEditorialPolicySchema>;
export type SeriesDefaults = z.infer<typeof seriesDefaultsSchema>;
export type Series = z.infer<typeof seriesSchema>;

export function deriveSeriesSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-series';
}
