---
sidebar_position: 1
title: Overview
---

# Ideon Documentation

Ideon helps you convert a raw idea into a polished Markdown article with generated imagery and frontmatter metadata.

## What Ideon Does

- Plans article structure and editorial angle
- Drafts intro, sections, and conclusion
- Expands image descriptions into render-ready prompts
- Renders cover and inline images using selected T2I models
- Writes final Markdown with relative asset embeds

## Who This Documentation Is For

- Operators and writers who want to run Ideon quickly
- Engineers integrating Ideon into scripted or CI workflows
- Contributors extending pipeline stages, models, and docs

## Fast Links

- [Installation](./installation.md)
- [Quickstart](./quickstart.md)
- [Configuration Guide](../guides/configuration.md)
- [CLI Reference](../reference/cli-reference.md)
- [Technical Architecture](../technical/architecture.md)
- [Contributing](../contributing/development.md)

## Required Services for Live Runs

- OpenRouter API key
- Replicate API token

If you only want to test end-to-end orchestration, use `--dry-run` to avoid external API calls.
