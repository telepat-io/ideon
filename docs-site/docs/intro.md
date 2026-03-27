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

- Content targets: choose one or more output types per run (`article`, `x-post`, `linkedin-post`, and others)
- Style overlay: apply one run-level style to all outputs
- Generation directory: each run writes markdown outputs, shared assets, `job.json`, and `generation.analytics.json`
- Conditional stages: article-enabled runs execute full pipeline; non-article runs skip article/image stages

## Common Workflows

- Configure settings and credentials: `npm run dev -- settings`
- Generate content: `npm run dev -- write "your idea" --target article=1 --target x-post=2 --style technical`
- Preview outputs: `npm run preview`
- Resume failed/interrupted runs: `npm run dev -- write resume`
