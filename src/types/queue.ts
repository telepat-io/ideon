import { z } from 'zod';
import { appSettingsSchema, jobInputSchema } from '../config/schema.js';
import { publicationSchema } from './publication.js';
import { seriesSchema } from './series.js';

export const queueEntryStatusValues = ['pending', 'in-progress'] as const;

export const queueEntrySchema = z.object({
  id: z.string().min(1),
  status: z.enum(queueEntryStatusValues),
  idea: z.string().min(1),
  targetAudienceHint: z.string().optional(),
  settings: appSettingsSchema,
  job: jobInputSchema.nullable().default(null),
  publication: publicationSchema.nullable().default(null),
  series: seriesSchema.nullable().default(null),
  exportPath: z.string().optional(),
  addedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  type: z.enum(['new', 'refresh']).default('new'),
  refreshTarget: z.string().optional(),
});

export type QueueEntry = z.infer<typeof queueEntrySchema>;
export type QueueEntryStatus = z.infer<typeof queueEntrySchema>['status'];
