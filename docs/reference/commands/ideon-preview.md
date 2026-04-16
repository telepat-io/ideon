---
title: ideon preview [markdownPath]
description: Start the local preview server and React preview app for generated Ideon content.
keywords: [ideon, cli, preview, local server, react]
image: /img/logo.svg
---

# ideon preview [markdownPath]

## What This Command Does

`ideon preview [markdownPath]` starts the local preview API and serves the React preview UI so you can inspect generated outputs and assets in a browser.

## Usage

```bash
ideon preview [markdownPath] [--port <port>] [--no-open] [--watch]
```

## Arguments and Options

| Flag/Argument | Shorthand | Required | Type | Default | Allowed Values | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `[markdownPath]` | None | No | string (path) | Newest generated markdown in output directory | Valid markdown file path | Specific markdown output to preview. |
| `--port <port>` | `-p` | No | integer | `4173` | Valid TCP port | Port for the preview server. |
| `--no-open` | None | No | boolean | `false` | `true` or omitted | Starts server without opening a browser. |
| `--watch` | None | No | boolean | `false` | `true` or omitted | Rebuilds preview UI on source changes and auto-reloads browser. |

## Examples

```bash title="Minimal happy path"
ideon preview
```

```bash title="Common real-world path"
ideon preview ./output/my-article.md --port 4173 --no-open
```

```bash title="Debug-focused development path"
ideon preview --watch --no-open
```

## Output and Exit Codes

On success, Ideon prints the preview URL, selected article path, and served asset directory.

| Exit code | Meaning |
| --- | --- |
| `0` | Preview server started successfully. |
| `1` | Preview failed due to invalid path, invalid port, or runtime errors. |
| `130` | Command interrupted by `Ctrl+C`. |

## Related Commands

- [ideon write [idea]](./ideon-write.md)
- [`ideon delete <slug>`](./ideon-delete.md)
- [Local Preview Guide](../../guides/local-preview.md)

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- No deprecated flags apply to this command.
