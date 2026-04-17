---
sidebar_position: 1
title: Documentation Intro
description: Documentation Intro documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Documentation Intro

Ideon is a content-writing CLI that helps you transform one idea into many channel-ready outputs with consistent style and production-friendly artifacts.

This documentation explains what Ideon is, why teams use it, and how to run it effectively in local, CI, and agent workflows.

## What Ideon is best at

- Multi-format writing from one source idea.
- Channel-specific output generation (articles, social, newsletter, landing-page copy, and more).
- Style consistency across outputs in a single run.
- Research-informed planning, optional link enrichment, and generated visuals for article-led runs.
- Iterative workflows via reruns, resume support, and local preview.

## Start Here

- New user setup: [Getting Started](./getting-started/installation.md)
- First run walkthrough: [Quickstart](./getting-started/quickstart.md)
- CLI options and flags: [CLI Reference](./reference/cli-reference.md)

## Core Concepts

- Content targets: choose exactly one primary output type plus optional secondary output types per run
- Style overlay: apply one run-level style to all outputs
- Generation directory: each run writes markdown outputs, shared assets, `job.json`, and `generation.analytics.json`
- Conditional stages: article primary runs use structured article flow; non-article primary runs use generic primary generation with one cover image

## Recommended Reading Order

1. [Installation](./getting-started/installation.md)
2. [Quickstart](./getting-started/quickstart.md)
3. [Configuration](./guides/configuration.md)
4. [Pipeline Stages](./guides/pipeline-stages.md)
5. [CLI Reference](./reference/cli-reference.md)

## Common Workflows

- Configure settings and credentials: `ideon settings`
- Generate content: `ideon write "your idea" --primary article=1 --secondary x-thread=1 --secondary x-post=1 --style technical`
- Preview outputs: `ideon preview`
- Resume failed/interrupted runs: `ideon write resume`

For model and run economics, see [Performance and Costs](./guides/performance-and-costs.md).
