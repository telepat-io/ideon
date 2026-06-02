---
title: ideon series
description: Manage content series with topic, defaults, and optional publication association.
keywords: [ideon, cli, series, content, publication]
image: /img/logo.svg
---

# ideon series

## What This Command Does

`ideon series` manages content series — named collections of related content with shared defaults, editorial policy, and an optional publication association. Series defaults override publication defaults in the settings resolution chain.

## Subcommands

- [`ideon series add`](#ideon-series-add) — Create a new series
- [`ideon series list`](#ideon-series-list) — List all series
- [`ideon series edit`](#ideon-series-edit) — Edit an existing series
- [`ideon series remove`](#ideon-series-remove) — Delete a series

## Settings Resolution Chain

When a series is associated with a write run, its defaults are applied after publication defaults and before CLI flags:

```
saved settings → job file → env vars → publication defaults → series defaults → CLI flags
```

Series can override any setting a publication can: `style`, `intent`, `targetLength`, `contentTargets`, `model`, `modelSettings`, and `editorialPolicy`.

## Series Data in Prompts

When a series is active, the following data is injected into all LLM prompts (plan, sections, channel content):

- Series name and topic as a narrative thread directive
- Series editorial policy (tone, forbidden topics, disclosure requirements, audience restrictions, notes)

Example prompt injection:

```
This article is part of the series "AI Deep Dives".
Series topic: Exploring cutting-edge AI technologies
Maintain thematic coherence and continuity with this overarching subject.
Tone: technical
Forbidden topics: hype, speculation
```

---

## ideon series add

Create a new content series.

### Usage

```bash
ideon series add [name] [--topic <topic>] [--publication <slug>] [--style <style>] [--intent <intent>] [--length <size>] [--type <type>] [--audience <description>] [--tone <tone>] [--forbidden-topics <topics>] [--disclosure-requirements <requirements>] [--audience-restrictions <restrictions>] [--editorial-policy <text>]
```

### Options

| Flag | Required | Type | Description |
| --- | --- | --- | --- |
| `[name]` | Yes (or interactive) | string | Series name. Slug is auto-generated from name. |
| `--topic <topic>` | No | string | Freeform description of what the series is about. |
| `--publication <slug>` | No | string | Associate series to a publication. |
| `--style <style>` | No | enum | Default writing style. |
| `--intent <intent>` | No | enum | Default content intent. |
| `--length <size>` | No | enum or integer | Default target length. |
| `--type <type>` | No | enum | Default primary content type. |
| `--audience <description>` | No | string | Default target audience hint. |
| `--tone <tone>` | No | string | Editorial policy tone. |
| `--forbidden-topics <topics>` | No | string | Comma-separated forbidden topics. |
| `--disclosure-requirements <requirements>` | No | string | Comma-separated disclosure requirements. |
| `--audience-restrictions <restrictions>` | No | string | Comma-separated audience restrictions. |
| `--editorial-policy <text>` | No | string | Editorial policy notes. |

### Examples

```bash
# Minimal series
ideon series add "AI Deep Dives"

# Series with topic and publication
ideon series add "AI Deep Dives" --topic "Exploring cutting-edge AI technologies" --publication tech-blog

# Series with full options
ideon series add "Startup Stories" --topic "Founder interviews and case studies" --publication my-blog --style storytelling --intent case-study --tone conversational
```

### Interactive Mode

When run in a TTY without flags, `ideon series add` launches an interactive flow:

1. Topic (freeform text)
2. Publication selection (pick from existing or skip)
3. Default style
4. Default intent
5. Default target length
6. Default content type
7. Editorial policy: tone, forbidden topics, disclosure requirements, audience restrictions, notes

---

## ideon series list

List all series.

### Usage

```bash
ideon series list [--json] [--verbose] [--publication <slug>]
```

### Options

| Flag | Type | Description |
| --- | --- | --- |
| `--json` | boolean | Output as JSON array. |
| `--verbose` | boolean | Show editorial policy details. |
| `--publication <slug>` | string | Filter to series associated with this publication. |

### Examples

```bash
# List all series
ideon series list

# Filter by publication
ideon series list --publication tech-blog

# JSON output
ideon series list --json
```

---

## ideon series edit

Edit an existing series.

### Usage

```bash
ideon series edit <slug> [--name <name>] [--topic <topic>] [--publication <slug>] [--unset-publication] [--style <style>] [--intent <intent>] [--length <size>] [--type <type>] [--audience <description>] [--tone <tone>] [--forbidden-topics <topics>] [--disclosure-requirements <requirements>] [--audience-restrictions <restrictions>] [--editorial-policy <text>]
```

### Options

| Flag | Required | Type | Description |
| --- | --- | --- | --- |
| `<slug>` | Yes | string | Series slug to edit. |
| `--name <name>` | No | string | New display name. |
| `--topic <topic>` | No | string | New topic. |
| `--publication <slug>` | No | string | Associate to a different publication. |
| `--unset-publication` | No | boolean | Remove publication association. |
| `--style <style>` | No | enum | New default style. |
| `--intent <intent>` | No | enum | New default intent. |
| `--length <size>` | No | enum or integer | New default target length. |
| `--type <type>` | No | enum | New default content type. |
| `--audience <description>` | No | string | New audience hint. |
| `--tone <tone>` | No | string | New editorial tone. |
| `--forbidden-topics <topics>` | No | string | New comma-separated forbidden topics. |
| `--disclosure-requirements <requirements>` | No | string | New disclosure requirements. |
| `--audience-restrictions <restrictions>` | No | string | New audience restrictions. |
| `--editorial-policy <text>` | No | string | New editorial policy notes. |

### Examples

```bash
# Change topic
ideon series edit ai-deep-dives --topic "New topic description"

# Re-associate to different publication
ideon series edit ai-deep-dives --publication new-pub

# Remove publication association
ideon series edit ai-deep-dives --unset-publication
```

---

## ideon series remove

Delete a series.

### Usage

```bash
ideon series remove <slug> [--force]
```

### Options

| Flag | Required | Type | Description |
| --- | --- | --- | --- |
| `<slug>` | Yes | string | Series slug to delete. |
| `--force` / `-f` | No | boolean | Skip confirmation prompt. |

### Examples

```bash
# With confirmation prompt
ideon series remove ai-deep-dives

# Force delete
ideon series remove ai-deep-dives --force
```

### Notes

Deleting a series does not affect articles that were written under it. Their metadata remains as-is.

---

## Using Series with `ideon write`

### CLI Flag

```bash
ideon write "My idea" --series ai-deep-dives --primary article=1
```

### Job File

```json
{
  "idea": "My idea",
  "series": "ai-deep-dives",
  "settings": {
    "contentTargets": [{ "contentType": "article", "role": "primary", "count": 1 }]
  }
}
```

### Interactive TUI

When running `ideon write` in interactive mode without `--series`, a series selection step is presented after publication selection (if applicable). Users can pick an existing series or skip.

### Combining Publication and Series

```bash
ideon write "My idea" --publication tech-blog --series ai-deep-dives --primary article=1
```

When both are specified:
- Publication provides the base editorial policy and defaults
- Series overrides publication defaults where it has its own values
- Series editorial policy is appended to publication policy in prompts
- CLI flags still override everything
