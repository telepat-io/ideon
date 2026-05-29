---
title: Environment Variables
description: Environment Variables documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Environment Variables

## Secrets

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN`
- `TELEPAT_DISABLE_KEYTAR` (`true` or `false`) — when `true`, Ideon does not attempt keychain access and uses env-only secret resolution

### Google Ads Keyword Planner Secrets

- `TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN` — from Google Ads API Center
- `TELEPAT_GOOGLE_ADS_CLIENT_ID` — OAuth2 client ID from GCP Console
- `TELEPAT_GOOGLE_ADS_CLIENT_SECRET` — OAuth2 client secret from GCP Console
- `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` — from one-time OAuth2 authorization flow
- `TELEPAT_GOOGLE_ADS_CUSTOMER_ID` — Google Ads account number (with billing)
- `TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID` — Manager (MCC) account number (only if accessing through a manager account)

For detailed Google Ads setup instructions, see [Google Ads Keyword Planner Setup](../guides/google-ads-keyword-planner.md).

## Model Settings

- `IDEON_MODEL`
- `IDEON_TEMPERATURE`
- `IDEON_MAX_TOKENS`
- `IDEON_TOP_P`
- `IDEON_MODEL_REQUEST_TIMEOUT_MS`
- `IDEON_MODEL_REQUEST_MAX_ATTEMPTS` — max attempts per OpenRouter call (default `4`, range 1–10)

## Output Paths

- `IDEON_MARKDOWN_OUTPUT_DIR`
- `IDEON_ASSET_OUTPUT_DIR`

## Generation Style

- `IDEON_STYLE`
- `IDEON_INTENT`
- `IDEON_TARGET_LENGTH` (`small`, `medium`, `large`, or positive integer words)

## Notifications

- `IDEON_NOTIFICATIONS_ENABLED` (`true` or `false`)

## Example

```bash
TELEPAT_OPENROUTER_KEY=... \
TELEPAT_REPLICATE_TOKEN=... \
TELEPAT_DISABLE_KEYTAR=true \
TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN=... \
TELEPAT_GOOGLE_ADS_CLIENT_ID=... \
TELEPAT_GOOGLE_ADS_CLIENT_SECRET=... \
TELEPAT_GOOGLE_ADS_REFRESH_TOKEN=... \
TELEPAT_GOOGLE_ADS_CUSTOMER_ID=123-456-7890 \
IDEON_MODEL=deepseek/deepseek-v4-pro \
IDEON_TEMPERATURE=0.7 \
IDEON_MAX_TOKENS=2000 \
IDEON_TOP_P=1 \
IDEON_MODEL_REQUEST_TIMEOUT_MS=90000 \
IDEON_NOTIFICATIONS_ENABLED=false \
IDEON_MARKDOWN_OUTPUT_DIR=/output \
IDEON_ASSET_OUTPUT_DIR=/output/assets \
IDEON_STYLE=professional \
IDEON_INTENT=tutorial \
IDEON_TARGET_LENGTH=1200 \
ideon write "How teams scale editorial pipelines"
```

## Notes

- Numeric vars are parsed into numbers and validated.
- `IDEON_TARGET_LENGTH` supports aliases (`small=500`, `medium=900`, `large=1400`) or explicit positive integer words.
- Invalid numeric values are ignored during parsing and schema validation determines final acceptance.
- Env vars override saved and job-file settings where applicable.
- In environments where keychain services are unavailable (for example many containers), set `TELEPAT_DISABLE_KEYTAR=true`.
- Content targets (`contentTargets`) are not configurable through env vars; use CLI `--primary/--secondary` or job files.
