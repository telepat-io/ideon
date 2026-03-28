---
title: Pipeline Stages
---

# Pipeline Stages

Ideon runs a six-stage pipeline with live status updates and per-stage analytics.

Stage execution is conditional:

- If `article` is requested, all six stages run.
- If no `article` target is requested, planning/sections/image-prompts/images are skipped and output generation runs with channel single-shot prompts.

## Stage Flow

1. Planning Article
2. Writing Sections
3. Expanding Image Prompts
4. Rendering Images
5. Assembling Markdown

Always-on stage before article planning:

1. Planning Shared Brief

Non-article path:

- If `article` is not requested, stages 1-4 are marked succeeded as skipped and stage 5 generates requested channel outputs directly from single-shot prompts.

With the shared brief stage included, the effective non-article path is:

- `shared-brief`: runs
- `planning`, `sections`, `image-prompts`, `images`: marked succeeded as skipped
- `output`: runs with channel-only generation

## Stage UI Signals

- `pending`: not started
- `running`: currently executing
- `succeeded`: completed successfully
- `failed`: errored with detail

The live TTY UI intentionally hides pending rows to keep output compact. It shows:

- currently running stage and item
- completed history
- failed rows

Item history is rendered with a terminal-adaptive window so long runs stay readable on short terminals while preserving the most recent progress.

## Updates During Execution

- Section stage reports active section index/title
- Image-prompt stage reports current prompt expansion
- Image-render stage reports current rendering progress
- Output stage reports per-item generation progress and final generation directory
- When a stage reaches `succeeded`, the CLI prints stage analytics (duration and cost when available)

For stages that produce multiple units of work, Ideon emits item-level status rows with the same state model (`pending`, `running`, `succeeded`, `failed`).

Examples:

- section writing item updates (`Introduction`, `Section 2/N`, `Conclusion`)
- channel output item updates (`x post 1/10`, `linkedin post 2/3`)

Each item shows a spinner while running and prints item analytics as soon as it succeeds.

## Analytics Captured

For each generation run, Ideon records:

- Stage duration (ms) for all six stages
- Stage retry counts for external API calls
- Stage cost totals when pricing data is available
- Per-image prompt expansion call metrics (duration, retries, token usage, cost)
- Per-image render call metrics (duration, retries, output bytes, cost)
- Per-output item call metrics (duration, retries, cost)

Analytics are written to `generation.analytics.json` in each generation directory.

At pipeline completion, the CLI also shows aggregated totals for run duration, retry count, and total cost.

## Failure Semantics

When a stage fails:

- Current running stage is marked failed with detail
- Completed stages remain succeeded
- Remaining stages stay pending
- Error bubbles to CLI with clean user-facing handling

## Resume Semantics

- Each completed stage checkpoint is persisted to `.ideon/write/state.json`.
- `ideon write resume` reloads saved artifacts and skips already-completed stages.
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

- Requested targets are expanded into numbered files by content type (`article-1.md`, `x-thread-1.md`, `x-post-1.md`, etc.).
- Article outputs use section-generation artifacts.
- Non-article outputs are generated in single-shot channel prompts.
- If article output exists in the run, non-article outputs can be anchored to generated article context.
- The output stage also writes `job.json` with the resolved run definition.
- Output progress is itemized in the CLI and persisted in analytics under `outputItemCalls`.
