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

Ideon converts a raw idea into a complete Markdown article — with planned sections, written prose, and generated imagery — from a single CLI command.

## Quickstart

```bash
npm install
npm run dev -- write --idea "Why async Rust is worth learning"
```

See [Installation](./getting-started/installation.md) and [Quickstart](./getting-started/quickstart.md) for full setup including credentials.

## What Ideon produces

- A Markdown file with title, subtitle, keywords, intro, sections, and conclusion
- A cover image and inline images rendered via a Replicate T2I model
- All assets written to a configurable output directory

## Documentation

| Section | What's inside |
|---|---|
| [Getting Started](./getting-started/installation.md) | Install, configure credentials, run first article |
| [Guides](./guides/configuration.md) | Configuration, job files, pipeline stages, output structure |
| [Reference](./reference/cli-reference.md) | CLI flags, environment variables, supported T2I models |
| [Technical](./technical/architecture.md) | Architecture, LLM/image pipeline, testing |
| [Contributing](./contributing/development.md) | Dev setup, adding models/stages/settings, releasing |

## Required credentials

- **OpenRouter API key** — for LLM calls (article planning and writing)
- **Replicate API token** — for image rendering

Store them interactively: `ideon settings` — or set `IDEON_OPENROUTER_API_KEY` / `IDEON_REPLICATE_API_TOKEN` as environment variables.

Use `--dry-run` to test pipeline orchestration without making API calls.
