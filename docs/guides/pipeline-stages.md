---
title: Pipeline Stages
description: Pipeline Stages documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Pipeline Stages

Ideon runs a seven-stage pipeline with live status updates and per-stage analytics.

Stage execution depends on primary content type:

- Article primary: full structured article flow (plan -> sections -> image prompts -> image rendering), then secondary generation.
- Non-article primary: generic primary flow (`Planning Primary Content` and `Generating Primary Content`), one primary cover image render, then secondary generation.

## Stage Flow

1. Planning Primary Article or Planning Primary Content
2. Writing Sections or Generating Primary Content
3. Expanding Image Prompts
4. Rendering Images
5. Generating Channel Content
6. Enriching Links

Always-on stage before primary planning:

1. Planning Shared Brief

Non-article primary path:

- `shared-brief`: runs
- `planning`: sets primary direction for non-article type
- `sections`: performs generic primary generation
- `image-prompts`, `images`: prepare and render one primary cover image
- `output`: generates only secondary outputs from primary anchor context
- `links`: runs only when `--enrich-links` is enabled and writes sidecar link metadata for eligible outputs

## Stage UI Signals

- `pending`: not started
- `running`: currently executing
- `succeeded`: completed successfully
- `failed`: errored with detail

The live TTY UI intentionally hides pending rows to keep output compact. It shows:

- currently running stage and item
- completed history
- failed rows
- retry context on stage detail when transient errors trigger retries (`retried Nx`, last retry error)

Item history is rendered with a terminal-adaptive window so long runs stay readable on short terminals while preserving the most recent progress.

## Updates During Execution

- Section stage reports active section index/title
- Image-prompt stage reports current prompt expansion
- Image-render stage reports current rendering progress
- Output stage reports secondary per-item generation progress and final generation directory
- Links stage reports per-item link enrichment and sidecar metadata writes
- When a stage reaches `succeeded`, the CLI prints stage analytics (duration and cost when available)
- Non-TTY/plain output also emits running-stage detail changes so retry/error progress is visible outside the interactive UI

For stages that produce multiple units of work, Ideon emits item-level status rows with the same state model (`pending`, `running`, `succeeded`, `failed`).

Examples:

- section writing item updates (`Introduction`, `Section 2/N`, `Conclusion`)
- secondary output item updates (`x post 1/10`, `linkedin post 2/3`)
- link enrichment item updates (`article-1`, `linkedin-1`)

Each item shows a spinner while running and prints item analytics as soon as it succeeds.

## Analytics Captured

For each generation run, Ideon records:

- Stage duration (ms) for all seven stages
- Stage retry counts for external API calls
- Stage cost totals when pricing data is available
- Per-image prompt expansion call metrics (duration, retries, token usage, cost)
- Per-image render call metrics (duration, retries, output bytes, cost)
- Per-output item call metrics (duration, retries, cost)
- Per-link-enrichment item call metrics (duration, retries, cost, phrase count)

Analytics are written to `generation.analytics.json` in each generation directory.

At pipeline completion, the CLI also shows aggregated totals for run duration, retry count, and total cost.
It also includes a stage-by-stage cost breakdown so you can see where spend occurred within the run.

## Failure Semantics

When a stage fails:

- Current running stage is marked failed with detail
- Completed stages remain succeeded
- Remaining stages stay pending
- Error bubbles to CLI with clean user-facing handling

## Resume Semantics

- Each completed stage checkpoint is persisted to `.ideon/write/state.json`.
- Checkpoints are scoped to the working directory where `ideon write` was executed.
- `ideon write resume` reloads saved artifacts and skips already-completed stages.
- Run resume from the same project directory, or restore that directory's `.ideon/` folder, to access prior checkpoints.
- Resume currently checkpoints at stage boundaries, so in-progress work inside a stage is retried from that stage.
- Resume is also allowed after a completed session to regenerate missing downstream artifacts from cached state.

## Interrupt Behavior

- `Ctrl+C` (SIGINT) and SIGTERM are recorded as a failed session when a write session exists.
- Ideon writes an interruption message into session state so `ideon write resume` can continue from the last completed stage.

## Dry-Run Behavior

- Stage orchestration still executes and analytics are emitted.
- External OpenRouter and Replicate calls are skipped.
- Output artifacts are still written so directory structure and orchestration can be validated without provider spend.

## Output Stage Behavior

- The primary output is always generated first and written as `<primary-prefix>-1.md`.
- Secondary targets are expanded into numbered files by content type (`x-thread-1.md`, `x-post-1.md`, etc.).
- Article primary uses section-generation artifacts; non-article primary uses single-shot primary generation.
- Secondary outputs are anchored to generated primary context.
- The output stage also writes `job.json` with the resolved run definition.
- Output progress is itemized in the CLI and persisted in analytics under `outputItemCalls`.

## Links Stage Behavior

- Link enrichment uses the configured model with OpenRouter web search plugin enabled.
- Link enrichment is a post-generation link-suggestion pass for eligible long-form markdown outputs.
- Ideon first selects linkable expressions, then resolves a best-fit URL for each expression using paragraph context.
- Link data is written to sidecar files next to markdown outputs (for example `article-1.links.json`).
- Source markdown files are preserved unchanged; the preview server applies sidecar links at render time.
- During `ideon write` and `ideon write resume`, this stage is opt-in via `--enrich-links`.
- Short-form channels (`x-post`, `x-thread`) are skipped by default for link enrichment.
