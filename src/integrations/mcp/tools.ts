import { z } from 'zod';
import { configSettingKeys, configSecretKeys } from '../../config/manage.js';
import { contentIntentValues, targetLengthValues, writingStyleValues } from '../../config/schema.js';

const configKeys = [...configSettingKeys, ...configSecretKeys] as const;

export const writeToolInputSchema = {
  idea: z.string().min(1),
  audience: z.string().min(1).optional(),
  jobPath: z.string().optional(),
  primary: z.string().optional(),
  secondary: z.array(z.string()).optional(),
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  length: z.union([z.enum(targetLengthValues), z.coerce.number().int().positive()]).optional(),
  dryRun: z.boolean().optional(),
  enrichLinks: z.boolean().optional(),
  link: z.array(z.string()).optional(),
  unlink: z.array(z.string()).optional(),
  maxLinks: z.coerce.number().int().positive().optional(),
};
export const writeToolInputZodSchema = z.object(writeToolInputSchema);
export type WriteToolInput = z.infer<typeof writeToolInputZodSchema>;

export const writeResumeToolInputSchema = {
  dryRun: z.boolean().optional(),
  enrichLinks: z.boolean().optional(),
  link: z.array(z.string()).optional(),
  unlink: z.array(z.string()).optional(),
  maxLinks: z.coerce.number().int().positive().optional(),
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

export const linksToolInputSchema = {
  slug: z.string().min(1),
  mode: z.enum(['fresh', 'append']).optional(),
  link: z.array(z.string()).optional(),
  unlink: z.array(z.string()).optional(),
  maxLinks: z.coerce.number().int().positive().optional(),
};
export const linksToolInputZodSchema = z.object(linksToolInputSchema);
export type LinksToolInput = z.infer<typeof linksToolInputZodSchema>;

export const exportToolInputSchema = {
  generationId: z.string().min(1),
  destinationPath: z.string().min(1),
  index: z.coerce.number().int().positive().optional(),
  overwrite: z.boolean().optional(),
};
export const exportToolInputZodSchema = z.object(exportToolInputSchema);
export type ExportToolInput = z.infer<typeof exportToolInputZodSchema>;

export const configListToolInputSchema = {};
export const configListToolInputZodSchema = z.object(configListToolInputSchema);
export type ConfigListToolInput = z.infer<typeof configListToolInputZodSchema>;

export const configUnsetToolInputSchema = {
  key: z.enum(configKeys),
};
export const configUnsetToolInputZodSchema = z.object(configUnsetToolInputSchema);
export type ConfigUnsetToolInput = z.infer<typeof configUnsetToolInputZodSchema>;

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
      intent: [...contentIntentValues],
      length: [...targetLengthValues],
    },
  },
  {
    name: 'ideon_write_resume',
    required: [],
    enums: {},
  },
  {
    name: 'ideon_delete',
    required: ['slug'],
    enums: {},
  },
  {
    name: 'ideon_links',
    required: ['slug'],
    enums: {
      mode: ['fresh', 'append'],
    },
  },
  {
    name: 'ideon_export',
    required: ['generationId', 'destinationPath'],
    enums: {},
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
  {
    name: 'ideon_config_list',
    required: [],
    enums: {},
  },
  {
    name: 'ideon_config_unset',
    required: ['key'],
    enums: {
      key: [...configKeys],
    },
  },
];
