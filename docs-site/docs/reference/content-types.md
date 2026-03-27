---
title: Content Types
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

## `x-post`

- Best for: short-form distribution.
- Typical structure: hook-first short lines.
- Supports `xMode`:
  - `single`: one concise post.
  - `thread`: numbered multi-line thread format.
- Typical output: short posts that preserve the run style but prioritize hook density and pacing.

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

- In runs that include `article`, channel outputs can use article content as anchor context.
- In runs without `article`, channel outputs are generated directly from idea + style + target directives.

## Selection Tips

- Use `article` + channels together when you want one canonical narrative and multiple distribution variants.
- Use channel-only targets for lightweight campaign ideation and iteration.
- Use `x-post` with `xMode=thread` for explanatory series, and `single` for rapid distribution.

## Multi-Target Example

```bash
npm run dev -- write "AI workflow launch" \
  --target article=1 \
  --target x-post=3 \
  --target linkedin-post=1 \
  --style technical
```