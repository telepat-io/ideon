---
slug: /
title: Ideon
sidebar_label: Welcome
sidebar_position: 0
---

```
ooooo oooooooooo.   oooooooooooo   .oooooo.   ooooo      ooo
`888' `888'   `Y8b  `888'     `8  d8P'  `Y8b  `888b.     `8'
 888   888      888  888         888      888  8 `88b.    8
 888   888      888  888oooo8    888      888  8   `88b.  8
 888   888      888  888    "    888      888  8     `88b.8
 888   888     d88'  888       o `88b    d88'  8       `888
o888o o888bood8P'   o888ooooood8  `Y8bood8P'  o8o        `8
```

Ideon converts a raw idea into a complete content generation run with one or more outputs (article, social, newsletter, landing copy) from a single CLI command.

## Quickstart

```bash
npm install
npm run dev -- write --idea "Why async Rust is worth learning" --target article=1 --target x-post=3 --style technical
```

See [Installation](./getting-started/installation.md) and [Quickstart](./getting-started/quickstart.md) for full setup including credentials.

## What Ideon produces

- One generation directory per run (timestamp + slug)
- One or more markdown outputs (`article-1.md`, `x-1.md`, etc.)
- `job.json` run definition metadata for reproducibility
- `generation.analytics.json` with stage and run metrics
- Shared image assets rendered via a Replicate T2I model when article output is included

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
