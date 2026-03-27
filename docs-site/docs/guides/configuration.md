---
title: Configuration
---

# Configuration

Ideon merges configuration from multiple sources and validates the result before execution.

## Precedence Rules

Lowest to highest priority:

1. Saved settings file
2. Job file settings
3. Environment variables
4. Direct CLI arguments (idea input)

## Settings Schema

Core settings include:

- `model`: LLM model identifier
- `modelSettings.temperature`: 0..2
- `modelSettings.maxTokens`: positive integer
- `modelSettings.topP`: 0..1
- `modelRequestTimeoutMs`: positive integer request timeout in milliseconds (default `90000`)
- `t2i.modelId`: selected text-to-image model
- `t2i.inputOverrides`: model-specific user overrides
- `markdownOutputDir`
- `assetOutputDir`

## Saved Settings Location

Saved via OS config path (using `env-paths`), typically:

- macOS: `~/.ideon/settings.json`

## Example Environment Override

```bash
IDEON_MODEL=openai/gpt-4.1-mini \
IDEON_TEMPERATURE=0.6 \
IDEON_MAX_TOKENS=2400 \
npm run dev -- write "An idea"
```

See [Environment Variables](../reference/environment-variables.md) for full list.
