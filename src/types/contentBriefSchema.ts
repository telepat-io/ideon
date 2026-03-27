import { z } from 'zod';

export const contentBriefSchema = z.object({
  description: z.string().min(40),
  targetAudience: z.string().min(10),
  corePromise: z.string().min(20),
  keyPoints: z.array(z.string().min(8)).min(3).max(6),
  voiceNotes: z.string().min(20),
});

export type ParsedContentBrief = z.infer<typeof contentBriefSchema>;
