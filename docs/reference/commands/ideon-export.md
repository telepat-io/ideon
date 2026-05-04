---
title: "ideon export <generationId> <path>"
description: Export a generated article as a standalone markdown file with inline links and copied images.
keywords: [ideon, cli, export, inline links, images]
---

# `ideon export <generationId> <path>`

## What This Command Does

`ideon export` assembles a **self-contained, portable markdown file** from a previously generated article by:

1. Reading the source markdown from the generation directory.
2. Loading its `.links.json` sidecar (both `customLinks` and `links`) and injecting them inline into the body text.
3. Copying all locally referenced images to the destination directory, preserving their relative sub-paths.
4. Writing the enriched markdown to `<path>/<slug>.md`.

The original generation directory and sidecar are left untouched.

## Usage

```bash
ideon export <generationId> <path> [--index <n>] [--overwrite]
```

## Arguments and Options

| Flag/Argument | Required | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `<generationId>` | Yes | string | n/a | Generation folder id (e.g. `20260418-185448-my-article`) or the article's frontmatter `slug`. |
| `<path>` | Yes | string | n/a | Destination **directory** for the exported file and images. Created if it does not exist. |
| `--index <n>` | No | positive integer | `1` | Which primary article variant to export when a generation produced more than one. |
| `--overwrite` | No | boolean flag | `false` | Replace the destination file if it already exists. Without this flag the command fails with an error if the file is present. |

## Output File Naming

The exported file is named after the `slug` field in the article's YAML frontmatter:

```
<path>/<slug>.md
```

## Image Handling

All Markdown image references of the form `![alt](relative/path)` are detected and copied to the destination, maintaining the same relative sub-path structure. Absolute URLs and data URIs are ignored.

If a referenced image file is missing from the source generation directory the command fails immediately with an error describing the missing file.

## Link Injection

Links are loaded from the sidecar `<article>.links.json` file. Both `customLinks` and `links` arrays are merged and applied. If no sidecar exists, the markdown is exported as-is without link injection.

The YAML frontmatter block is preserved exactly as written; link injection only applies to the body text.

## Overwrite Guard

Without `--overwrite`, if `<path>/<slug>.md` already exists the command **exits with an error** before writing anything. This prevents accidental overwrites.

## Examples

Export the most recently generated article to `~/exports/`:

```bash
ideon export 20260418-185448-metabolic-stability ~/exports/
```

Export by slug (shorthand when the slug is unique):

```bash
ideon export metabolic-stability-protocol ~/exports/
```

Export the second variant in a multi-article generation:

```bash
ideon export 20260418-185448-my-article ~/exports/ --index 2
```

Export even if the file already exists:

```bash
ideon export my-article ~/exports/ --overwrite
```

## Related Commands

- [`ideon links <slug>`](./ideon-links.md) — update the `.links.json` sidecar before exporting.
- [`ideon preview`](./ideon-preview.md) — serve articles locally with live link rendering without exporting.
