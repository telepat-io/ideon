---
title: LLM and Image Pipeline
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

Invalid provider output fails fast with actionable errors.

## Section Normalization

Generated text is normalized by:

- trimming whitespace
- removing markdown fences when present
- rejecting empty output sections

## Image Rendering Path

1. Build image slots from plan (cover + inline)
2. Expand each slot description to final prompt
3. Build Replicate input from model registry and sanitized overrides
4. Execute model and normalize output bytes
5. Write image files and compute markdown-relative paths

## Dry-Run Behavior

Dry-run bypasses provider calls but exercises orchestration:

- deterministic synthetic plan and sections
- placeholder asset files
- normal markdown assembly
