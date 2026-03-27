---
title: Pipeline Stages
---

# Pipeline Stages

Ideon runs a five-stage pipeline with live status updates and per-stage analytics.

## Stage Flow

1. Planning Article
2. Writing Sections
3. Expanding Image Prompts
4. Rendering Images
5. Assembling Markdown

## Stage UI Signals

- `pending`: not started
- `running`: currently executing
- `succeeded`: completed successfully
- `failed`: errored with detail

## Updates During Execution

- Section stage reports active section index/title
- Image-prompt stage reports current prompt expansion
- Image-render stage reports current rendering progress
- Output stage reports markdown assembly and final path
- When a stage reaches `succeeded`, the CLI prints stage analytics (duration and cost when available)

## Analytics Captured

For each write operation, Ideon records:

- Stage duration (ms) for all five stages
- Stage retry counts for external API calls
- Stage cost totals when pricing data is available
- Per-image prompt expansion call metrics (duration, retries, token usage, cost)
- Per-image render call metrics (duration, retries, output bytes, cost)

Analytics are written to `<slug>.analytics.json` in the markdown output directory.

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
