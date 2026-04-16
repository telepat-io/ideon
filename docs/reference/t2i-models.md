---
title: T2I Models
description: T2I Models documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
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

## Practical Tradeoffs

| Model | Speed | Typical Quality | Best Use |
|---|---|---|---|
| `black-forest-labs/flux-schnell` | Fast | Good baseline | Iteration, high-throughput drafts |
| `black-forest-labs/flux-2-pro` | Medium | Higher fidelity | Hero visuals, polished cover images |
| `bytedance/seedream-4` | Medium | Strong composition | Balanced speed/quality workflows |
| `google/nano-banana-pro` | Medium | Style-consistent outputs | Brand-like variation and consistency |
| `prunaai/z-image-turbo` | Fast | Lightweight | Quick exploratory rendering |

## Common Override Patterns

Use `t2i.inputOverrides` when you need model-specific tuning:

- Output format tuning (for example `png` vs `webp`)
- Model-native quality knobs where supported
- Count/variant controls where allowed

Example:

```json
{
	"settings": {
		"t2i": {
			"modelId": "black-forest-labs/flux-schnell",
			"inputOverrides": {
				"output_format": "png"
			}
		}
	}
}
```

If an override is invalid for the selected model, Ideon drops it during validation.
