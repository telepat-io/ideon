---
title: Pipeline Stages
---

# Pipeline Stages

Ideon runs a five-stage pipeline with live status updates and per-stage analytics.

Stage execution is conditional:

- If `article` is requested, all five stages run.
- If no `article` target is requested, planning/sections/image-prompts/images are skipped and output generation runs with channel single-shot prompts.

## Stage Flow

1. Planning Article
2. Writing Sections
3. Expanding Image Prompts
4. Rendering Images
5. Writing Outputs

## Stage UI Signals

- `pending`: not started
- `running`: currently executing
- `succeeded`: completed successfully
- `failed`: errored with detail

## Updates During Execution

- Section stage reports active section index/title
- Image-prompt stage reports current prompt expansion
- Image-render stage reports current rendering progress
- Output stage reports generation progress and final generation directory
- When a stage reaches `succeeded`, the CLI prints stage analytics (duration and cost when available)

## Analytics Captured

For each generation run, Ideon records:

- Stage duration (ms) for all five stages
- Stage retry counts for external API calls
- Stage cost totals when pricing data is available
- Per-image prompt expansion call metrics (duration, retries, token usage, cost)
- Per-image render call metrics (duration, retries, output bytes, cost)

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

## Output Stage Behavior

- Requested targets are expanded into numbered files by content type (`article-1.md`, `x-1.md`, `x-2.md`, etc.).
- Article outputs use section-generation artifacts.
- Non-article outputs are generated in single-shot channel prompts.
- If article output exists in the run, non-article outputs can be anchored to generated article context.
- The output stage also writes `job.json` with the resolved run definition.
