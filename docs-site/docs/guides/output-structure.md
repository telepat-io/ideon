---
title: Output Structure
---

# Output Structure

Ideon writes one generation directory per run. Each generation directory contains one or more markdown outputs, a run-definition `job.json`, a per-run analytics artifact, and shared image assets.

Ideon also keeps local write-session artifacts in `.ideon/write/` (gitignored) for resume support.

## Default Paths

- Markdown directory: `/output`
- Asset directory: `/output/assets`
- Analytics file: `generation.analytics.json` inside each generation directory

Paths beginning with `/output` are resolved relative to current working directory.

## Generation Directory Layout

Example:

```text
output/
  20260327-practical-ai-workflows/
    article-1.md
    x-1.md
    x-2.md
    linkedin-1.md
    job.json
    generation.analytics.json
    practical-ai-workflows-cover.webp
    practical-ai-workflows-inline-1.webp
```

Markdown files are numbered by content type prefix:

- `article-1.md`
- `blog-1.md`
- `x-1.md`
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

To inspect generated markdown and image embeds in a browser, run `npm run preview`.

## Job Definition Artifact

Each run also emits `job.json` in the generation directory. It captures the resolved run definition:

- `idea` and `prompt` used for the run
- resolved `contentTargets` and `style`
- full resolved `settings` object (including current and future settings fields)
- source job payload when provided (`sourceJob`)
- run metadata (`generatedAt`, `dryRun`, `runMode`)

## Local Session Artifacts

- Session state file: `.ideon/write/state.json`
- Includes saved stage outputs (plan, section drafts, image metadata, final artifact summary)
- Fresh runs overwrite previous `.ideon/write` artifacts
- `ideon write resume` uses this state to continue after failures or interruptions
