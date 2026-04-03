import { z } from 'zod';

export const contentTypeValues = [
  'article',
  'blog-post',
  'x-thread',
  'x-post',
  'reddit-post',
  'linkedin-post',
  'newsletter',
  'landing-page-copy',
] as const;

export const writingStyleValues = ['professional', 'friendly', 'technical', 'academic', 'opinionated', 'storytelling'] as const;

export const targetLengthValues = ['small', 'medium', 'large'] as const;

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
  targetLength: z.enum(targetLengthValues).default('medium'),
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
  targetLength: z.enum(targetLengthValues).optional(),
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
export type TargetLength = (typeof targetLengthValues)[number];

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