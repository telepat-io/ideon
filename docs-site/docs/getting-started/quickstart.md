---
sidebar_position: 3
title: Quickstart
---

# Quickstart

This guide gets you from zero to your first generated article.

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

## 2. Generate an Article

```bash
npm run dev -- write "How small editorial teams can productionize AI writing"
```

Expected stages:

1. Planning Article
2. Writing Sections
3. Expanding Image Prompts
4. Rendering Images
5. Assembling Markdown

## 3. Check Outputs

By default (resolved from current working directory):

- Markdown: `output/<slug>.md`
- Assets: `output/assets/`

## 4. Run a Safe Dry Run

```bash
npm run dev -- write --dry-run "How AI changes developer docs workflows"
```

Dry run keeps the full pipeline flow but skips OpenRouter and Replicate API calls.

## 5. Run with a Job File

```bash
npm run dev -- write --job ./job.json
```

See [Job Files](../guides/job-files.md) for full schema and examples.
