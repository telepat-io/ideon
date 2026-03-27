---
title: Output Structure
---

# Output Structure

Ideon writes one Markdown artifact and a set of image assets.

## Default Paths

- Markdown directory: `/output`
- Asset directory: `/output/assets`

Paths beginning with `/output` are resolved relative to current working directory.

## Markdown Contents

Generated Markdown includes:

- YAML frontmatter:
  - `title`
  - `subtitle`
  - `slug`
  - `description`
  - `keywords`
- H1 title and subtitle line
- Cover image embed (when present)
- Intro body
- Section bodies (H2 headings)
- Inline image embeds anchored to section positions
- Conclusion section

## Slug Behavior

Generated slug is normalized and checked for collisions. If a slug exists, Ideon appends incrementing suffixes (`-1`, `-2`, ...).

## Asset Links

Markdown embeds use relative paths from markdown file location to asset files.
