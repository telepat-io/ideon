---
title: ideon agent
description: Install, uninstall, and inspect local runtime integration registrations for Ideon agent workflows.
keywords: [ideon, cli, agent, runtime integration, mcp]
---

# ideon agent

## What This Command Does

`ideon agent` manages local runtime integration registrations and readiness checks for Ideon agent usage.

## Usage

```bash
ideon agent install <runtime> [--dry-run]
ideon agent uninstall <runtime> [--dry-run]
ideon agent status [--json]
```

## Supported and Unsupported Runtimes

Supported runtime ids:

- `claude`
- `chatgpt`
- `gemini`
- `generic-mcp`

Explicitly unsupported runtime ids:

- `cursor`
- `vscode`

## Subcommands

### ideon agent install

Registers a runtime integration profile.

```bash
ideon agent install claude
ideon agent install generic-mcp --dry-run
```

### ideon agent uninstall

Removes a runtime integration profile.

```bash
ideon agent uninstall claude
ideon agent uninstall chatgpt --dry-run
```

### ideon agent status

Prints installed runtimes and readiness checks.

```bash
ideon agent status
ideon agent status --json
```

Status includes:

- installed runtimes
- integration sync-check status
- MCP tool contract count
- skill contract count (internal skill metadata entries, for example `ideon-write-primary`)
- config surface readiness

## Output and Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | Command completed successfully. |
| `1` | Runtime id or state validation failed, or a runtime error occurred. |
| `130` | Command interrupted by `Ctrl+C`. |

## Related Commands

- [ideon mcp serve](./ideon-mcp-serve.md)
- [ideon config](./ideon-config.md)
- [Agent Maintenance and Sync](../../for-agents/agent-maintenance-and-sync.md)

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- Runtime registration is idempotent and persisted in the local integration store.
