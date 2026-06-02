import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';
import { z } from 'zod';

const ideonPaths = envPaths('ideon', { suffix: '' });
const gkpDir = path.join(ideonPaths.config, 'gkp');
const queriesDir = path.join(gkpDir, 'queries');
const keywordsDir = path.join(gkpDir, 'keywords');
const DEFAULT_TTL_DAYS = 30;

const gkpQueryModeSchema = z.enum(['ideas', 'historical', 'forecast']);

const gkpQuerySnapshotSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string().min(1),
  mode: gkpQueryModeSchema,
  savedAt: z.string().datetime(),
  ttlDays: z.number().int().positive().default(DEFAULT_TTL_DAYS),
  publication: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  url: z.string().min(1).optional(),
  site: z.string().min(1).optional(),
  countryCodes: z.array(z.string().min(1)).optional(),
  language: z.string().min(1).optional(),
  pageSize: z.number().int().positive().optional(),
  includeCpc: z.boolean().optional(),
  matchType: z.string().min(1).optional(),
  maxCpcBid: z.number().int().positive().optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  count: z.number().int().min(0),
  response: z.unknown(),
});

const gkpKeywordRecordSchema = z.object({
  version: z.literal(1),
  normalizedKeyword: z.string().min(1),
  keyword: z.string().min(1),
  savedAt: z.string().datetime(),
  publication: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  countryCodes: z.array(z.string().min(1)).optional(),
  language: z.string().min(1).optional(),
  avgMonthlySearches: z.number().int().min(0).optional(),
  competition: z.string().min(1).optional(),
  lowTopOfPageBidMicros: z.number().int().min(0).optional(),
  highTopOfPageBidMicros: z.number().int().min(0).optional(),
  competitionIndex: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),
  costMicros: z.number().int().min(0).optional(),
  ctr: z.number().min(0).optional(),
  sourceQueries: z.array(z.string().min(1)).default([]),
});

export type GkpQueryMode = z.infer<typeof gkpQueryModeSchema>;
export type GkpQuerySnapshot = z.infer<typeof gkpQuerySnapshotSchema>;
export type GkpKeywordRecord = z.infer<typeof gkpKeywordRecordSchema>;

export function getGkpDir(): string {
  return gkpDir;
}

export function getGkpQueriesDir(): string {
  return queriesDir;
}

export function getGkpKeywordsDir(): string {
  return keywordsDir;
}

export function normalizeKeywordKey(keyword: string): string {
  return keyword
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-keyword';
}

export function computeGkpFingerprint(input: unknown): string {
  const stable = JSON.stringify(sortKeys(input));
  return createHash('sha256').update(stable).digest('hex');
}

export function isGkpQuerySnapshotFresh(snapshot: GkpQuerySnapshot, now: Date = new Date()): boolean {
  const savedAtMs = new Date(snapshot.savedAt).getTime();
  if (!Number.isFinite(savedAtMs)) {
    return false;
  }

  const ttlMs = snapshot.ttlDays * 24 * 60 * 60 * 1000;
  return savedAtMs + ttlMs > now.getTime();
}

export async function saveGkpQuerySnapshot(snapshot: Omit<GkpQuerySnapshot, 'version'>): Promise<GkpQuerySnapshot> {
  await mkdir(queriesDir, { recursive: true });
  const parsed = gkpQuerySnapshotSchema.parse({ version: 1, ...snapshot });
  const filePath = path.join(queriesDir, `${parsed.fingerprint}.json`);
  await writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return parsed;
}

export async function loadGkpQuerySnapshot(fingerprint: string): Promise<GkpQuerySnapshot | null> {
  try {
    const raw = await readFile(path.join(queriesDir, `${fingerprint}.json`), 'utf8');
    return gkpQuerySnapshotSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function listGkpQuerySnapshots(options?: {
  publication?: string;
  series?: string;
  search?: string;
  freshOnly?: boolean;
  staleOnly?: boolean;
  now?: Date;
}): Promise<GkpQuerySnapshot[]> {
  const snapshots = await readJsonCollection(queriesDir, gkpQuerySnapshotSchema);
  const now = options?.now ?? new Date();
  const search = options?.search?.trim().toLowerCase();

  return snapshots
    .filter((snapshot) => {
      if (options?.publication && snapshot.publication !== options.publication) {
        return false;
      }
      if (options?.series && snapshot.series !== options.series) {
        return false;
      }
      const isFresh = isGkpQuerySnapshotFresh(snapshot, now);
      if (options?.freshOnly && !isFresh) {
        return false;
      }
      if (options?.staleOnly && isFresh) {
        return false;
      }
      if (!search) {
        return true;
      }
      return buildSnapshotSearchText(snapshot).includes(search);
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveGkpKeywordRecord(record: Omit<GkpKeywordRecord, 'version'>): Promise<GkpKeywordRecord> {
  await mkdir(keywordsDir, { recursive: true });
  const parsed = gkpKeywordRecordSchema.parse({ version: 1, ...record });
  const filePath = path.join(keywordsDir, `${parsed.normalizedKeyword}.json`);
  await writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return parsed;
}

export async function loadGkpKeywordRecord(normalizedKeyword: string): Promise<GkpKeywordRecord | null> {
  try {
    const raw = await readFile(path.join(keywordsDir, `${normalizedKeyword}.json`), 'utf8');
    return gkpKeywordRecordSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function listGkpKeywordRecords(options?: {
  publication?: string;
  series?: string;
  search?: string;
}): Promise<GkpKeywordRecord[]> {
  const records = await readJsonCollection(keywordsDir, gkpKeywordRecordSchema);
  const search = options?.search?.trim().toLowerCase();

  return records
    .filter((record) => {
      if (options?.publication && record.publication !== options.publication) {
        return false;
      }
      if (options?.series && record.series !== options.series) {
        return false;
      }
      if (!search) {
        return true;
      }
      return `${record.keyword} ${record.publication ?? ''} ${record.series ?? ''}`.toLowerCase().includes(search);
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

async function readJsonCollection<T>(dirPath: string, schema: z.ZodSchema<T>): Promise<T[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const records: T[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      try {
        const raw = await readFile(path.join(dirPath, entry.name), 'utf8');
        records.push(schema.parse(JSON.parse(raw)));
      } catch {
        // Skip malformed files silently
      }
    }

    return records;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function buildSnapshotSearchText(snapshot: GkpQuerySnapshot): string {
  return [
    snapshot.mode,
    snapshot.publication ?? '',
    snapshot.series ?? '',
    snapshot.url ?? '',
    snapshot.site ?? '',
    snapshot.language ?? '',
    ...(snapshot.countryCodes ?? []),
    ...(snapshot.keywords ?? []),
  ].join(' ').toLowerCase();
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = sortKeys((value as Record<string, unknown>)[key]);
      return accumulator;
    }, {});
}