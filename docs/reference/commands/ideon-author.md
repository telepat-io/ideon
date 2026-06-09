---
title: ideon author
description: Manage author profiles for voice, experience, and expertise injected into writing prompts.
keywords: [ideon, cli, author, profile, eeat, expertise]
image: /img/logo.svg
---

# ideon author

## What This Command Does

`ideon author` manages first-class author profiles. Each author has a name, auto-generated slug, and a freeform **profile** (experience, voice, style, credentials). Author context is injected into all content-writing prompts when resolved for a run.

## Author Resolution Chain

When a write run starts, Ideon resolves the active author in this order:

```
CLI --author / job.author → series.defaults.defaultAuthor → publication.defaults.defaultAuthor
```

Per-run **experience notes** (`--experience` or `job.experienceNotes`) supplement standing series experience (`series.defaults.experienceNotes`). Both are concatenated when present.

## Subcommands

- [`ideon author add`](#ideon-author-add) — Create a new author
- [`ideon author list`](#ideon-author-list) — List all authors
- [`ideon author edit`](#ideon-author-edit) — Edit an existing author
- [`ideon author remove`](#ideon-author-remove) — Delete an author

---

## ideon author add

Create a new author profile.

### Usage

```bash
ideon author add [name] [--profile <text>]
```

| Flag | Required | Description |
| --- | --- | --- |
| `[name]` | Yes (or interactive) | Author display name. Slug is derived automatically. |
| `--profile <text>` | Recommended | Freeform profile: experience, voice, credentials, anecdotes the model may weave in. |

### Example

```bash
ideon author add "Alex Chen" --profile "Staff SRE at a fintech startup. Writes about Kubernetes, incident response, and platform engineering."
```

---

## ideon author list

List all author profiles.

```bash
ideon author list [--json] [--verbose]
```

---

## ideon author edit

```bash
ideon author edit <slug> [--name <name>] [--profile <text>]
```

---

## ideon author remove

```bash
ideon author remove <slug> [-f|--force]
```

---

## Related Commands

- Set a default author on a publication: `ideon publication edit <slug> --author <author-slug>`
- Set a default author and standing experience on a series: `ideon series edit <slug> --author <author-slug> --experience <text>`
- Override per run: `ideon write "..." --author <author-slug> --experience "Article-specific anecdote"`

See also: [ideon write](./ideon-write.md), [ideon series](./ideon-series.md).
