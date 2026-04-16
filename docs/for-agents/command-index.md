---
title: Command Index
description: Machine-friendly index of Ideon CLI commands and their canonical documentation pages.
keywords: [ideon, agents, command index, cli, reference]
---

# Command Index

## ideon settings

- Path: `/reference/commands/ideon-settings`
- Purpose: Configure runtime settings and credentials.
- Key flags: none.

## ideon write [idea]

- Path: `/reference/commands/ideon-write`
- Purpose: Generate primary and optional secondary outputs from an idea or job file.
- Key flags: `--primary`, `--secondary`, `--job`, `--style`, `--length`, `--dry-run`, `--no-enrich-links`.

## ideon write resume

- Path: `/reference/commands/ideon-write-resume`
- Purpose: Resume the last failed or interrupted write session from checkpoint state.
- Key flags: none.

## `ideon delete <slug>`

- Path: `/reference/commands/ideon-delete`
- Purpose: Delete a generated markdown output and related analytics sidecar.
- Key flags: `--force`.

## ideon preview [markdownPath]

- Path: `/reference/commands/ideon-preview`
- Purpose: Start local preview UI and API for generated output.
- Key flags: `--port`, `--no-open`, `--watch`.
