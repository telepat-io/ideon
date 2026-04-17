---
title: ideon settings
description: Configure and inspect Ideon settings and credentials through the interactive settings flow.
keywords: [ideon, cli, settings, keychain, configuration]
---

# ideon settings

## What This Command Does

`ideon settings` opens the interactive settings flow so you can review and update runtime defaults and credential storage.

For non-interactive automation and agent workflows, use [ideon config](./ideon-config.md).

## Usage

```bash
ideon settings
```

## Arguments and Options

| Flag/Argument | Shorthand | Required | Type | Default | Allowed Values | Description |
| --- | --- | --- | --- | --- | --- | --- |
| None | None | No | n/a | n/a | n/a | This command has no arguments or flags. |

## Examples

```bash title="Minimal happy path"
ideon settings
```

```bash title="Common real-world path"
IDEON_DISABLE_KEYTAR=true ideon settings
```

```bash title="Debug-focused verification"
ideon settings && ideon --version
```

## Output and Exit Codes

When settings are saved successfully, Ideon prints the settings file path and returns a success exit code.

| Exit code | Meaning |
| --- | --- |
| `0` | Settings flow completed successfully. |
| `1` | Command failed due to runtime or validation errors. |
| `130` | Command interrupted by `Ctrl+C`. |

## Related Commands

- [ideon config](./ideon-config.md)
- [ideon write [idea]](./ideon-write.md)
- [ideon preview [markdownPath]](./ideon-preview.md)

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- No deprecated flags apply to this command.
