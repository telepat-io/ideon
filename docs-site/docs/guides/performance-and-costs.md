---
title: Performance and Costs
---

# Performance and Costs

Use this guide to balance output quality, run time, and provider spend.

## What Drives Cost

Primary drivers:

- Number of requested outputs (`contentTargets` counts)
- Model choice for text and image generation
- Retries caused by transient provider failures
- Higher token budgets (`maxTokens`) for long outputs

You can inspect per-run totals in `generation.analytics.json`.

## What Drives Runtime

Primary drivers:

- Total output count and mix of content types
- Whether `article` is requested (enables planning/sections/image stages)
- Image model speed and retry behavior
- Network latency and provider backoff windows

Article-inclusive runs execute all five stages; channel-only runs skip article/image stages.

## Cost-Control Patterns

1. Validate with dry-run first:

```bash
ideon write --dry-run "Your idea" --target article=1 --target x-post=2
```

2. Start with fewer variants, then scale:

```bash
ideon write "Your idea" --target article=1 --target x-post=1
```

3. Use job files for repeatable experiments and adjust one variable at a time.

4. Prefer faster models during exploration, then switch to quality-focused models for final runs.

## Runtime-Control Patterns

1. Keep `contentTargets` tight in early iterations.
2. Use `x-post=thread` only when thread structure is truly needed.
3. Resume interrupted runs instead of restarting from scratch:

```bash
ideon write resume
```

4. If a run repeatedly fails at one stage, diagnose with [Troubleshooting](./troubleshooting.md) before increasing target counts.

## Practical Workflow

1. Run dry-run and confirm orchestration and outputs.
2. Run a low-count live generation.
3. Inspect markdown quality and `generation.analytics.json`.
4. Increase counts or switch models.
5. Save the resolved `job.json` for reproducible future runs.

## Related Guides

- [Configuration](./configuration.md)
- [Job Files](./job-files.md)
- [Pipeline Stages](./pipeline-stages.md)
- [T2I Models](../reference/t2i-models.md)
