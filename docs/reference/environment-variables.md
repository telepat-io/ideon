---
title: Environment Variables
description: Environment Variables documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Environment Variables

## Secrets

- `IDEON_OPENROUTER_API_KEY`
- `IDEON_REPLICATE_API_TOKEN`
- `IDEON_DISABLE_KEYTAR` (`true` or `false`) — when `true`, Ideon does not attempt keychain access and uses env-only secret resolution

## Model Settings

- `IDEON_MODEL`
- `IDEON_TEMPERATURE`
- `IDEON_MAX_TOKENS`
- `IDEON_TOP_P`
- `IDEON_MODEL_REQUEST_TIMEOUT_MS`

## Output Paths

- `IDEON_MARKDOWN_OUTPUT_DIR`
- `IDEON_ASSET_OUTPUT_DIR`

## Generation Style

- `IDEON_STYLE`
- `IDEON_TARGET_LENGTH` (`small`, `medium`, `large`)

## Notifications

- `IDEON_NOTIFICATIONS_ENABLED` (`true` or `false`)

## Example

```bash
IDEON_OPENROUTER_API_KEY=... \
IDEON_REPLICATE_API_TOKEN=... \
IDEON_DISABLE_KEYTAR=true \
IDEON_MODEL=moonshotai/kimi-k2.5 \
IDEON_TEMPERATURE=0.7 \
IDEON_MAX_TOKENS=2000 \
IDEON_TOP_P=1 \
IDEON_MODEL_REQUEST_TIMEOUT_MS=90000 \
IDEON_NOTIFICATIONS_ENABLED=false \
IDEON_MARKDOWN_OUTPUT_DIR=/output \
IDEON_ASSET_OUTPUT_DIR=/output/assets \
IDEON_STYLE=professional \
IDEON_TARGET_LENGTH=medium \
ideon write "How teams scale editorial pipelines"
```

## Notes

- Numeric vars are parsed into numbers and validated.
- Invalid numeric values are ignored during parsing and schema validation determines final acceptance.
- Env vars override saved and job-file settings where applicable.
- In environments where keychain services are unavailable (for example many containers), set `IDEON_DISABLE_KEYTAR=true`.
- Content targets (`contentTargets`) are not configurable through env vars; use CLI `--primary/--secondary` or job files.
