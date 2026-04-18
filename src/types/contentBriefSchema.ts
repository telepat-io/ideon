import { z } from 'zod';

export const contentBriefSchema = z.object({
  title: z.string().min(8),
  description: z.string().min(40),
  targetAudience: z.string().min(10),
  corePromise: z.string().min(20),
  keyPoints: z.array(z.string().min(8)).min(3).max(6),
  voiceNotes: z.string().min(20),
  primaryContentType: z.string().min(2),
  secondaryContentTypes: z.array(z.string().min(2)).max(10),
  secondaryContentStrategy: z.string(),
}).superRefine((brief, ctx) => {
  const hasSecondaryTargets = brief.secondaryContentTypes.length > 0;
  if (!hasSecondaryTargets) {
    return;
  }

  if (brief.secondaryContentStrategy.trim().length < 20) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 20,
      inclusive: true,
      origin: 'string',
      path: ['secondaryContentStrategy'],
      type: 'string',
      message: 'Too small: expected string to have >=20 characters',
    });
  }
});

export type ParsedContentBrief = z.infer<typeof contentBriefSchema>;
