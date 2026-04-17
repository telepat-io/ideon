---
sidebar_position: 3
title: Quickstart
description: Quickstart documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Quickstart

This guide gets you from zero to your first multi-output content-writing run.

By the end, you will have a publish-ready content set, generated assets, and a preview workflow you can iterate on.

## 1. Configure Settings and Secrets

```bash
ideon settings
```

Inside settings, configure:

- LLM model and model settings
- T2I model and optional input overrides
- Output directories
- OpenRouter API key
- Replicate API token

## 2. Generate Content Outputs

```bash
ideon write "How small editorial teams can productionize AI writing" --primary article=1 --secondary x-thread=1 --secondary x-post=1 --style professional
```

Expected stages for article primary:

1. Planning Shared Brief
2. Planning Primary Article
3. Writing Sections
4. Expanding Image Prompts
5. Rendering Images
6. Generating Channel Content
7. Enriching Links

If primary is not `article`, Ideon uses `Planning Primary Content` and `Generating Primary Content`, renders one primary cover image, and then generates secondary outputs.

## 3. Check Outputs

By default (resolved from current working directory):

- Generation directories: `output/<timestamp>-<slug>/`
- Markdown files: `article-1.md`, `x-thread-1.md`, `x-post-1.md`, ...
- Run metadata: `job.json`
- Run analytics: `generation.analytics.json`
- Shared generation assets: image files in the same generation directory

Typical first-run value:

- One idea expanded into multiple channel-ready drafts
- A consistent style applied across all outputs
- Structured run artifacts you can reuse in later iterations

You can open the latest generation in browser preview:

```bash
ideon preview
```

Preview includes generation-level browsing, content-type tabs, and per-variant subtabs.

## 4. Run a Safe Dry Run

```bash
ideon write --dry-run "How AI changes developer docs workflows"
```

Dry run keeps the full pipeline flow but skips OpenRouter and Replicate API calls while still producing generation artifacts.

## 5. Run with a Job File

```bash
ideon write --job ./job.json
```

See [Job Files](../guides/job-files.md) for full schema and examples.

## Next Steps

- See [Pipeline Stages](../guides/pipeline-stages.md) for resume and checkpoint behavior.
- See [Local Preview](../guides/local-preview.md) for generation browsing details.
- See [Troubleshooting](../guides/troubleshooting.md) for recovery paths.
