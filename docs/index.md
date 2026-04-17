---
slug: /
title: Ideon
description: Ideon documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
sidebar_label: Welcome
sidebar_position: 0
---

> AI content writer for multi-channel publishing

Ideon turns one idea into multiple publish-ready outputs with consistent style, optional visuals, and research-enriched links.

It is designed for teams who need to ship high-quality content across channels without manually rewriting everything for each format.

## Why Ideon

- Write many formats from one idea: article, blog post, newsletter, Reddit post, LinkedIn post, X thread, X post, and landing-page copy.
- Keep voice consistent with style controls across all outputs.
- Add depth with planning briefs, link enrichment, and generated images for article-led runs.
- Iterate quickly with resumable runs, job files, and local preview.

## Quickstart

```bash
npm i -g @telepat/ideon
ideon write "Why async Rust is worth learning" --primary article=1 --secondary x-thread=2 --secondary x-post=1 --style technical
```

See [Installation](./getting-started/installation.md) and [Quickstart](./getting-started/quickstart.md) for full setup including credentials.

## What Ideon produces

- One generation directory per run (timestamp + slug)
- One or more markdown outputs (`article-1.md`, `x-thread-1.md`, `x-post-1.md`, etc.)
- `job.json` run definition metadata for reproducibility
- `generation.analytics.json` with stage and run metrics
- Shared image assets rendered via a Replicate T2I model for the primary output (article primary includes inline images)

## Documentation

| Section | What's inside |
|---|---|
| [Getting Started](./getting-started/installation.md) | Install, configure credentials, run first multi-output generation |
| [Guides](./guides/configuration.md) | Configuration, writing framework, job files, pipeline stages, output structure |
| [Reference](./reference/cli-reference.md) | CLI flags, content targets, styles, environment variables, supported T2I models |
| [Technical](./technical/architecture.md) | Architecture, LLM/image pipeline, testing |
| [Contributing](./contributing/development.md) | Dev setup, adding models/stages/settings, releasing |

## Required credentials

- **OpenRouter API key** — for LLM calls (planning, article writing, channel outputs)
- **Replicate API token** — for image rendering

Store them interactively: `ideon settings` — or set `IDEON_OPENROUTER_API_KEY` / `IDEON_REPLICATE_API_TOKEN` as environment variables.

Use `--dry-run` to test pipeline orchestration without making API calls.
