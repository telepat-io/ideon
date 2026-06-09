---
title: Output Structure
description: Output Structure documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Output Structure

Ideon writes one generation directory per run. Each generation directory contains one or more markdown outputs, a run-definition `job.json`, a per-run analytics artifact, a run-level model interaction artifact, a structured metadata sidecar (`meta.json`), and shared image assets.

Ideon also keeps local write-session artifacts in `.ideon/write/` (gitignored) for resume support.

## Default Paths

- Markdown directory: `/output`
- Asset directory: `/output/assets`
- Analytics file: `generation.analytics.json` inside each generation directory
- Model interactions file: `model.interactions.json` inside each generation directory
- Metadata sidecar: `meta.json` inside each generation directory
- Article plan file: `plan.md` inside each generation directory (for article-primary runs)

Paths beginning with `/output` are resolved relative to current working directory.

## Generation Directory Layout

Example:

```text
output/
  20260327-practical-ai-workflows/
    article-1.md
    x-thread-1.md
    x-post-1.md
    linkedin-1.md
    job.json
    plan.md
    meta.json
    generation.analytics.json
    model.interactions.json
    practical-ai-workflows-cover.webp
    practical-ai-workflows-inline-1.webp
```

Markdown files are numbered by content type prefix:

- `article-1.md`
- `blog-1.md`
- `x-thread-1.md`
- `x-post-1.md`
- `reddit-1.md`
- `linkedin-1.md`
- `newsletter-1.md`
- `landing-1.md`

## Article Markdown Contents

Generated Markdown includes:

- YAML frontmatter:
  - `title`
  - `subtitle`
  - `slug`
  - `description`
  - `keywords`
- H1 title and subtitle line
- Cover image embed (when present)
- Intro body
- Section bodies (H2 headings)
- Inline image embeds anchored to section positions
- Conclusion section

## Slug Behavior

Article slugs are normalized during planning. Generation directory names are timestamped and unique per run.

## Asset Links

Markdown embeds use relative paths from markdown file location to asset files.

## Analytics Artifact

Each generation run emits `generation.analytics.json` inside the generation directory.

The JSON includes:

- Run summary: total duration, total retries, and total cost (when available)
- Stage metrics: per-stage duration, retries, and stage-level cost
- Image prompt calls: per-image prompt expansion timing/cost + token usage (when available)
- Image render calls: per-image render timing/cost + output byte size
- SEO check calls: per editor-agent loop turn with operation ID (`seo-check:editor-agent:turn-N`), timing/cost, token usage, and tool names requested on that turn

To inspect generated markdown and image embeds in a browser, run `ideon preview`.

## Model Interaction Artifact

Each generation run also emits `model.interactions.json` inside the generation directory.

The JSON includes:

- Run envelope: `runId`, `runMode`, `dryRun`, `startedAt`, `endedAt`
- `llmCalls`: one record per OpenRouter attempt with stage/operation IDs, request type, raw serialized request body, raw response body, timing, attempts/retries, and terminal status
- `editorToolCalls`: one record per local SEO editor tool execution with turn index, tool name, arguments, JSON result, and timing (no LLM cost)
- `t2iCalls`: one record per image render attempt with stage/operation IDs, raw prompt, resolved T2I input payload, timing, retries, and terminal status

This artifact is intended for prompt engineering and failure analysis, so payloads are intentionally kept raw.

## Job Definition Artifact

Each run also emits `job.json` in the generation directory. It captures the resolved run definition:

- `idea` and `prompt` used for the run
- optional `targetAudience` seed when provided (or when inherited from a job file)
- resolved `contentTargets` and `style`
- full resolved `settings` object (including current and future settings fields)
- source job payload when provided (`sourceJob`)
- run metadata (`generatedAt`, `dryRun`, `runMode`)

Example shape:

```json
{
  "idea": "How teams can operationalize content systems",
  "prompt": "How teams can operationalize content systems",
  "targetAudience": "Content operators building repeatable publishing systems",
  "settings": {
    "model": "deepseek/deepseek-v4-pro",
    "modelSettings": { "temperature": 0.7, "maxTokens": 4000, "topP": 1 },
    "modelRequestTimeoutMs": 90000,
    "t2i": { "modelId": "black-forest-labs/flux-schnell", "inputOverrides": {} },
    "markdownOutputDir": "/output",
    "assetOutputDir": "/output/assets",
    "contentTargets": [{ "contentType": "article", "role": "primary", "count": 1 }],
    "style": "professional"
  },
  "sourceJob": null,
  "generatedAt": "2026-03-27T10:20:00.000Z",
  "dryRun": false,
  "runMode": "fresh"
}
```

## Metadata Sidecar (`meta.json`)

Each generation run emits a structured `meta.json` sidecar inside the generation directory. It consolidates content-level metadata in a single machine-readable file.

The JSON includes:

- `version`: schema version (currently `1`)
- `title`, `slug`, `idea`, `description`: core content metadata
- `subtitle`, `keywords`, `angle`: long-form article metadata (nullable when absent)
- `contentType`, `style`, `intent`, `targetLength`: generation settings
- `cover`: cover image metadata (`path`, `relativePath`, `description`) or `null`
- `sections`: array of section titles and descriptions (empty for short-form content)
- `images`: array of all rendered images (cover and inline) with paths, descriptions, and anchor positions
- `outputs`: array of all markdown output files with content types and paths
- `seoCheck` (when present): lint outcome (`passed` follows `seoCheckMode`), `seoCheckMode`, `warningsRemaining`, full `issues[]`, editor turn count, and editor pass cost summary
- `author` (when present): resolved author slug for the run
- `editorialChecklist`: dynamic pre-publish checklist (byline, AI disclosure, author assignment, placeholders, stat verification, helpful-content self-assessment)
- `generatedAt`: ISO timestamp
- `generationDir`: absolute path to the generation directory

Example shape:

```json
{
  "version": 1,
  "title": "How teams can operationalize content systems",
  "slug": "operationalize-content-systems",
  "idea": "How teams can operationalize content systems",
  "description": "A practical guide to building repeatable content operations.",
  "subtitle": "From one-off posts to predictable publishing pipelines",
  "keywords": ["content ops", "publishing", "automation"],
  "contentType": "article",
  "style": "professional",
  "intent": "tutorial",
  "targetLength": "medium",
  "angle": "Process-first perspective",
  "cover": {
    "path": "/Users/you/.ideon/output/20260327-slug/cover-1.png",
    "relativePath": "cover-1.png",
    "description": "A clean editorial workspace with content calendars"
  },
  "sections": [
    { "title": "Audit your current workflow", "description": "Map existing steps and bottlenecks." },
    { "title": "Design the pipeline", "description": "Choose tools and handoff points." }
  ],
  "images": [
    {
      "id": "cover",
      "kind": "cover",
      "path": "/Users/you/.ideon/output/20260327-slug/cover-1.png",
      "relativePath": "cover-1.png",
      "description": "A clean editorial workspace with content calendars",
      "anchorAfterSection": null
    },
    {
      "id": "inline-1",
      "kind": "inline",
      "path": "/Users/you/.ideon/output/20260327-slug/inline-1-2.png",
      "relativePath": "inline-1-2.png",
      "description": "Pipeline diagram",
      "anchorAfterSection": 1
    }
  ],
  "outputs": [
    {
      "fileId": "article-1",
      "contentType": "article",
      "path": "/Users/you/.ideon/output/20260327-slug/article-1.md",
      "relativePath": "article-1.md"
    },
    {
      "fileId": "x-post-1",
      "contentType": "x-post",
      "path": "/Users/you/.ideon/output/20260327-slug/x-post-1.md",
      "relativePath": "x-post-1.md"
    }
  ],
  "generatedAt": "2026-03-27T10:20:00.000Z",
  "generationDir": "/Users/you/.ideon/output/20260327-slug"
}
```

`meta.json` is also copied by `ideon export` alongside the exported markdown and images.

## Local Session Artifacts

- Session state file: `~/.ideon/sessions/<project-hash>/state.json` (OS-specific config directory)
- Includes saved stage outputs (plan, section drafts, image metadata, final artifact summary)
- Fresh runs overwrite previous session artifacts
- `ideon write resume` uses this state to continue after failures or interruptions
- Session state is stored in the user's home config directory, keyed by a hash of the project path

Directory scope examples:

- Running in `~/project-a` creates and resumes state from the same session regardless of current directory
- Running in `~/project-b` uses a separate session keyed by its own project path
- Legacy `.ideon/write/state.json` files are automatically migrated on first resume

Key state fields:

- `status`: `running`, `failed`, or `completed`
- `lastCompletedStage`: last checkpointed stage ID
- `failedStage` and `errorMessage`: latest failure metadata
- `plan`, `text`, `imagePrompts`, `imageArtifacts`: cached stage artifacts used by resume
- `artifact`: final output summary (`markdownPaths`, `generationDir`, `analyticsPath`, `interactionsPath`, and counts)
