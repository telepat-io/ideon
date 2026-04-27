---
title: ideon write resume
description: Resume the latest failed or interrupted write session from local checkpoint state.
keywords: [ideon, cli, resume, checkpoints, write]
---

# ideon write resume

## What This Command Does

`ideon write resume` continues the most recent failed or interrupted write run from `.ideon/write/state.json`.

## Usage

```bash
ideon write resume [--no-interactive] [--enrich-links] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]
```

## Arguments and Options

| Flag/Argument | Shorthand | Required | Type | Default | Allowed Values | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `--no-interactive` | None | No | boolean | `false` | `true` or omitted | Forces plain non-interactive rendering even in TTY mode. |
| `--enrich-links` | None | No | boolean | `false` | `true` or omitted | Runs link enrichment stage during resume. |
| `--link <expression->url>` | None | No | repeatable string | none | `"text->https://..."` | Adds or updates a custom link in the sidecar. Requires `--enrich-links`. |
| `--unlink <expression>` | None | No | repeatable string | none | Any expression string | Removes a custom link by expression. Requires `--enrich-links`. |
| `--max-links <n>` | None | No | positive integer | Derived from article length | Any positive integer | Caps the number of generated links. Requires `--enrich-links`. |

## Examples

```bash title="Minimal happy path"
ideon write resume
```

```bash title="Common real-world path"
ideon write "Long-form article about API docs" --primary article=1 && ideon write resume
```

```bash title="Debug-focused verification"
ideon write resume && ideon preview --no-open
```

```bash title="One-shot agent-safe path"
ideon write resume --no-interactive
```

## Link Enrichment

- Link enrichment is a post-generation link-suggestion pass for eligible long-form markdown outputs.
- It selects phrases, resolves source URLs, and writes `*.links.json` sidecar files without rewriting markdown.
- During `ideon write resume`, enrichment runs only when `--enrich-links` is provided.
- Short-form channels such as `x-post` and `x-thread` are skipped.

## Output and Exit Codes

On success, Ideon continues from the latest checkpointed stage and writes final outputs to the run directory.

| Exit code | Meaning |
| --- | --- |
| `0` | Resume completed successfully. |
| `1` | No resumable session or runtime failure occurred. |
| `130` | Command interrupted by `Ctrl+C`. |

## Related Commands

- [ideon write [idea]](./ideon-write.md)
- [ideon preview [markdownPath]](./ideon-preview.md)

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- No deprecated flags apply to this command.
