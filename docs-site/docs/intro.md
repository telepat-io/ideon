---
sidebar_position: 1
title: Documentation Intro
---

# Documentation Intro

This documentation covers running, configuring, and extending Ideon as a multi-output content generation CLI.

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

- Configure settings and credentials: `npm run dev -- settings`
- Generate content: `npm run dev -- write "your idea" --primary article=1 --secondary x-thread=1 --secondary x-post=1 --style technical`
- Preview outputs: `npm run preview`
- Resume failed/interrupted runs: `npm run dev -- write resume`

For model and run economics, see [Performance and Costs](./guides/performance-and-costs.md).
