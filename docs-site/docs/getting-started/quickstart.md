---
sidebar_position: 3
title: Quickstart
---

# Quickstart

This guide gets you from zero to your first multi-output generation run.

## 1. Configure Settings and Secrets

```bash
npm run dev -- settings
```

Inside settings, configure:

- LLM model and model settings
- T2I model and optional input overrides
- Output directories
- OpenRouter API key
- Replicate API token

## 2. Generate Content Outputs

```bash
npm run dev -- write "How small editorial teams can productionize AI writing" --target article=1 --target x-thread=1 --target x-post=1 --style professional
```

Expected stages:

1. Planning Article
2. Writing Sections
3. Expanding Image Prompts
4. Rendering Images
5. Assembling Markdown

If you run without an `article` target, Ideon skips planning/sections/image stages and generates only requested channel outputs in the output stage.

## 3. Check Outputs

By default (resolved from current working directory):

- Generation directories: `output/<timestamp>-<slug>/`
- Markdown files: `article-1.md`, `x-thread-1.md`, `x-post-1.md`, ...
- Run metadata: `job.json`
- Run analytics: `generation.analytics.json`
- Shared generation assets: image files in the same generation directory

You can open the latest generation in browser preview:

```bash
npm run preview
```

Preview includes generation-level browsing, content-type tabs, and per-variant subtabs.

## 4. Run a Safe Dry Run

```bash
npm run dev -- write --dry-run "How AI changes developer docs workflows"
```

Dry run keeps the full pipeline flow but skips OpenRouter and Replicate API calls while still producing generation artifacts.

## 5. Run with a Job File

```bash
npm run dev -- write --job ./job.json
```

See [Job Files](../guides/job-files.md) for full schema and examples.

## Next Steps

- See [Pipeline Stages](../guides/pipeline-stages.md) for resume and checkpoint behavior.
- See [Local Preview](../guides/local-preview.md) for generation browsing details.
- See [Troubleshooting](../guides/troubleshooting.md) for recovery paths.
