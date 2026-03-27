---
title: CLI Reference
---

# CLI Reference

## Global

```bash
ideon --help
ideon --version
```

## `ideon settings`

Shows the interactive settings flow.

```bash
ideon settings
```

Capabilities:

- View and edit current settings
- Select and configure LLM model settings
- Select T2I model and edit model-specific overrides
- Configure output directories
- Save OpenRouter and Replicate credentials securely

## `ideon write [idea]`

Generates an article from direct idea input or a job file.

```bash
ideon write "How to productionize editorial AI"
ideon write --job ./job.json
ideon write --dry-run "How to productionize editorial AI"
```

### Options

- `-j, --job <path>`: path to JSON job file
- `--dry-run`: run full orchestration without external provider calls

When a fresh write starts, Ideon resets `.ideon/write/state.json` and stores new temporary pipeline artifacts for that run.

## `ideon write resume`

Retries the most recent failed or interrupted write session from saved `.ideon/write` artifacts.

```bash
ideon write resume
```

Notes:

- Resume continues from the latest completed stage snapshot.
- If the last session already completed, Ideon asks you to start a fresh write instead.
- If no session exists, run `ideon write <idea>` first.

## Exit Behavior

- Success: exit code `0`
- Failure: exit code `1`

Handled failures are presented without noisy stack traces.
