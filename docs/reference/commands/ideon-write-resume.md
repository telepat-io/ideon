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
ideon write resume [--no-interactive]
```

## Arguments and Options

| Flag/Argument | Shorthand | Required | Type | Default | Allowed Values | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `--no-interactive` | None | No | boolean | `false` | `true` or omitted | Forces plain non-interactive rendering even in TTY mode. |

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
