---
title: ideon article list
description: List and search generated articles with filters for publication, series, and content type.
keywords: [ideon, cli, article, list, search, inventory]
---

# `ideon article list`

## What This Command Does

`ideon article list` lists generated articles from the local output directory, with optional search and filtering by publication, series, and content type. Search uses exact-phrase matching first, falling back to all-words AND logic when no exact matches are found.

## Usage

```bash
ideon article list [--search <query>] [--publication <slug>] [--series <slug>] [--content-type <type>] [--limit <n>] [--json] [--verbose]
```

## Arguments and Options

| Flag | Shorthand | Required | Type | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `--search <query>` | None | No | string | none | Search articles by title, slug, keywords, description, or body content. Exact phrase first, then all-words AND. |
| `--publication <slug>` | None | No | string | none | Filter by publication slug. Only articles generated after this feature was added will match. |
| `--series <slug>` | None | No | string | none | Filter by series slug. Only articles generated after this feature was added will match. |
| `--content-type <type>` | None | No | string | none | Filter by content type (article, blog-post, x-post, etc.). |
| `--limit <n>` | None | No | number | `50` | Maximum number of results to display. |
| `--json` | None | No | boolean | `false` | Print machine-readable JSON output. |
| `--verbose` | None | No | boolean | `false` | Show detailed metadata including description, keywords, idea, and generated date. |

## Examples

```bash title="List all articles"
ideon article list
```

```bash title="Search by phrase"
ideon article list --search "react hooks"
```

```bash title="Filter by publication"
ideon article list --publication tech-blog
```

```bash title="Combine filters and search"
ideon article list --search "machine learning" --publication tech-blog --limit 10
```

```bash title="Machine-readable output"
ideon article list --json
```

```bash title="Verbose output"
ideon article list --verbose
```

## Search Behavior

The `--search` flag uses a two-phase matching strategy:

1. **Exact phrase match** (case-insensitive): Searches across title, slug, description, keywords, and full markdown body for the exact phrase. If any articles match, only those are returned.
2. **All-words AND fallback**: If no exact phrase matches are found, the query is split into individual words. Articles containing ALL words (in any order) across the same fields are returned.

## Output and Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | Listing completed successfully. |
| `1` | Failed due to filesystem or runtime errors. |

## Related Commands

- `ideon write`
- `ideon export`
- `ideon delete`

## Versioning and Deprecation Notes

- Introduced in this version. No deprecated flags.
- Publication and series filtering only applies to articles generated after this feature was added (forward-only).
