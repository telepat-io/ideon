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
- Key flags: `--primary`, `--secondary`, `--job`, `--style`, `--intent`, `--length`, `--author`, `--experience`, `--no-interactive`, `--dry-run`, `--no-seo-check`, `--seo-check-mode`, `--seo-check-max-turns`, `--enrich-links`, `--link`, `--unlink`, `--max-links`, `--from-queue`.

## ideon author

- Path: `/reference/commands/ideon-author`
- Purpose: Manage author profiles (name, slug, profile text) for voice and expertise injected into writing prompts.
- Key flags: `add --profile`, `list --json`, `edit --name --profile`, `remove --force`.

## ideon queue

- Path: `/reference/commands/ideon-queue`
- Purpose: Manage the content queue for scheduling future article writes.
- Key flags: `add`, `list --json`, `peek`, `remove --force`, `clear --force`.

## ideon article list

- Path: `/reference/commands/ideon-article-list`
- Purpose: List and search generated articles with filters for publication, series, and content type.
- Key flags: `--search`, `--publication`, `--series`, `--content-type`, `--limit`, `--json`, `--verbose`.

## ideon write resume

- Path: `/reference/commands/ideon-write-resume`
- Purpose: Resume the last failed or interrupted write session from checkpoint state.
- Key flags: `--no-interactive`, `--seo-check`, `--seo-check-mode`, `--seo-check-max-turns`, `--enrich-links`, `--link`, `--unlink`, `--max-links`.

## `ideon links <slug>`

- Path: `/reference/commands/ideon-links`
- Purpose: Run link enrichment for a previously generated article by slug.
- Key flags: `--mode`, `--link`, `--unlink`, `--max-links`.

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
- Purpose: Install Ideon skills and MCP entries into supported agent hosts; verify readiness.
- Key flags: `install [--cli-skill|--mcp-skill] [--force] [--project] [--dry-run]`, `uninstall [--project] [--dry-run]`, `status --json`.
