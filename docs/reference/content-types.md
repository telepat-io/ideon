---
title: Content Types
description: Content Types documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Content Types

Ideon supports these generation targets:

## `article`

- Best for: long-form canonical content.
- Typical structure: title, intro, sections, conclusion, image embeds.
- Typical output: long-form draft with reusable narrative context for channel outputs.

## `blog-post`

- Best for: educational publishing and SEO-focused explainers.
- Typical structure: clear lead, subheadings, practical takeaways.

## `x-thread`

- Best for: multi-post explanatory sequences on X.
- Typical structure: hook-first opener, numbered thread lines, clear narrative progression.
- Typical output: thread-form content where each line advances one shared story arc.

## `x-post`

- Best for: short-form distribution.
- Typical structure: hook-first short lines.
- Typical output: one concise post that preserves the run style but prioritizes hook density and pacing.

## `reddit-post`

- Best for: community discussion and practitioner feedback.
- Typical structure: plain, candid voice with practical detail.

## `linkedin-post`

- Best for: professional thought leadership and distribution.
- Typical structure: two-line hook, short spaced paragraphs, focused close.

## `newsletter`

- Best for: recurring subscriber communication.
- Typical structure: strong opening, compact sections, clear transitions.
- Typical output: editorial cadence tuned for recurring audience updates.

## `landing-page-copy`

- Best for: conversion-oriented pages and product messaging.
- Typical structure: headline, value proposition, proof, objection handling, CTA.

## Multi-Output Behavior

- Every run has exactly one primary output and optional secondary outputs.
- Secondary outputs can use generated primary content as anchor context.
- If primary is `article`, Ideon uses structured article planning/writing.
- If primary is non-article, Ideon uses generic primary generation and still renders a primary cover image.

## Selection Tips

- Use `article` primary + secondaries when you want one canonical narrative and multiple distribution variants.
- Use channel-only targets for lightweight campaign ideation and iteration.
- Use `x-thread` for explanatory series, and `x-post` for rapid single-post distribution.

## Multi-Target Example

```bash
ideon write "AI workflow launch" \
  --primary article=1 \
  --secondary x-thread=2 \
  --secondary x-post=1 \
  --secondary linkedin-post=1 \
  --style technical
```