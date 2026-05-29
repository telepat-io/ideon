---
title: Credentials and Secrets
description: Credentials and Secrets documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Credentials and Secrets

Live generation requires two provider credentials. Google Ads Keyword Planner tools require six additional credentials.

## Required Secrets

### Core Provider Secrets

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN`

### Google Ads Keyword Planner Secrets

The following six credentials are required for the `gkp_*` MCP tools:

- `googleAdsDeveloperToken` — from Google Ads API Center
- `googleAdsClientId` — OAuth2 client ID from GCP Console
- `googleAdsClientSecret` — OAuth2 client secret from GCP Console
- `googleAdsRefreshToken` — from one-time OAuth2 authorization flow
- `googleAdsCustomerId` — Google Ads account number (with billing)
- `googleAdsLoginCustomerId` — Manager (MCC) account number (only if accessing through a manager account)

For detailed setup instructions, see [Google Ads Keyword Planner Setup](./google-ads-keyword-planner.md).

## Recommended Setup Path

Use the settings flow to store secrets in your OS keychain:

```bash
ideon settings
```

The CLI persists secrets via keychain integration, not plain text config.

For Google Ads credentials, use `ideon config set`:

```bash
ideon config set googleAdsDeveloperToken "your-token"
ideon config set googleAdsClientId "your-client-id"
ideon config set googleAdsClientSecret "your-secret"
ideon config set googleAdsRefreshToken "your-refresh-token"
ideon config set googleAdsCustomerId "123-456-7890"
ideon config set googleAdsLoginCustomerId "123-456-7890"  # only if needed
```

## Environment Variable Alternative

Bash/zsh:

```bash
export TELEPAT_OPENROUTER_KEY=your_openrouter_key
export TELEPAT_REPLICATE_TOKEN=your_replicate_token
export TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
export TELEPAT_GOOGLE_ADS_CLIENT_ID=your-client-id.apps.googleusercontent.com
export TELEPAT_GOOGLE_ADS_CLIENT_SECRET=your-client-secret
export TELEPAT_GOOGLE_ADS_REFRESH_TOKEN=your-refresh-token
export TELEPAT_GOOGLE_ADS_CUSTOMER_ID=123-456-7890
export TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID=123-456-7890  # only if needed
```

Fish:

```fish
set -x TELEPAT_OPENROUTER_KEY your_openrouter_key
set -x TELEPAT_REPLICATE_TOKEN your_replicate_token
set -x TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN your-developer-token
set -x TELEPAT_GOOGLE_ADS_CLIENT_ID your-client-id.apps.googleusercontent.com
set -x TELEPAT_GOOGLE_ADS_CLIENT_SECRET your-client-secret
set -x TELEPAT_GOOGLE_ADS_REFRESH_TOKEN your-refresh-token
set -x TELEPAT_GOOGLE_ADS_CUSTOMER_ID 123-456-7890
set -x TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID 123-456-7890  # only if needed
```

## Validation Behavior

If required secrets are missing in live mode, the pipeline fails early with clear stage-level errors.

Google Ads tools fail with actionable error messages that include setup instructions when credentials are missing or invalid.

## Security Practices

- Do not commit secrets in job files or repository config
- Prefer keychain-backed storage for local development
- Rotate provider keys periodically
- OAuth2 refresh tokens cannot be retrieved again — save them securely
