---
title: Content Types
---

# Content Types

Ideon supports these generation targets:

## `article`

- Best for: long-form canonical content.
- Typical structure: title, intro, sections, conclusion, image embeds.

## `blog-post`

- Best for: educational publishing and SEO-focused explainers.
- Typical structure: clear lead, subheadings, practical takeaways.

## `x-post`

- Best for: short-form distribution.
- Typical structure: hook-first short lines.
- Supports `xMode`:
  - `single`: one concise post.
  - `thread`: numbered multi-line thread format.

## `reddit-post`

- Best for: community discussion and practitioner feedback.
- Typical structure: plain, candid voice with practical detail.

## `linkedin-post`

- Best for: professional thought leadership and distribution.
- Typical structure: two-line hook, short spaced paragraphs, focused close.

## `newsletter`

- Best for: recurring subscriber communication.
- Typical structure: strong opening, compact sections, clear transitions.

## `landing-page-copy`

- Best for: conversion-oriented pages and product messaging.
- Typical structure: headline, value proposition, proof, objection handling, CTA.

## Multi-Target Example

```bash
npm run dev -- write "AI workflow launch" \
  --target article=1 \
  --target x-post=3 \
  --target linkedin-post=1 \
  --style technical
```