---
title: ideon queue
description: Manage the content queue for scheduling future article writes.
keywords: [ideon, cli, queue, content, schedule, plan]
image: /img/logo.svg
---

# ideon queue

## What This Command Does

`ideon queue` manages the content queue — a global list of pending articles waiting to be written. Queue entries store a fully resolved snapshot of the write parameters at enqueue time, so they are self-contained and portable.

## Subcommands

- [`ideon queue add`](#ideon-queue-add) — Add an article to the queue
- [`ideon queue list`](#ideon-queue-list) — List queued articles
- [`ideon queue peek`](#ideon-queue-peek) — Show the next pending article without consuming it
- [`ideon queue remove`](#ideon-queue-remove) — Delete a queued article by ID
- [`ideon queue clear`](#ideon-queue-clear) — Delete all queued articles

## How It Works

When you add an article to the queue, Ideon resolves all parameters (publication defaults, series defaults, style, intent, length, content targets) and saves a snapshot to `~/.config/ideon/queue/<id>.json`. Each entry is one file.

When you run `ideon write --from-queue`, the next pending entry is atomically claimed (renamed to `.in-progress.json`), written, and then deleted on success. If the write fails or is interrupted, the entry is automatically restored to `pending`.

## Storage

Queue entries are stored as individual JSON files in `~/.config/ideon/queue/`. Each file contains:

- `id` — Unique identifier (UUID)
- `status` — `pending` or `in-progress`
- `idea` — The content idea
- `settings` — Fully resolved `AppSettings` snapshot
- `publication` — Full publication object (if specified)
- `series` — Full series object (if specified)
- `job` — Inlined job definition (if `--job` was used)
- `exportPath` — Export destination (if `--export` was used)
- `addedAt` — ISO timestamp

## Atomic Guard

Queue operations use file rename as an atomic guard. When `ideon write --from-queue` picks up an entry, it renames `<id>.json` to `<id>.in-progress.json`. A second concurrent process will fail the rename and skip to the next entry.

On success, the `.in-progress` file is deleted. On failure or interruption, it is renamed back to `.json` with `status: 'pending'`.

---

## ideon queue add

Add an article to the content queue.

### Usage

```bash
ideon queue add [idea] [--idea <idea>] [--audience <description>] [--job <path>] [--primary <type=1>] [--secondary <type=count> ...] [--style <style>] [--intent <intent>] [--length <size-or-words>] [--publication <slug>] [--series <slug>] [--no-interactive] [--export <path>]
```

### Options

`ideon queue add` accepts the same content-defining options as [`ideon write`](./ideon-write.md#arguments-and-options). Adding a new option to `ideon write` automatically makes it available in `ideon queue add`.

| Flag | Required | Type | Description |
| --- | --- | --- | --- |
| `[idea]` | No | string | Positional idea prompt. |
| `--idea <idea>` | No | string | Explicit idea prompt. |
| `--audience <description>` | No | string | Audience hint for shared-plan targeting. |
| `--job <path>` | No | string | Path to a JSON job definition. Settings are snapshotted at enqueue time. |
| `--primary <type=1>` | Yes in non-interactive | string | Primary output target. |
| `--secondary <type=count>` | No | repeatable string | Secondary output targets. |
| `--style <style>` | No | enum | Writing style. |
| `--intent <intent>` | No | enum | Content intent. |
| `--length <size-or-words>` | No | enum or integer | Target length. |
| `--publication <slug>` | No | string | Publication for defaults and editorial policy. |
| `--series <slug>` | No | string | Content series for defaults and thematic context. |
| `--keywords <keywords>` | No | string | Comma-separated SEO keywords. Supports compound keywords. Merges with series keywords. |
| `--no-interactive` | No | boolean | Fail instead of prompting for missing input. |
| `--export <path>` | No | string | Export destination after writing. Stored in queue entry. |

### Examples

```bash
# Queue a simple idea
ideon queue add "How AI changes technical publishing" --primary article=1 --style technical --intent tutorial

# Queue with publication and series
ideon queue add "Deep dive into RAG" --primary article=1 --publication tech-blog --series ai-deep-dives

# Queue with all options
ideon queue add "Our Q3 launch" --primary article=1 --secondary x-thread=2 --style professional --intent announcement --length large --publication blog --export ./out

# Queue from a job file
ideon queue add --job ./planned-article.json
```

### Notes

- All parameters are resolved and snapshotted at enqueue time. Changing publication or series defaults later does not affect already-queued entries.
- The `--export` path is stored as-is. If the directory moves before writing, the export will fail at write time.
- In interactive mode (TTY), missing style/intent/length/targets are prompted for, just like `ideon write`.

---

## ideon queue list

List queued articles.

### Usage

```bash
ideon queue list [--json] [--publication <slug>] [--status <status>]
```

### Options

| Flag | Type | Description |
| --- | --- | --- |
| `--json` | boolean | Output as JSON array. |
| `--publication <slug>` | string | Filter by publication slug. |
| `--status <status>` | string | Filter by status: `pending` or `in-progress`. Defaults to all. |

### Examples

```bash
# List all queued articles
ideon queue list

# Filter by publication
ideon queue list --publication tech-blog

# JSON output for scripting
ideon queue list --json

# Show only pending entries
ideon queue list --status pending
```

---

## ideon queue peek

Show the next pending article without consuming it.

### Usage

```bash
ideon queue peek [--publication <slug>]
```

### Options

| Flag | Type | Description |
| --- | --- | --- |
| `--publication <slug>` | string | Filter by publication slug. |

### Examples

```bash
# See what's next
ideon queue peek

# See next for a specific publication
ideon queue peek --publication tech-blog
```

---

## ideon queue remove

Delete a queued article by ID.

### Usage

```bash
ideon queue remove <id> [--force]
```

### Options

| Flag | Required | Type | Description |
| --- | --- | --- | --- |
| `<id>` | Yes | string | Queue entry ID to delete. |
| `--force` / `-f` | No | boolean | Skip confirmation prompt. |

### Examples

```bash
# With confirmation prompt
ideon queue remove 550e8400-e29b-41d4-a716-446655440000

# Force delete
ideon queue remove 550e8400-e29b-41d4-a716-446655440000 --force
```

---

## ideon queue clear

Delete all queued articles.

### Usage

```bash
ideon queue clear [--force]
```

### Options

| Flag | Required | Type | Description |
| --- | --- | --- | --- |
| `--force` / `-f` | No | boolean | Skip confirmation prompt. |

### Examples

```bash
# With confirmation prompt
ideon queue clear

# Force clear
ideon queue clear --force
```

---

## Using the Queue with `ideon write`

### Dequeue and Write

```bash
# Write the next pending article
ideon write --from-queue

# Write the next pending article for a specific publication
ideon write --from-queue --publication tech-blog

# Override queued settings at write time
ideon write --from-queue --style playful
```

### Behavior

- `--from-queue` picks the oldest `pending` entry, atomically claims it, and writes it.
- On success, the queue entry is deleted.
- On failure or `Ctrl+C`, the entry is automatically restored to `pending`.
- Any CLI flags passed alongside `--from-queue` override the snapshotted settings.
- If the queue is empty (or no entries match `--publication`), the command fails with an error.

## Related Commands

- [ideon write [idea]](./ideon-write.md)
- [ideon write resume](./ideon-write-resume.md)
- [ideon publication](./ideon-series.md) (publication and series management)
