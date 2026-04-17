---
sidebar_position: 1
title: Overview
description: Overview documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Ideon Documentation

Ideon is an AI content writer that turns a raw idea into channel-specific, publish-ready content.

Use Ideon when you need to ship content across multiple formats quickly while keeping tone, structure, and quality consistent.

## What Ideon Does

- Writes multiple content types from one idea (article, blog, newsletter, Reddit, LinkedIn, X thread/X post, landing copy)
- Adapts writing for each channel while preserving run-level style consistency
- Builds planning context and drafts long-form structures for article-led runs
- Generates visuals for article-led outputs (cover and inline images)
- Enriches outputs with relevant links when enabled
- Produces reusable artifacts (`*.md`, `job.json`, `generation.analytics.json`, and shared assets)

## Why it matters

- Reduce time spent manually rewriting one idea for every channel
- Keep brand voice and editorial quality more consistent
- Move from brainstorm to publishable drafts in one repeatable workflow
- Iterate safely with dry runs, resumable sessions, and preview before publishing

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
