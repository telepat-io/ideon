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

Generates one or more content outputs from direct idea input or a job file.

```bash
ideon write "How to productionize editorial AI"
ideon write --job ./job.json
ideon write --dry-run "How to productionize editorial AI"
ideon write "How to productionize editorial AI" --target article=1 --target x-post=3 --style technical
```

### Options

- `-j, --job <path>`: path to JSON job file
- `-t, --target <type=count>`: generation target, repeatable (for example `article=1`, `x-post=10`)
- `--style <style>`: writing style (`professional`, `friendly`, `technical`, `academic`, `opinionated`, `storytelling`)
- `--dry-run`: run full orchestration without external provider calls

Supported target types:

- `article`
- `blog-post`
- `x-post`
- `reddit-post`
- `linkedin-post`
- `newsletter`
- `landing-page-copy`

Defaults:

- If no targets are provided, Ideon uses `article=1`.
- If no style is provided, Ideon uses `professional`.

Interactive behavior:

- In TTY mode, Ideon asks only for missing write variables.
- If style is missing, it prompts for style.
- If targets are missing, it prompts for content types and per-type counts.
- If `x-post` is selected and `xMode` is missing, it prompts for `single` or `thread` output mode.

When a fresh write starts, Ideon resets `.ideon/write/state.json` and stores new temporary pipeline artifacts for that run.

During execution, each stage transition to `succeeded` includes stage analytics output (duration and cost when available). The final summary includes total duration, retries, and total cost for the run.

Write outputs are stored in one generation directory per run and include:

- numbered markdown outputs by content type
- `job.json` with resolved run definition metadata
- `generation.analytics.json` with run analytics

## `ideon write resume`

Retries the most recent failed or interrupted write session from saved `.ideon/write` artifacts.

```bash
ideon write resume
```

Notes:

- Resume continues from the latest completed stage snapshot.
- If the last session already completed, Ideon asks you to start a fresh write instead.
- If no session exists, run `ideon write <idea>` first.

## `ideon delete <slug>`

Deletes a generated markdown output by slug, including its analytics sidecar and generation assets when safe to remove.

```bash
ideon delete my-article-slug
ideon delete my-article-slug --force
```

Behavior:

- By default, Ideon shows an interactive confirmation menu you can navigate with the arrow keys before deleting anything.
- In non-interactive environments, use `--force` to skip confirmation.
- If the slug does not exist, Ideon fails without deleting anything.
- In generation directories with multiple markdown outputs, Ideon resolves the best matching markdown path and preserves shared assets when sibling markdown files remain.

### Options

- `-f, --force`: skip the confirmation prompt

## `ideon preview [markdownPath]`

Starts a local preview server for generated content batches, including generation-local assets.

```bash
ideon preview
ideon preview ./output/my-article.md
ideon preview --port 4173 --no-open
npm run preview
```

Behavior:

- If `markdownPath` is omitted, Ideon previews the newest `.md` file recursively in the configured markdown output directory.
- Preview groups outputs by generation directory, then by content type and output index.
- Generation-local relative asset links are rewritten and served by preview routes.
- Browser auto-open is enabled by default.

### Options

- `-p, --port <port>`: preview server port (default: `4173`)
- `--no-open`: start server without opening a browser

## Exit Behavior

- Success: exit code `0`
- Failure: exit code `1`

Handled failures are presented without noisy stack traces.
