---
title: Command Index
description: Machine-friendly index of Ideon CLI commands and their canonical documentation pages.
keywords: [ideon, agents, command index, cli, reference]
---

# Command Index

## ideon settings

- Path: `/reference/commands/ideon-settings`
- Purpose: Configure runtime settings and credentials through the interactive flow.
- Key flags: none.

## ideon config

- Path: `/reference/commands/ideon-config`
- Purpose: Manage settings and secret values non-interactively for automation and agents.
- Key flags: `list --json`, `get --json`, `set`, `unset`.

## ideon write [idea]

- Path: `/reference/commands/ideon-write`
- Purpose: Generate primary and optional secondary outputs from an idea or job file.
- Key flags: `--primary`, `--secondary`, `--job`, `--style`, `--length`, `--no-interactive`, `--dry-run`, `--no-enrich-links`.

## ideon write resume

- Path: `/reference/commands/ideon-write-resume`
- Purpose: Resume the last failed or interrupted write session from checkpoint state.
- Key flags: `--no-interactive`.

## `ideon delete <slug>`

- Path: `/reference/commands/ideon-delete`
- Purpose: Delete a generated markdown output and related analytics sidecar.
- Key flags: `--force`.

## ideon preview [markdownPath]

- Path: `/reference/commands/ideon-preview`
- Purpose: Start local preview UI and API for generated output.
- Key flags: `--port`, `--no-open`, `--watch`.

## ideon mcp serve

- Path: `/reference/commands/ideon-mcp-serve`
- Purpose: Start the first-party Ideon MCP server over stdio transport.
- Key flags: none.

## ideon agent

- Path: `/reference/commands/ideon-agent`
- Purpose: Manage local runtime integration registrations and readiness checks.
- Key flags: `install --dry-run`, `uninstall --dry-run`, `status --json`.
