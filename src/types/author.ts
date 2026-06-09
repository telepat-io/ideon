import { z } from 'zod';

export const authorSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  profile: z.string().default(''),
});

export type Author = z.infer<typeof authorSchema>;

export function deriveAuthorSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-author';
}
