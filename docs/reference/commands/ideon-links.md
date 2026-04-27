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
ideon links <slug> [--mode <fresh|append>] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]
```

## Arguments and Options

| Flag/Argument | Shorthand | Required | Type | Default | Allowed Values | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `<slug>` | None | Yes | string | n/a | Generated article slug | Selects the target article by frontmatter slug. |
| `--mode <mode>` | None | No | enum | `fresh` | `fresh`, `append` | `fresh` replaces existing generated links. `append` merges newly generated links into existing entries. Custom links are unaffected by `--mode`. |
| `--link <expression->url>` | None | No | repeatable string | none | `"text->https://..."` | Adds or updates a custom link. The format is `expression->url`. Repeatable for multiple custom links. Custom links are saved separately from generated ones and always included regardless of `--mode`. |
| `--unlink <expression>` | None | No | repeatable string | none | Any expression string | Removes a custom link by expression text. Repeatable. Case-insensitive match. |
| `--max-links <n>` | None | No | positive integer | Derived from article length | Any positive integer | Caps the number of generated links. Does not affect custom links. |

Notes:

- The command targets eligible long-form outputs; short-form channels such as `x-post` and `x-thread` are skipped by enrichment logic.

## Mode Semantics

- `fresh`:
  - Generates a new set of links.
  - Replaces any existing **generated** links in the sidecar.
  - **Custom links (added via `--link`) are always preserved** regardless of `--mode`.
- `append`:
  - Generates a new set of links.
  - Appends into existing generated sidecar entries with deduplication by `expression + url`.
  - If no sidecar exists, creates one.

## Custom Links

Custom links are user-specified `expression → url` pairs that are:

- Stored in the sidecar separately from LLM-generated links.
- Always included in preview rendering, regardless of `--mode`.
- Given precedence over generated links: if the LLM selects an expression that already has a custom link, the generated entry for that expression is discarded.
- Persisted across `--mode fresh` runs — only `--unlink` removes them.

To add a custom link:

```bash
ideon links my-article --link "React->https://react.dev"
```

To remove a custom link:

```bash
ideon links my-article --unlink "React"
```

## Sidecar Format (v2)

Sidecars written by this command have the following structure:

```json
{
  "version": 2,
  "customLinks": [
    { "expression": "React", "url": "https://react.dev", "title": null }
  ],
  "links": [
    { "expression": "OpenRouter", "url": "https://openrouter.ai", "title": "OpenRouter" }
  ]
}
```

Version 1 sidecars are read transparently with `customLinks` treated as empty.

## Default Max Links

When `--max-links` is not provided, the cap defaults based on the article's target word count:

| Word count range | Default max links |
| --- | --- |
| ≤ 700 words | 5 |
| 701 – 1150 words | 8 |
| > 1150 words | 12 |

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

```bash title="Add a custom link"
ideon links ai-content-ops-playbook --link "OpenRouter->https://openrouter.ai"
```

```bash title="Add multiple custom links"
ideon links ai-content-ops-playbook --link "React->https://react.dev" --link "Node.js->https://nodejs.org"
```

```bash title="Remove a custom link"
ideon links ai-content-ops-playbook --unlink "React"
```

```bash title="Cap generated links at 5"
ideon links ai-content-ops-playbook --max-links 5
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
