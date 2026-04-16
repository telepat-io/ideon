---
title: ideon delete <slug>
description: Delete a generated markdown output by slug with safe handling of shared assets.
keywords: [ideon, cli, delete, cleanup, output]
---

# `ideon delete <slug>`

## What This Command Does

`ideon delete <slug>` removes a generated markdown output and its analytics sidecar, and removes the generation asset directory only when no sibling markdown outputs remain.

## Usage

```bash
ideon delete <slug> [--force]
```

## Arguments and Options

| Flag/Argument | Shorthand | Required | Type | Default | Allowed Values | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `<slug>` | None | Yes | string | n/a | Generated article slug without `.md` | Slug of the generated output to delete. |
| `--force` | `-f` | No | boolean | `false` | `true` or omitted | Skips interactive delete confirmation. |

## Examples

```bash title="Minimal happy path"
ideon delete my-article-slug
```

```bash title="Common real-world path"
ideon delete my-article-slug --force
```

```bash title="Safety and debugging path"
ideon delete my-article-slug --force && ideon preview --no-open
```

## Output and Exit Codes

On success, Ideon prints deleted paths and cleanup details.

| Exit code | Meaning |
| --- | --- |
| `0` | Delete completed successfully. |
| `1` | Delete failed due to missing slug, permissions, or runtime errors. |
| `130` | Command interrupted by `Ctrl+C`. |

## Related Commands

- [ideon write [idea]](./ideon-write.md)
- [ideon preview [markdownPath]](./ideon-preview.md)

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- No deprecated flags apply to this command.
