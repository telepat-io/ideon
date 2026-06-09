import { z } from 'zod';
import { configSettingKeys, configSecretKeys } from '../../config/manage.js';
import { contentIntentValues, contentTypeValues, targetLengthValues, writingStyleValues } from '../../config/schema.js';
import { queueEntryStatusValues } from '../../types/queue.js';

const configKeys = [...configSettingKeys, ...configSecretKeys] as const;

export const writeToolInputSchema = {
  idea: z.string().min(1),
  audience: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  experienceNotes: z.string().min(1).optional(),
  jobPath: z.string().optional(),
  publication: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  keywords: z.string().min(1).optional(),
  faqSection: z.boolean().optional(),
  primary: z.string().optional(),
  secondary: z.array(z.string()).optional(),
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  length: z.union([z.enum(targetLengthValues), z.coerce.number().int().positive()]).optional(),
  dryRun: z.boolean().optional(),
  noSeoCheck: z.boolean().optional(),
  seoCheckMode: z.enum(['errors-only', 'strict']).optional(),
  seoCheckMaxTurns: z.coerce.number().int().min(1).max(20).optional(),
  enrichLinks: z.boolean().optional(),
  link: z.array(z.string()).optional(),
  unlink: z.array(z.string()).optional(),
  maxLinks: z.coerce.number().int().positive().optional(),
  maxImages: z.coerce.number().int().min(1).optional(),
};
export const writeToolInputZodSchema = z.object(writeToolInputSchema);
export type WriteToolInput = z.infer<typeof writeToolInputZodSchema>;

export const writeResumeToolInputSchema = {
  dryRun: z.boolean().optional(),
  seoCheck: z.boolean().optional(),
  seoCheckMode: z.enum(['errors-only', 'strict']).optional(),
  seoCheckMaxTurns: z.coerce.number().int().min(1).max(20).optional(),
  enrichLinks: z.boolean().optional(),
  link: z.array(z.string()).optional(),
  unlink: z.array(z.string()).optional(),
  maxLinks: z.coerce.number().int().positive().optional(),
  maxImages: z.coerce.number().int().min(1).optional(),
  exportPath: z.string().min(1).optional(),
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

export const gkpGenerateIdeasToolInputSchema = {
  seedKeywords: z.array(z.string().min(1)).optional(),
  url: z.string().min(1).optional(),
  site: z.string().min(1).optional(),
  countryCodes: z.array(z.string().min(1)).optional(),
  language: z.string().min(1).optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  publication: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  refresh: z.boolean().optional(),
};
export const gkpGenerateIdeasToolInputZodSchema = z.object(gkpGenerateIdeasToolInputSchema);
export type GkpGenerateIdeasToolInput = z.infer<typeof gkpGenerateIdeasToolInputZodSchema>;

export const gkpGetHistoricalDataToolInputSchema = {
  keywords: z.array(z.string().min(1)).min(1),
  countryCodes: z.array(z.string().min(1)).optional(),
  language: z.string().min(1).optional(),
  includeAverageCpc: z.boolean().optional(),
  publication: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  refresh: z.boolean().optional(),
};
export const gkpGetHistoricalDataToolInputZodSchema = z.object(gkpGetHistoricalDataToolInputSchema);
export type GkpGetHistoricalDataToolInput = z.infer<typeof gkpGetHistoricalDataToolInputZodSchema>;

export const gkpGetForecastDataToolInputSchema = {
  keywords: z.array(z.string().min(1)).min(1),
  keywordMatchType: z.enum(['BROAD', 'EXACT', 'PHRASE']).optional(),
  maxCpcBidMicros: z.coerce.number().int().positive().optional(),
  countryCodes: z.array(z.string().min(1)).optional(),
  language: z.string().min(1).optional(),
  publication: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  refresh: z.boolean().optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
};
export const gkpGetForecastDataToolInputZodSchema = z.object(gkpGetForecastDataToolInputSchema);
export type GkpGetForecastDataToolInput = z.infer<typeof gkpGetForecastDataToolInputZodSchema>;

// ─── Publication tools ───────────────────────────────────────────────────────

export const publicationAddToolInputSchema = {
  name: z.string().min(1),
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  length: z.union([z.enum(targetLengthValues), z.coerce.number().int().positive()]).optional(),
  type: z.enum(contentTypeValues).optional(),
  audience: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  defaultAuthor: z.string().min(1).optional(),
  tone: z.string().optional(),
  forbiddenTopics: z.array(z.string()).optional(),
  disclosureRequirements: z.array(z.string()).optional(),
  audienceRestrictions: z.array(z.string()).optional(),
  editorialPolicy: z.string().optional(),
};
export const publicationAddToolInputZodSchema = z.object(publicationAddToolInputSchema);
export type PublicationAddToolInput = z.infer<typeof publicationAddToolInputZodSchema>;

export const publicationListToolInputSchema = {};
export const publicationListToolInputZodSchema = z.object(publicationListToolInputSchema);
export type PublicationListToolInput = z.infer<typeof publicationListToolInputZodSchema>;

export const publicationEditToolInputSchema = {
  slug: z.string().min(1),
  name: z.string().min(1).optional(),
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  length: z.union([z.enum(targetLengthValues), z.coerce.number().int().positive()]).optional(),
  type: z.enum(contentTypeValues).optional(),
  audience: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  defaultAuthor: z.string().min(1).optional(),
  unsetDefaultAuthor: z.boolean().optional(),
  tone: z.string().optional(),
  forbiddenTopics: z.array(z.string()).optional(),
  disclosureRequirements: z.array(z.string()).optional(),
  audienceRestrictions: z.array(z.string()).optional(),
  editorialPolicy: z.string().optional(),
};
export const publicationEditToolInputZodSchema = z.object(publicationEditToolInputSchema);
export type PublicationEditToolInput = z.infer<typeof publicationEditToolInputZodSchema>;

export const publicationRemoveToolInputSchema = {
  slug: z.string().min(1),
};
export const publicationRemoveToolInputZodSchema = z.object(publicationRemoveToolInputSchema);
export type PublicationRemoveToolInput = z.infer<typeof publicationRemoveToolInputZodSchema>;

// ─── Series tools ────────────────────────────────────────────────────────────

export const seriesAddToolInputSchema = {
  name: z.string().min(1),
  topic: z.string().optional(),
  publication: z.string().min(1).optional(),
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  length: z.union([z.enum(targetLengthValues), z.coerce.number().int().positive()]).optional(),
  type: z.enum(contentTypeValues).optional(),
  audience: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  defaultAuthor: z.string().min(1).optional(),
  experienceNotes: z.string().optional(),
  tone: z.string().optional(),
  forbiddenTopics: z.array(z.string()).optional(),
  disclosureRequirements: z.array(z.string()).optional(),
  audienceRestrictions: z.array(z.string()).optional(),
  editorialPolicy: z.string().optional(),
};
export const seriesAddToolInputZodSchema = z.object(seriesAddToolInputSchema);
export type SeriesAddToolInput = z.infer<typeof seriesAddToolInputZodSchema>;

export const seriesListToolInputSchema = {
  publication: z.string().min(1).optional(),
};
export const seriesListToolInputZodSchema = z.object(seriesListToolInputSchema);
export type SeriesListToolInput = z.infer<typeof seriesListToolInputZodSchema>;

export const seriesEditToolInputSchema = {
  slug: z.string().min(1),
  name: z.string().min(1).optional(),
  topic: z.string().optional(),
  publication: z.string().min(1).optional(),
  unsetPublication: z.boolean().optional(),
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  length: z.union([z.enum(targetLengthValues), z.coerce.number().int().positive()]).optional(),
  type: z.enum(contentTypeValues).optional(),
  audience: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  defaultAuthor: z.string().min(1).optional(),
  unsetDefaultAuthor: z.boolean().optional(),
  experienceNotes: z.string().optional(),
  tone: z.string().optional(),
  forbiddenTopics: z.array(z.string()).optional(),
  disclosureRequirements: z.array(z.string()).optional(),
  audienceRestrictions: z.array(z.string()).optional(),
  editorialPolicy: z.string().optional(),
};
export const seriesEditToolInputZodSchema = z.object(seriesEditToolInputSchema);
export type SeriesEditToolInput = z.infer<typeof seriesEditToolInputZodSchema>;

export const seriesRemoveToolInputSchema = {
  slug: z.string().min(1),
};
export const seriesRemoveToolInputZodSchema = z.object(seriesRemoveToolInputSchema);
export type SeriesRemoveToolInput = z.infer<typeof seriesRemoveToolInputZodSchema>;

// ─── Author tools ────────────────────────────────────────────────────────────

export const authorAddToolInputSchema = {
  name: z.string().min(1),
  profile: z.string().optional(),
};
export const authorAddToolInputZodSchema = z.object(authorAddToolInputSchema);
export type AuthorAddToolInput = z.infer<typeof authorAddToolInputZodSchema>;

export const authorListToolInputSchema = {};
export const authorListToolInputZodSchema = z.object(authorListToolInputSchema);
export type AuthorListToolInput = z.infer<typeof authorListToolInputZodSchema>;

export const authorEditToolInputSchema = {
  slug: z.string().min(1),
  name: z.string().min(1).optional(),
  profile: z.string().optional(),
};
export const authorEditToolInputZodSchema = z.object(authorEditToolInputSchema);
export type AuthorEditToolInput = z.infer<typeof authorEditToolInputZodSchema>;

export const authorRemoveToolInputSchema = {
  slug: z.string().min(1),
};
export const authorRemoveToolInputZodSchema = z.object(authorRemoveToolInputSchema);
export type AuthorRemoveToolInput = z.infer<typeof authorRemoveToolInputZodSchema>;

// ─── Queue tools ─────────────────────────────────────────────────────────────

export const queueAddToolInputSchema = {
  idea: z.string().min(1),
  publication: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  experienceNotes: z.string().min(1).optional(),
  style: z.enum(writingStyleValues).optional(),
  intent: z.enum(contentIntentValues).optional(),
  length: z.union([z.enum(targetLengthValues), z.coerce.number().int().positive()]).optional(),
  type: z.enum(contentTypeValues).optional(),
  audience: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  exportPath: z.string().min(1).optional(),
};
export const queueAddToolInputZodSchema = z.object(queueAddToolInputSchema);
export type QueueAddToolInput = z.infer<typeof queueAddToolInputZodSchema>;

export const queueListToolInputSchema = {
  status: z.enum(queueEntryStatusValues).optional(),
  publication: z.string().min(1).optional(),
};
export const queueListToolInputZodSchema = z.object(queueListToolInputSchema);
export type QueueListToolInput = z.infer<typeof queueListToolInputZodSchema>;

export const queuePeekToolInputSchema = {
  publication: z.string().min(1).optional(),
};
export const queuePeekToolInputZodSchema = z.object(queuePeekToolInputSchema);
export type QueuePeekToolInput = z.infer<typeof queuePeekToolInputZodSchema>;

export const queueRemoveToolInputSchema = {
  id: z.string().min(1),
};
export const queueRemoveToolInputZodSchema = z.object(queueRemoveToolInputSchema);
export type QueueRemoveToolInput = z.infer<typeof queueRemoveToolInputZodSchema>;

export const queueClearToolInputSchema = {};
export const queueClearToolInputZodSchema = z.object(queueClearToolInputSchema);
export type QueueClearToolInput = z.infer<typeof queueClearToolInputZodSchema>;

export const queueWriteToolInputSchema = {
  publication: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
  noSeoCheck: z.boolean().optional(),
  seoCheckMode: z.enum(['errors-only', 'strict']).optional(),
  seoCheckMaxTurns: z.coerce.number().int().min(1).max(20).optional(),
  enrichLinks: z.boolean().optional(),
  link: z.array(z.string()).optional(),
  unlink: z.array(z.string()).optional(),
  maxLinks: z.coerce.number().int().positive().optional(),
  maxImages: z.coerce.number().int().min(1).optional(),
};
export const queueWriteToolInputZodSchema = z.object(queueWriteToolInputSchema);
export type QueueWriteToolInput = z.infer<typeof queueWriteToolInputZodSchema>;

// ─── Plan tools ──────────────────────────────────────────────────────────────

export const planExploreToolInputSchema = {
  idea: z.string().min(1),
  publication: z.string().min(1),
  context: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  seriesCount: z.coerce.number().int().positive().optional(),
  articlesPerSeries: z.coerce.number().int().positive().optional(),
  seedKeywords: z.array(z.string().min(1)).optional(),
  excludeSeries: z.array(z.string().min(1)).optional(),
  contentType: z.enum(contentTypeValues).optional(),
  model: z.string().min(1).optional(),
  intentModel: z.string().min(1).optional(),
  autoSave: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  timeout: z.coerce.number().int().positive().optional(),
};
export const planExploreToolInputZodSchema = z.object(planExploreToolInputSchema);
export type PlanExploreToolInput = z.infer<typeof planExploreToolInputZodSchema>;

export const planExpandToolInputSchema = {
  seriesSlug: z.string().min(1),
  publication: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  articleCount: z.coerce.number().int().positive().optional(),
  seedKeywords: z.array(z.string().min(1)).optional(),
  contentType: z.enum(contentTypeValues).optional(),
  model: z.string().min(1).optional(),
  intentModel: z.string().min(1).optional(),
  autoSave: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  timeout: z.coerce.number().int().positive().optional(),
};
export const planExpandToolInputZodSchema = z.object(planExpandToolInputSchema);
export type PlanExpandToolInput = z.infer<typeof planExpandToolInputZodSchema>;

// ─── Article tools ───────────────────────────────────────────────────────────

export const articleListToolInputSchema = {
  search: z.string().min(1).optional(),
  publication: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  contentType: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
  verbose: z.boolean().optional(),
};
export const articleListToolInputZodSchema = z.object(articleListToolInputSchema);
export type ArticleListToolInput = z.infer<typeof articleListToolInputZodSchema>;

export const gkpListToolInputSchema = {
  publication: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  fresh: z.boolean().optional(),
  stale: z.boolean().optional(),
  verbose: z.boolean().optional(),
};
export const gkpListToolInputZodSchema = z.object(gkpListToolInputSchema);
export type GkpListToolInput = z.infer<typeof gkpListToolInputZodSchema>;

// ─── Preview tools ───────────────────────────────────────────────────────────

export const previewToolInputSchema = {
  action: z.enum(['start', 'stop', 'status']),
  port: z.number().int().min(1).max(65535).optional(),
  markdownPath: z.string().min(1).optional(),
};
export const previewToolInputZodSchema = z.object(previewToolInputSchema);
export type PreviewToolInput = z.infer<typeof previewToolInputZodSchema>;

// ─── GAds login tools ───────────────────────────────────────────────────────

export const gadsLoginToolInputSchema = {
  developerToken: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  customerId: z.string().min(1),
  loginCustomerId: z.string().optional(),
  force: z.boolean().optional(),
};
export const gadsLoginToolInputZodSchema = z.object(gadsLoginToolInputSchema);
export type GadsLoginToolInput = z.infer<typeof gadsLoginToolInputZodSchema>;

export const gadsLoginStatusToolInputSchema = {};
export const gadsLoginStatusToolInputZodSchema = z.object(gadsLoginStatusToolInputSchema);
export type GadsLoginStatusToolInput = z.infer<typeof gadsLoginStatusToolInputZodSchema>;

export const gadsTestToolInputSchema = {};
export const gadsTestToolInputZodSchema = z.object(gadsTestToolInputSchema);
export type GadsTestToolInput = z.infer<typeof gadsTestToolInputZodSchema>;

export const gadsLogoutToolInputSchema = {
  all: z.boolean().optional(),
};
export const gadsLogoutToolInputZodSchema = z.object(gadsLogoutToolInputSchema);
export type GadsLogoutToolInput = z.infer<typeof gadsLogoutToolInputZodSchema>;

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
      seoCheckMode: ['errors-only', 'strict'],
    },
  },
  {
    name: 'ideon_write_resume',
    required: [],
    enums: {
      seoCheckMode: ['errors-only', 'strict'],
    },
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
  {
    name: 'gkp_generate_ideas',
    required: [],
    enums: {},
  },
  {
    name: 'gkp_get_historical_data',
    required: ['keywords'],
    enums: {},
  },
  {
    name: 'gkp_get_forecast_data',
    required: ['keywords'],
    enums: {
      keywordMatchType: ['BROAD', 'EXACT', 'PHRASE'],
    },
  },
  {
    name: 'ideon_publication_add',
    required: ['name'],
    enums: {
      style: [...writingStyleValues],
      intent: [...contentIntentValues],
      length: [...targetLengthValues],
      type: [...contentTypeValues],
    },
  },
  {
    name: 'ideon_publication_list',
    required: [],
    enums: {},
  },
  {
    name: 'ideon_publication_edit',
    required: ['slug'],
    enums: {
      style: [...writingStyleValues],
      intent: [...contentIntentValues],
      length: [...targetLengthValues],
      type: [...contentTypeValues],
    },
  },
  {
    name: 'ideon_publication_remove',
    required: ['slug'],
    enums: {},
  },
  {
    name: 'ideon_series_add',
    required: ['name'],
    enums: {
      style: [...writingStyleValues],
      intent: [...contentIntentValues],
      length: [...targetLengthValues],
      type: [...contentTypeValues],
    },
  },
  {
    name: 'ideon_series_list',
    required: [],
    enums: {},
  },
  {
    name: 'ideon_series_edit',
    required: ['slug'],
    enums: {
      style: [...writingStyleValues],
      intent: [...contentIntentValues],
      length: [...targetLengthValues],
      type: [...contentTypeValues],
    },
  },
  {
    name: 'ideon_series_remove',
    required: ['slug'],
    enums: {},
  },
  {
    name: 'ideon_author_add',
    required: ['name'],
    enums: {},
  },
  {
    name: 'ideon_author_list',
    required: [],
    enums: {},
  },
  {
    name: 'ideon_author_edit',
    required: ['slug'],
    enums: {},
  },
  {
    name: 'ideon_author_remove',
    required: ['slug'],
    enums: {},
  },
  {
    name: 'ideon_queue_add',
    required: ['idea'],
    enums: {
      style: [...writingStyleValues],
      intent: [...contentIntentValues],
      length: [...targetLengthValues],
      type: [...contentTypeValues],
    },
  },
  {
    name: 'ideon_queue_list',
    required: [],
    enums: {
      status: [...queueEntryStatusValues],
    },
  },
  {
    name: 'ideon_queue_peek',
    required: [],
    enums: {},
  },
  {
    name: 'ideon_queue_remove',
    required: ['id'],
    enums: {},
  },
  {
    name: 'ideon_queue_clear',
    required: [],
    enums: {},
  },
  {
    name: 'ideon_queue_write',
    required: [],
    enums: {
      seoCheckMode: ['errors-only', 'strict'],
    },
  },
  {
    name: 'ideon_plan_explore',
    required: ['idea', 'publication'],
    enums: {
      contentType: [...contentTypeValues],
    },
  },
  {
    name: 'ideon_plan_expand',
    required: ['seriesSlug'],
    enums: {
      contentType: [...contentTypeValues],
    },
  },
  {
    name: 'ideon_article_list',
    required: [],
    enums: {},
  },
  {
    name: 'ideon_preview',
    required: ['action'],
    enums: {
      action: ['start', 'stop', 'status'],
    },
  },
  {
    name: 'gads_login',
    required: ['developerToken', 'clientId', 'clientSecret', 'customerId'],
    enums: {},
  },
  {
    name: 'gads_login_status',
    required: [],
    enums: {},
  },
  {
    name: 'gads_test',
    required: [],
    enums: {},
  },
  {
    name: 'gkp_list',
    required: [],
    enums: {},
  },
  {
    name: 'gads_logout',
    required: [],
    enums: {},
  },
];
