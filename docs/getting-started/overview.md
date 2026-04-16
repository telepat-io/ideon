---
sidebar_position: 1
title: Overview
description: Overview documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Ideon Documentation

Ideon helps you convert a raw idea into a complete generation run with channel-specific outputs and optional generated imagery.

## What Ideon Does

- Plans article structure and editorial angle when article output is requested
- Drafts intro, sections, and conclusion for article outputs
- Generates non-article outputs (X/LinkedIn/Reddit/newsletter/landing/blog) via channel-native prompts
- Applies a run-level writing style overlay across all outputs
- Expands image descriptions and renders cover/inline images for article-enabled generation runs
- Writes generation artifacts (markdown files, `job.json`, `generation.analytics.json`, shared assets)

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
