---
title: Output Structure
description: Output Structure documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Output Structure

Ideon writes one generation directory per run. Each generation directory contains one or more markdown outputs, a run-definition `job.json`, a per-run analytics artifact, a run-level model interaction artifact, and shared image assets.

Ideon also keeps local write-session artifacts in `.ideon/write/` (gitignored) for resume support.

## Default Paths

- Markdown directory: `/output`
- Asset directory: `/output/assets`
- Analytics file: `generation.analytics.json` inside each generation directory
- Model interactions file: `model.interactions.json` inside each generation directory

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

To inspect generated markdown and image embeds in a browser, run `ideon preview`.

## Model Interaction Artifact

Each generation run also emits `model.interactions.json` inside the generation directory.

The JSON includes:

- Run envelope: `runId`, `runMode`, `dryRun`, `startedAt`, `endedAt`
- `llmCalls`: one record per OpenRouter attempt with stage/operation IDs, request type, raw serialized request body, raw response body, timing, attempts/retries, and terminal status
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
    "model": "moonshotai/kimi-k2.5",
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

## Local Session Artifacts

- Session state file: `.ideon/write/state.json`
- Includes saved stage outputs (plan, section drafts, image metadata, final artifact summary)
- Fresh runs overwrite previous `.ideon/write` artifacts
- `ideon write resume` uses this state to continue after failures or interruptions
- Session state is directory-scoped: Ideon reads and writes `.ideon/write/state.json` under the directory where you run the command

Directory scope examples:

- Running in `~/project-a` creates and resumes state from `~/project-a/.ideon/write/state.json`
- Running in `~/project-b` uses `~/project-b/.ideon/write/state.json` and cannot see `project-a` state
- If you move a project, keep its `.ideon/` directory with it; otherwise resume state is not found until restored or regenerated

Key state fields:

- `status`: `running`, `failed`, or `completed`
- `lastCompletedStage`: last checkpointed stage ID
- `failedStage` and `errorMessage`: latest failure metadata
- `plan`, `text`, `imagePrompts`, `imageArtifacts`: cached stage artifacts used by resume
- `artifact`: final output summary (`markdownPaths`, `generationDir`, `analyticsPath`, `interactionsPath`, and counts)
