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
4. Direct CLI arguments (`--style`, `--target`, idea input)

Secret precedence:

- `IDEON_OPENROUTER_API_KEY` and `IDEON_REPLICATE_API_TOKEN` from environment variables override keychain-stored secrets.
- If env vars are not set, Ideon falls back to keychain values saved through `ideon settings`.

Per-field merge behavior:

- `modelSettings` merges by key (`temperature`, `maxTokens`, `topP`) across sources.
- `contentTargets` is replaced as a full array when provided by a higher-priority source.
- Scalar settings (for example `model`, `style`, `markdownOutputDir`) are replaced by the highest-priority source.
- Scalar settings (for example `model`, `style`, `targetLength`, `markdownOutputDir`) are replaced by the highest-priority source.

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
- `contentTargets`: array of output targets with per-type counts
- `style`: run-level writing style
- `targetLength`: run-level output size tier (`small`, `medium`, `large`)

`contentTargets` entries:

- `contentType`: one of `article`, `blog-post`, `x-post`, `reddit-post`, `linkedin-post`, `newsletter`, `landing-page-copy`
- `count`: positive integer
- `xMode` (optional): only for `x-post`, values `single` or `thread`

Style values:

- `professional`
- `friendly`
- `technical`
- `academic`
- `opinionated`
- `storytelling`

Defaults:

- `contentTargets`: `[ { "contentType": "article", "count": 1 } ]`
- `style`: `professional`
- `targetLength`: `medium`

Target length tiers:

- `small`: compressed output with fewer sections/ideas
- `medium`: balanced depth and readability (default)
- `large`: expanded, deeper output with more coverage and examples

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
IDEON_TARGET_LENGTH=large \
npm run dev -- write "An idea"
```

Note: content target arrays are not currently configurable through environment variables. Use CLI `--target` flags or job-file `settings.contentTargets`.

`xMode` for `x-post` also cannot be set via environment variables. Set it in `--target` interactions or in `settings.contentTargets` within a job file.

See [Environment Variables](../reference/environment-variables.md) for full list.
