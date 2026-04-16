---
title: Credentials and Secrets
description: Credentials and Secrets documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Credentials and Secrets

Live generation requires two provider credentials.

## Required Secrets

- `IDEON_OPENROUTER_API_KEY`
- `IDEON_REPLICATE_API_TOKEN`

## Recommended Setup Path

Use the settings flow to store secrets in your OS keychain:

```bash
ideon settings
```

The CLI persists secrets via keychain integration, not plain text config.

## Environment Variable Alternative

Bash/zsh:

```bash
export IDEON_OPENROUTER_API_KEY=your_openrouter_key
export IDEON_REPLICATE_API_TOKEN=your_replicate_token
```

Fish:

```fish
set -x IDEON_OPENROUTER_API_KEY your_openrouter_key
set -x IDEON_REPLICATE_API_TOKEN your_replicate_token
```

## Validation Behavior

If required secrets are missing in live mode, the pipeline fails early with clear stage-level errors.

## Security Practices

- Do not commit secrets in job files or repository config
- Prefer keychain-backed storage for local development
- Rotate provider keys periodically
