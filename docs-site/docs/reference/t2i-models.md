---
title: T2I Models
---

# Supported Text-to-Image Models

Ideon currently supports these model IDs:

- `black-forest-labs/flux-schnell` (default)
- `black-forest-labs/flux-2-pro`
- `bytedance/seedream-4`
- `google/nano-banana-pro`
- `prunaai/z-image-turbo`

## Override Handling

User-provided `t2i.inputOverrides` are sanitized before runtime:

- Non-user-configurable fields are dropped
- Values are coerced and validated by type
- Invalid values are ignored

## Pipeline-Managed Fields

Depending on model capabilities, Ideon may set pipeline fields automatically:

- `aspect_ratio`
- `width`
- `height`

This preserves stable image sizing and layout intent.

## Selection Tips

- Start with default `flux-schnell` for speed
- Increase quality-focused fields only after baseline stability
- Use dry-run to validate orchestration before live image spend
