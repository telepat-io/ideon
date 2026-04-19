import { z } from 'zod';

export const contentTypeValues = [
  'article',
  'blog-post',
  'linkedin-post',
  'newsletter',
  'press-release',
  'reddit-post',
  'science-paper',
  'x-post',
  'x-thread',
] as const;

export const writingStyleValues = [
  'academic',
  'analytical',
  'authoritative',
  'conversational',
  'empathetic',
  'friendly',
  'journalistic',
  'minimalist',
  'persuasive',
  'playful',
  'professional',
  'storytelling',
  'technical',
] as const;

export const contentIntentValues = [
  'announcement',
  'case-study',
  'cornerstone',
  'counterargument',
  'critique-review',
  'deep-dive-analysis',
  'how-to-guide',
  'interview-q-and-a',
  'listicle',
  'opinion-piece',
  'personal-essay',
  'roundup-curation',
  'tutorial',
] as const;

export const targetLengthValues = ['small', 'medium', 'large'] as const;

export const targetLengthAliasWordCounts: Record<(typeof targetLengthValues)[number], number> = {
  small: 500,
  medium: 900,
  large: 1400,
};

const defaultTargetLengthWords = targetLengthAliasWordCounts.medium;

function parseTargetLengthWords(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return undefined;
  }

  if ((targetLengthValues as readonly string[]).includes(normalized)) {
    return targetLengthAliasWordCounts[normalized as (typeof targetLengthValues)[number]];
  }

  if (!/^\d+$/.test(normalized)) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

const targetLengthWordsSchema = z.preprocess(
  (value) => parseTargetLengthWords(value),
  z.number().int().positive(),
);

export function resolveTargetLengthAlias(targetLengthWords: number): (typeof targetLengthValues)[number] {
  if (!Number.isFinite(targetLengthWords) || targetLengthWords <= 0) {
    return 'medium';
  }

  if (targetLengthWords <= 700) {
    return 'small';
  }

  if (targetLengthWords <= 1150) {
    return 'medium';
  }

  return 'large';
}

export const contentTargetRoleValues = ['primary', 'secondary'] as const;

const contentTargetSchema = z.object({
  contentType: z.enum(contentTypeValues),
  role: z.enum(contentTargetRoleValues),
  count: z.number().int().positive().default(1),
});

export const modelSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4000),
  topP: z.number().min(0).max(1).default(1),
});

export const baseT2ISettingsSchema = z.object({
  modelId: z.string().default('black-forest-labs/flux-schnell'),
  inputOverrides: z.record(z.string(), z.unknown()).default({}),
});

export const notificationsSettingsSchema = z.object({
  enabled: z.boolean().default(false),
});

export const appSettingsSchema = z.object({
  model: z.string().default('moonshotai/kimi-k2.5'),
  modelSettings: modelSettingsSchema.default(modelSettingsSchema.parse({})),
  modelRequestTimeoutMs: z.number().int().positive().default(90000),
  t2i: baseT2ISettingsSchema.default(baseT2ISettingsSchema.parse({})),
  notifications: notificationsSettingsSchema.default(notificationsSettingsSchema.parse({})),
  markdownOutputDir: z.string().default('/output'),
  assetOutputDir: z.string().default('/output/assets'),
  contentTargets: z
    .array(contentTargetSchema)
    .min(1)
    .refine((targets) => targets.filter((target) => target.role === 'primary').length === 1, {
      message: 'contentTargets must include exactly one primary target.',
    })
    .default([{ contentType: 'article', role: 'primary', count: 1 }]),
  style: z.enum(writingStyleValues).default('professional'),
  intent: z.enum(contentIntentValues).default('tutorial'),
  targetLength: targetLengthWordsSchema.default(defaultTargetLengthWords),
});

export const envSettingsSchema = z.object({
  openRouterApiKey: z.string().optional(),
  replicateApiToken: z.string().optional(),
  disableKeytar: z.boolean().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  modelRequestTimeoutMs: z.number().int().positive().optional(),
  notificationsEnabled: z.boolean().optional(),
  markdownOutputDir: z.string().optional(),
  assetOutputDir: z.string().optional(),
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  targetLength: targetLengthWordsSchema.optional(),
});

export const jobInputSchema = z.object({
  idea: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  targetAudience: z.string().min(1).optional(),
  settings: appSettingsSchema.partial().optional(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type JobInput = z.infer<typeof jobInputSchema>;
export type EnvSettings = z.infer<typeof envSettingsSchema>;
export type TargetLength = number;

export interface SecretSettings {
  openRouterApiKey: string | null;
  replicateApiToken: string | null;
}

export interface ResolvedConfig {
  settings: AppSettings;
  secrets: SecretSettings;
}

export const defaultAppSettings = appSettingsSchema.parse({});

export interface ResolvedPaths {
  markdownOutputDir: string;
  assetOutputDir: string;
}