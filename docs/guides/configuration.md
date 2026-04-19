---
title: Configuration
description: Configuration documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Configuration

Ideon merges configuration from multiple sources and validates the result before execution.

## Precedence Rules

Lowest to highest priority:

1. Saved settings file
2. Job file settings
3. Environment variables
4. Direct CLI arguments (`--style`, `--intent`, `--primary`, `--secondary`, idea input)

Secret precedence:

- `IDEON_OPENROUTER_API_KEY` and `IDEON_REPLICATE_API_TOKEN` from environment variables override keychain-stored secrets.
- If env vars are not set, Ideon attempts to read keychain values saved through `ideon settings`.
- Keychain support (`keytar`) is loaded lazily at runtime when secret reads/writes are needed.
- If keychain access fails (for example D-Bus is unavailable in a container), Ideon falls back to environment variables for secret resolution.
- Set `IDEON_DISABLE_KEYTAR=true` to skip keychain access entirely in container or CI environments.

Per-field merge behavior:

- `modelSettings` merges by key (`temperature`, `maxTokens`, `topP`) across sources.
- `contentTargets` is replaced as a full array when provided by a higher-priority source.
- Scalar settings (for example `model`, `style`, `intent`, `targetLength`, `markdownOutputDir`) are replaced by the highest-priority source.

## Settings Schema

Core settings include:

- `model`: LLM model identifier
- `modelSettings.temperature`: 0..2
- `modelSettings.maxTokens`: positive integer
- `modelSettings.topP`: 0..1
- `modelRequestTimeoutMs`: positive integer request timeout in milliseconds (default `90000`)
- `t2i.modelId`: selected text-to-image model
- `t2i.inputOverrides`: model-specific user overrides
- `notifications.enabled`: toggles OS notifications for write lifecycle updates
- `markdownOutputDir`
- `assetOutputDir`
- `contentTargets`: array of output targets with per-type counts
- `style`: run-level writing style
- `intent`: run-level content intent
- `targetLength`: run-level target length in words (positive integer). Aliases are accepted as input: `small=500`, `medium=900`, `large=1400`.

`contentTargets` entries:

- `contentType`: one of `article`, `blog-post`, `linkedin-post`, `newsletter`, `press-release`, `reddit-post`, `science-paper`, `x-post`, `x-thread`
- `role`: `primary` or `secondary`
- `count`: positive integer

Rules:

- Exactly one `contentTargets` entry must have role `primary`.
- Primary count must be `1`.
- Secondary entries are optional and can use counts greater than `1`.

Style values:

- `academic`
- `analytical`
- `authoritative`
- `conversational`
- `empathetic`
- `friendly`
- `journalistic`
- `minimalist`
- `persuasive`
- `playful`
- `professional`
- `storytelling`
- `technical`

Intent values:

- `announcement`
- `case-study`
- `cornerstone`
- `counterargument`
- `critique-review`
- `deep-dive-analysis`
- `how-to-guide`
- `interview-q-and-a`
- `listicle`
- `opinion-piece`
- `personal-essay`
- `roundup-curation`
- `tutorial`

Defaults:

- `contentTargets`: `[ { "contentType": "article", "role": "primary", "count": 1 } ]`
- `style`: `professional`
- `intent`: `tutorial`
- `targetLength`: `900`

Target length aliases:

- `small`: `500` words
- `medium`: `900` words (default)
- `large`: `1400` words

## Saved Settings Location

Saved via OS config path (using `env-paths`), typically:

- macOS: `~/.ideon/settings.json`

To edit saved settings, run `ideon settings` again. The wizard is the supported way to update values and stored credentials.

## Example Environment Override

```bash
IDEON_MODEL=openai/gpt-4.1-mini \
IDEON_TEMPERATURE=0.6 \
IDEON_MAX_TOKENS=2400 \
IDEON_STYLE=technical \
IDEON_INTENT=tutorial \
IDEON_TARGET_LENGTH=1200 \
ideon write "An idea"
```

Note: content target arrays are not currently configurable through environment variables. Use CLI `--primary/--secondary` flags or job-file `settings.contentTargets`.

See [Environment Variables](../reference/environment-variables.md) for full list.
