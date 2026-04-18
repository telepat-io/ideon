---
title: "ideon links <slug>"
description: Run link enrichment only for an existing generated article.
keywords: [ideon, cli, links, enrichment, sidecar]
---

# `ideon links <slug>`

## What This Command Does

`ideon links <slug>` runs only the link enrichment stage for an existing generated markdown article, then writes or updates its `.links.json` sidecar.

Link enrichment here means: Ideon selects linkable phrases in markdown, resolves relevant source URLs with model + web search, and stores those link suggestions in sidecar metadata.

The original markdown file is not rewritten; preview applies sidecar links at render time.

## Usage

```bash
ideon links <slug> [--mode <fresh|append>]
```

## Arguments and Options

| Flag/Argument | Shorthand | Required | Type | Default | Allowed Values | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `<slug>` | None | Yes | string | n/a | Generated article slug | Selects the target article by frontmatter slug. |
| `--mode <mode>` | None | No | enum | `fresh` | `fresh`, `append` | `fresh` replaces existing links sidecar content. `append` merges newly generated links into existing sidecar entries (creates sidecar if missing). |

Notes:

- The command targets eligible long-form outputs; short-form channels such as `x-post` and `x-thread` are skipped by enrichment logic.

## Mode Semantics

- `fresh`:
  - Generates a new set of links.
  - Replaces any existing `.links.json` content.
- `append`:
  - Generates a new set of links.
  - Appends into existing sidecar entries with deduplication by `expression + url`.
  - If no sidecar exists, creates one.

## Examples

```bash title="Default behavior (fresh)"
ideon links ai-content-ops-playbook
```

```bash title="Explicit fresh mode"
ideon links ai-content-ops-playbook --mode fresh
```

```bash title="Append into existing sidecar"
ideon links ai-content-ops-playbook --mode append
```

## Output and Exit Codes

On success, Ideon writes a sidecar file next to the matched markdown file (for example `article-1.links.json`).

| Exit code | Meaning |
| --- | --- |
| `0` | Links enrichment completed successfully. |
| `1` | Validation, lookup, credentials, or runtime failure occurred. |

## Related Commands

- [ideon write [idea]](./ideon-write.md)
- [ideon write resume](./ideon-write-resume.md)
- [ideon preview [markdownPath]](./ideon-preview.md)
