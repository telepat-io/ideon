import { z } from 'zod';
import { configSettingKeys, configSecretKeys } from '../../config/manage.js';
import { targetLengthValues, writingStyleValues } from '../../config/schema.js';

const configKeys = [...configSettingKeys, ...configSecretKeys] as const;

export const writeToolInputSchema = {
  idea: z.string().min(1),
  audience: z.string().min(1).optional(),
  jobPath: z.string().optional(),
  primary: z.string().optional(),
  secondary: z.array(z.string()).optional(),
  style: z.enum(writingStyleValues).optional(),
  length: z.enum(targetLengthValues).optional(),
  dryRun: z.boolean().optional(),
  enrichLinks: z.boolean().optional(),
};
export const writeToolInputZodSchema = z.object(writeToolInputSchema);
export type WriteToolInput = z.infer<typeof writeToolInputZodSchema>;

export const writeResumeToolInputSchema = {
  dryRun: z.boolean().optional(),
  enrichLinks: z.boolean().optional(),
};
export const writeResumeToolInputZodSchema = z.object(writeResumeToolInputSchema);
export type WriteResumeToolInput = z.infer<typeof writeResumeToolInputZodSchema>;

export const deleteToolInputSchema = {
  slug: z.string().min(1),
};
export const deleteToolInputZodSchema = z.object(deleteToolInputSchema);
export type DeleteToolInput = z.infer<typeof deleteToolInputZodSchema>;

export const configGetToolInputSchema = {
  key: z.enum(configKeys),
};
export const configGetToolInputZodSchema = z.object(configGetToolInputSchema);
export type ConfigGetToolInput = z.infer<typeof configGetToolInputZodSchema>;

export const configSetToolInputSchema = {
  key: z.enum(configKeys),
  value: z.string(),
};
export const configSetToolInputZodSchema = z.object(configSetToolInputSchema);
export type ConfigSetToolInput = z.infer<typeof configSetToolInputZodSchema>;

export interface ToolContract {
  name: string;
  required: string[];
  enums: Record<string, string[]>;
}

export const ideonToolContracts: ToolContract[] = [
  {
    name: 'ideon_write',
    required: ['idea'],
    enums: {
      style: [...writingStyleValues],
      length: [...targetLengthValues],
    },
  },
  {
    name: 'ideon_config_set',
    required: ['key', 'value'],
    enums: {
      key: [...configKeys],
    },
  },
  {
    name: 'ideon_config_get',
    required: ['key'],
    enums: {
      key: [...configKeys],
    },
  },
];
