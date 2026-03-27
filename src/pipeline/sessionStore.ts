import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { appSettingsSchema, jobInputSchema, type AppSettings, type JobInput, type ResolvedPaths } from '../config/schema.js';
import { articlePlanSchema } from '../types/articleSchema.js';
import { contentBriefSchema } from '../types/contentBriefSchema.js';
import type { ArticleImagePrompt, GeneratedArticleSection, RenderedArticleImage } from '../types/article.js';
import type { ContentBrief } from '../types/contentBrief.js';
import type { PipelineArtifactSummary } from './events.js';

const STAGE_IDS = ['shared-brief', 'planning', 'sections', 'image-prompts', 'images', 'output'] as const;

const generatedArticleSectionSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

const imagePromptSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['cover', 'inline']),
  prompt: z.string().min(1),
  description: z.string().min(1),
  anchorAfterSection: z.number().int().positive().nullable(),
});

const renderedImageSchema = imagePromptSchema.extend({
  outputPath: z.string().min(1),
  relativePath: z.string().min(1),
});

const pipelineArtifactSummarySchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  sectionCount: z.number().int().nonnegative(),
  imageCount: z.number().int().nonnegative(),
  outputCount: z.number().int().positive().default(1),
  generationDir: z.string().min(1).default(''),
  markdownPaths: z.array(z.string().min(1)).default([]),
  markdownPath: z.string().min(1),
  assetDir: z.string().min(1),
  analyticsPath: z.string().min(1).default('unknown.analytics.json'),
});

const resolvedPathsSchema = z.object({
  markdownOutputDir: z.string().min(1),
  assetOutputDir: z.string().min(1),
});

const writeSessionStateSchema = z.object({
  version: z.literal(1),
  status: z.enum(['running', 'failed', 'completed']),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  idea: z.string().min(1),
  job: jobInputSchema.nullable(),
  settings: appSettingsSchema,
  dryRun: z.boolean(),
  outputPaths: resolvedPathsSchema,
  lastCompletedStage: z.enum(STAGE_IDS).nullable(),
  failedStage: z.enum(STAGE_IDS).nullable(),
  errorMessage: z.string().nullable(),
  contentBrief: contentBriefSchema.nullable().default(null),
  plan: articlePlanSchema.nullable(),
  text: z
    .object({
      intro: z.string().min(1),
      sections: z.array(generatedArticleSectionSchema),
      outro: z.string().min(1),
    })
    .nullable(),
  imagePrompts: z.array(imagePromptSchema).nullable().default(null),
  imageArtifacts: z
    .object({
      imagePrompts: z.array(imagePromptSchema),
      renderedImages: z.array(renderedImageSchema),
    })
    .nullable(),
  artifact: pipelineArtifactSummarySchema.nullable(),
});

type WriteSessionStateSchema = z.infer<typeof writeSessionStateSchema>;

export interface WriteSessionSeed {
  idea: string;
  job: JobInput | null;
  settings: AppSettings;
  dryRun: boolean;
  outputPaths: ResolvedPaths;
}

export interface WriteSessionPatch {
  status?: 'running' | 'failed' | 'completed';
  lastCompletedStage?: WriteStageId | null;
  failedStage?: WriteStageId | null;
  errorMessage?: string | null;
  contentBrief?: WriteSessionState['contentBrief'] | null;
  plan?: WriteSessionState['plan'] | null;
  text?: WriteSessionState['text'] | null;
  imagePrompts?: WriteSessionState['imagePrompts'] | null;
  imageArtifacts?: WriteSessionState['imageArtifacts'] | null;
  artifact?: PipelineArtifactSummary | null;
}

export type WriteStageId = (typeof STAGE_IDS)[number];

export interface WriteSessionState extends WriteSessionStateSchema {
  contentBrief: ContentBrief | null;
  plan: z.infer<typeof articlePlanSchema> | null;
  text: {
    intro: string;
    sections: GeneratedArticleSection[];
    outro: string;
  } | null;
  imagePrompts: ArticleImagePrompt[] | null;
  imageArtifacts: {
    imagePrompts: ArticleImagePrompt[];
    renderedImages: RenderedArticleImage[];
  } | null;
  artifact: PipelineArtifactSummary | null;
}

function resolveWriteRoot(workingDir: string): string {
  return path.join(workingDir, '.ideon', 'write');
}

function resolveStateFilePath(workingDir: string): string {
  return path.join(resolveWriteRoot(workingDir), 'state.json');
}

export async function startFreshWriteSession(seed: WriteSessionSeed, workingDir: string = process.cwd()): Promise<WriteSessionState> {
  const writeRoot = resolveWriteRoot(workingDir);
  await rm(writeRoot, { recursive: true, force: true });
  await mkdir(writeRoot, { recursive: true });

  const timestamp = new Date().toISOString();
  const state: WriteSessionState = {
    version: 1,
    status: 'running',
    createdAt: timestamp,
    updatedAt: timestamp,
    idea: seed.idea,
    job: seed.job,
    settings: seed.settings,
    dryRun: seed.dryRun,
    outputPaths: seed.outputPaths,
    lastCompletedStage: null,
    failedStage: null,
    errorMessage: null,
    contentBrief: null,
    plan: null,
    text: null,
    imagePrompts: null,
    imageArtifacts: null,
    artifact: null,
  };

  await saveWriteSession(state, workingDir);
  return state;
}

export async function loadWriteSession(workingDir: string = process.cwd()): Promise<WriteSessionState | null> {
  const statePath = resolveStateFilePath(workingDir);

  try {
    const raw = await readFile(statePath, 'utf8');
    return writeSessionStateSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function saveWriteSession(state: WriteSessionState, workingDir: string = process.cwd()): Promise<WriteSessionState> {
  const next = writeSessionStateSchema.parse({
    ...state,
    updatedAt: new Date().toISOString(),
  });

  const statePath = resolveStateFilePath(workingDir);
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export async function patchWriteSession(patch: WriteSessionPatch, workingDir: string = process.cwd()): Promise<WriteSessionState> {
  const existing = await loadWriteSession(workingDir);
  if (!existing) {
    throw new Error('No active write session found in .ideon/write/state.json. Start a fresh write first.');
  }

  const has = <K extends keyof WriteSessionPatch>(key: K): boolean => Object.hasOwn(patch, key);

  const merged: WriteSessionState = {
    ...existing,
    ...patch,
    status: has('status') ? patch.status ?? existing.status : existing.status,
    lastCompletedStage: has('lastCompletedStage') ? patch.lastCompletedStage ?? null : existing.lastCompletedStage,
    failedStage: has('failedStage') ? patch.failedStage ?? null : existing.failedStage,
    errorMessage: has('errorMessage') ? patch.errorMessage ?? null : existing.errorMessage,
    contentBrief: has('contentBrief') ? patch.contentBrief ?? null : existing.contentBrief,
    plan: has('plan') ? patch.plan ?? null : existing.plan,
    text: has('text') ? patch.text ?? null : existing.text,
    imagePrompts: has('imagePrompts') ? patch.imagePrompts ?? null : existing.imagePrompts,
    imageArtifacts: has('imageArtifacts') ? patch.imageArtifacts ?? null : existing.imageArtifacts,
    artifact: has('artifact') ? patch.artifact ?? null : existing.artifact,
  };

  return saveWriteSession(merged, workingDir);
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
