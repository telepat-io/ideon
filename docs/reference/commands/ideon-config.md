---
title: ideon config
description: Manage Ideon settings and secret values non-interactively for automation and one-shot agent workflows.
keywords: [ideon, cli, config, automation, non-interactive]
---

# ideon config

## What This Command Does

`ideon config` provides a non-interactive configuration surface for scripts, CI, and agents.

It complements `ideon settings`, which remains interactive.

## Usage

```bash
ideon config list [--json]
ideon config get <key> [--json]
ideon config set <key> <value>
ideon config unset <key>
```

## Subcommands

### ideon config list

Lists current persisted settings and secret availability.

```bash
ideon config list
ideon config list --json
```

### ideon config get

Reads one setting key or secret-presence key.

```bash
ideon config get style
ideon config get openRouterApiKey --json
```

### ideon config set

Sets one setting or secret value.

```bash
ideon config set style technical
ideon config set openRouterApiKey "$IDEON_OPENROUTER_API_KEY"
```

### ideon config unset

Resets a setting to default or removes a stored secret.

```bash
ideon config unset style
ideon config unset openRouterApiKey
```

## Supported Keys

Settings keys:

- `model`
- `modelSettings.temperature`
- `modelSettings.maxTokens`
- `modelSettings.topP`
- `modelRequestTimeoutMs`
- `notifications.enabled`
- `markdownOutputDir`
- `assetOutputDir`
- `style`
- `targetLength`

`targetLength` value notes:

- Accepts aliases `small`, `medium`, `large` or a positive integer word count.
- Alias mapping is `small=500`, `medium=900`, `large=1400`.

Secret keys:

- `openRouterApiKey`
- `replicateApiToken`

## Output and Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | Command completed successfully. |
| `1` | Validation, key, or storage error occurred. |
| `130` | Command interrupted by `Ctrl+C`. |

## Related Commands

- [ideon settings](./ideon-settings.md)
- [ideon write [idea]](./ideon-write.md)
- [Environment Variables](../environment-variables.md)

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- This command group is designed for non-interactive one-shot workflows.
