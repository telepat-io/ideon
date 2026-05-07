---
title: LLM and Image Pipeline
description: LLM and Image Pipeline documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# LLM and Image Pipeline Internals

## OpenRouter Client Behavior

OpenRouter requests include:

- timeout: 45s per attempt
- retries: up to 3 attempts
- retryable status codes: 408, 409, 429, 5xx
- transient network retry handling

Structured requests support parse callbacks for runtime validation.

## Plan and Prompt Validation

Ideon validates:

- article plans (`articleSchema` constraints)
- image prompt payloads (`prompt` required)
- run configuration via Zod schema defaults and constraints

Invalid provider output fails fast with actionable errors.

## Section Normalization

Generated text is normalized by:

- trimming whitespace
- removing markdown fences when present
- rejecting empty output sections

## Prompt System Composition

Prompt composition is guide-first:

- stage-specific guide bundles loaded from `writing-guide/`
- style guide selected from `writing-guide/styles/<style>.md`
- intent guide selected from `writing-guide/content-intent/<intent>.md`
- format guide(s) selected from `writing-guide/formats/<content-type>.md`
- operational runtime constraints from code (run context, target length, and minimal output-shape contracts)

For multi-target runs, article outputs may be used as anchor context for social/channel outputs.

## Non-Article Output Path

- Non-article content types are generated in single-shot prompts.
- This path runs in the output stage and does not require section-based generation.
- For no-article runs, planning/sections/image stages are skipped.

## Image Rendering Path

1. Plan generates cover image description and inline image descriptions (count proportional to article length: 1–2 for small, 2–3 for medium, 3–4 for large), each with explicit `anchorAfterSection` placement
2. Build image slots from plan (all inline images preserved; `--max-images` caps if needed)
3. Expand each slot description to final prompt, blending plan direction with actual section content
4. Build Replicate input from model registry and sanitized overrides
5. Execute model and normalize output bytes
6. Write image files and compute markdown-relative paths

## Dry-Run Behavior

Dry-run bypasses provider calls but exercises orchestration:

- deterministic synthetic plan and sections
- placeholder asset files
- normal markdown assembly
