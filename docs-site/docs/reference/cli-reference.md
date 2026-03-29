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

Generates exactly one primary content output plus zero or more secondary outputs from direct idea input or a job file.

```bash
ideon write "How to productionize editorial AI"
ideon write --job ./job.json
ideon write --dry-run "How to productionize editorial AI"
ideon write "How to productionize editorial AI" --primary article=1 --secondary x-thread=2 --secondary x-post=1 --style technical
ideon write "How to productionize editorial AI" --length large --primary article=1
ideon write "How to productionize editorial AI" --audience "B2B SaaS founders shipping content with tiny teams"
```

### Options

- `-j, --job <path>`: path to JSON job file
- `--primary <type=count>`: required primary target for the run (must be exactly `count=1`)
- `--secondary <type=count>`: optional secondary target, repeatable
- `--style <style>`: writing style (`professional`, `friendly`, `technical`, `academic`, `opinionated`, `storytelling`)
- `--length <size>`: target length tier (`small`, `medium`, `large`)
- `--audience <description>`: optional natural-language audience seed used to guide and enrich the shared brief `targetAudience`
- `--dry-run`: run full orchestration without external provider calls

Supported target types:

- `article`
- `blog-post`
- `x-thread`
- `x-post`
- `reddit-post`
- `linkedin-post`
- `newsletter`
- `landing-page-copy`

Defaults:

- If no style is provided, Ideon uses `professional`.
- If no length is provided, Ideon uses `medium`.
- If no audience is provided, Ideon seeds the shared brief with a general non-specific audience.

Target rules:

- You must provide exactly one primary target (either via `--primary`, job file, or interactive TTY prompt).
- Primary count must be `1`.
- Secondary targets are optional and can be repeated.
- A content type cannot be both primary and secondary in the same run.

Idea resolution order:

1. `--idea`
2. positional `[idea]`
3. `job.idea`
4. `job.prompt`

Audience seed resolution order:

1. `--audience`
2. `job.targetAudience`
3. general non-specific fallback used by shared brief planning

Interactive behavior:

- In TTY mode, Ideon asks only for missing write variables.
- If style is missing, it prompts for style.
- If length is missing, it prompts for target length (`small`, `medium`, `large`).
- If targets are missing, it prompts for one primary type, optional secondary types, and per-type counts.

When a fresh write starts, Ideon resets `.ideon/write/state.json` and stores new temporary pipeline artifacts for that run.

Dry-run behavior:

- The full stage orchestration still runs.
- OpenRouter and Replicate network calls are skipped.
- Ideon still writes generation artifacts (`job.json`, `generation.analytics.json`, and markdown outputs) using dry-run-compatible content.

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
- If the last session already completed, resume is still allowed so missing/corrupted downstream artifacts can be regenerated.
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
- Slug lookup checks direct output first, then recursively searches nested generation directories for `<slug>.md` and chooses the most recently updated match.
- In generation directories with multiple markdown outputs, Ideon removes only the selected markdown and analytics sidecar and preserves shared assets while sibling markdown files remain.

### Options

- `-f, --force`: skip the confirmation prompt

## `ideon preview [markdownPath]`

Starts the local preview server and serves the React preview app for generated content batches.

```bash
ideon preview
ideon preview ./output/my-article.md
ideon preview --port 4173 --no-open
```

Behavior:

- If `markdownPath` is omitted, Ideon previews the newest `.md` file recursively in the configured markdown output directory.
- Preview groups outputs by generation directory, then by content type and output index.
- Generation-local relative asset links are rewritten and served by generation-scoped preview routes.
- `/` serves the built React app from `dist/preview` when available.
- The UI reads preview data through `/api/bootstrap`, `/api/articles`, and `/api/articles/:slug`.
- Browser auto-open is enabled by default.

If the React client build is missing, preview falls back to a server-rendered shell instead of failing startup.

Developer note:

- `npm run preview` is an optional convenience wrapper for `ideon preview` in this repository.
- In this repository, `npm run preview` also runs `npm run build:preview` before starting the server.

### Options

- `-p, --port <port>`: preview server port (default: `4173`)
- `--no-open`: start server without opening a browser

## Exit Behavior

- Success: exit code `0`
- Failure: exit code `1`

Handled failures are presented without noisy stack traces.
