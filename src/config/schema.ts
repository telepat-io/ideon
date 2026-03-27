import { z } from 'zod';

export const modelSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4000),
  topP: z.number().min(0).max(1).default(1),
});

export const baseT2ISettingsSchema = z.object({
  modelId: z.string().default('black-forest-labs/flux-schnell'),
  inputOverrides: z.record(z.string(), z.unknown()).default({}),
});

export const appSettingsSchema = z.object({
  model: z.string().default('moonshotai/kimi-k2.5'),
  modelSettings: modelSettingsSchema.default(modelSettingsSchema.parse({})),
  t2i: baseT2ISettingsSchema.default(baseT2ISettingsSchema.parse({})),
  markdownOutputDir: z.string().default('/output'),
  assetOutputDir: z.string().default('/output/assets'),
});

export const envSettingsSchema = z.object({
  openRouterApiKey: z.string().optional(),
  replicateApiToken: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  markdownOutputDir: z.string().optional(),
  assetOutputDir: z.string().optional(),
});

export const jobInputSchema = z.object({
  idea: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  settings: appSettingsSchema.partial().optional(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type JobInput = z.infer<typeof jobInputSchema>;
export type EnvSettings = z.infer<typeof envSettingsSchema>;

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