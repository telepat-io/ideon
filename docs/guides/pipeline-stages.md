---
title: Pipeline Stages
description: Pipeline Stages documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Pipeline Stages

Ideon runs an eight-stage pipeline with live status updates and per-stage analytics.

## Stage Flow

### Writing Pipeline

All write runs follow the same eight stages:

1. **Planning Shared Plan**
2. **Planning Primary Content**
3. **Writing Primary Content**
4. **SEO Check** (lint + optional editor agent pass)
5. **Expanding Image Prompts**
6. **Rendering Images**
7. **Generating Channel Content**
8. **Enriching Links**

Stage behavior depends on content type:

- Long-form primary (`article`, `blog-post`, `newsletter`, `press-release`, `science-paper`): the plan includes sections and inline images, and stage 3 writes intro, sections, and conclusion.
- Short-form primary (`x-post`, `x-thread`, `linkedin-post`, `reddit-post`): the plan includes title, description, and angle, and stage 3 generates single-shot primary content.
- For long-form primaries, stage 4 runs deterministic SEO lint and, when triggered, a surgical SEO editor agent (default max 10 turns, configurable) that patches plan metadata, section headings, and prose only (`edit_plan_metadata`, `edit_section_heading`, `edit_intro`, `edit_section_body`, `edit_outro`). Pass mode defaults to `errors-only` (warnings do not fail the stage); use `--seo-check-mode strict` for zero-tolerance. Skip with `--no-seo-check`. Re-run manually with `ideon write resume --seo-check` or MCP `ideon_run_seo_check`.
- For all primaries, stages 5–6 prepare and render the primary cover image.
- `links`: runs only when `--enrich-links` is enabled and writes sidecar link metadata for eligible long-form outputs

## Stage UI Signals

- `pending`: not started
- `running`: currently executing
- `succeeded`: completed successfully
- `failed`: errored with detail

The live TTY UI intentionally hides pending rows to keep output compact. It shows:

- currently running stage and item
- completed history
- failed rows
- retry context on stage detail when transient errors trigger retries (`retried Nx`, last retry error)

Item history is rendered with a terminal-adaptive window so long runs stay readable on short terminals while preserving the most recent progress.

## Updates During Execution

- Section stage reports active section index/title
- SEO-check stage reports lint issue counts and editor turn usage
- Image-prompt stage reports current prompt expansion
- Image-render stage reports current rendering progress
- Output stage reports secondary per-item generation progress and final generation directory
- Links stage reports per-item link enrichment and sidecar metadata writes
- When a stage reaches `succeeded`, the CLI prints stage analytics (duration and cost when available)
- Non-TTY/plain output also emits running-stage detail changes so retry/error progress is visible outside the interactive UI

For stages that produce multiple units of work, Ideon emits item-level status rows with the same state model (`pending`, `running`, `succeeded`, `failed`).

Examples:

- section writing item updates (`Introduction`, `Section 2/N`, `Conclusion`)
- secondary output item updates (`x post 1/10`, `linkedin post 2/3`)
- link enrichment item updates (`article-1`, `linkedin-1`)

Each item shows a spinner while running and prints item analytics as soon as it succeeds.

## Analytics Captured

For each generation run, Ideon records:

- Stage duration (ms) for all eight stages
- Stage retry counts for external API calls
- Stage cost totals when pricing data is available
- Per-image prompt expansion call metrics (duration, retries, token usage, cost)
- Per-image render call metrics (duration, retries, output bytes, cost)
- Per-output item call metrics (duration, retries, cost)
- Per-link-enrichment item call metrics (duration, retries, cost, phrase count)

Analytics are written to `generation.analytics.json` in each generation directory.

At pipeline completion, the CLI also shows aggregated totals for run duration, retry count, and total cost.
It also includes a stage-by-stage cost breakdown so you can see where spend occurred within the run.

## Failure Semantics

When a stage fails:

- Current running stage is marked failed with detail
- Completed stages remain succeeded
- Remaining stages stay pending
- Error bubbles to CLI with clean user-facing handling

## Resume Semantics

- Each completed stage checkpoint is persisted to the session state file.
- Checkpoints are stored in the user's config directory, keyed by project path.
- `ideon write resume` reloads saved artifacts and skips already-completed stages.
- Resume works from any directory — session state is no longer tied to the working directory.
- Resume currently checkpoints at stage boundaries, so in-progress work inside a stage is retried from that stage.
- Resume is also allowed after a completed session to regenerate missing downstream artifacts from cached state.

## Interrupt Behavior

- `Ctrl+C` (SIGINT) and SIGTERM are recorded as a failed session when a write session exists.
- Ideon writes an interruption message into session state so `ideon write resume` can continue from the last completed stage.

## Dry-Run Behavior

- Stage orchestration still executes and analytics are emitted.
- External OpenRouter and Replicate calls are skipped.
- Output artifacts are still written so directory structure and orchestration can be validated without provider spend.

## SEO Check Stage Behavior

- Runs by default after section writing for long-form primaries.
- **Deterministic lint** checks title/description length, primary keyword placement, keyword coverage, BLUF openers (≥40 words in the first paragraph, or in the `**Key takeaway:**` block when present), and fact-density heuristics.
- **Pass modes** (`seoCheckMode`, default `errors-only`):
  - `errors-only`: stage passes when no lint issues have `severity: error`; warnings are recorded but do not trigger the agent or fail the stage.
  - `strict`: stage passes only when zero lint issues remain; any warning triggers the editor agent.
- **Agent trigger:** `errors-only` runs the agent only when errors exist; `strict` runs when any issue exists; `force` (`--seo-check` / `ideon_run_seo_check`) always runs the agent path.
- When triggered and OpenRouter is available, a **surgical SEO editor agent** uses five prose/metadata tools with an inline issue playbook and the full draft plus keyword-integration guide in context.
- **CLI / config:** `--seo-check-mode <errors-only|strict>`, `--seo-check-max-turns <n>` (1–20, default 10); settings `seoCheckMode` and `seoCheckMaxTurns` in the settings file. MCP `ideon_write`, `ideon_write_resume`, and `ideon_run_seo_check` accept the same optional params.
- **Tool feedback:** each tool call returns `remainingErrors`, `remainingWarnings`, and `remainingIssues` for mode-aware stop rules.
- **Failure mode:** unresolved issues are logged, results are recorded in `meta.json` (`seoCheck`), and the pipeline continues.
- **Skip:** `--no-seo-check` on `ideon write`.
- **Re-run:** `ideon write resume --seo-check` or MCP `ideon_run_seo_check`.

## Output Stage Behavior

- The primary output is always generated first and written as `<primary-prefix>-1.md`.
- Secondary targets are expanded into numbered files by content type (`x-thread-1.md`, `x-post-1.md`, etc.).
- Long-form primaries use section-generation artifacts; short-form primaries use single-shot primary generation.
- Secondary outputs are anchored to generated primary context.
- The output stage also writes `job.json` with the resolved run definition and `meta.json` with structured content metadata.
- Output progress is itemized in the CLI and persisted in analytics under `outputItemCalls`.

## Links Stage Behavior

- Link enrichment uses the configured model with OpenRouter web search plugin enabled.
- Link enrichment is a post-generation link-suggestion pass for eligible long-form markdown outputs.
- Ideon first selects linkable expressions, then resolves a best-fit URL for each expression using paragraph context.
- Link data is written to sidecar files next to markdown outputs (for example `article-1.links.json`), in v2 format: `{ version: 2, customLinks: [...], links: [...] }`.
- Source markdown files are preserved unchanged; the preview server applies sidecar links at render time.
- During `ideon write` and `ideon write resume`, this stage is opt-in via `--enrich-links`.
- Short-form channels (`x-post`, `x-thread`) are skipped by default for link enrichment.
- **Custom links** (`--link "expression->url"`) are stored separately and always preserved regardless of `--mode fresh`. Use `--unlink <expression>` to remove a custom link.
- Custom links take precedence: if the LLM selects an expression already covered by a custom link, the generated entry for that expression is discarded.
- **Custom links replace every unprotected occurrence** of their expression in the article body; generated links only replace the first occurrence.
- **Max links** (`--max-links <n>`) caps the number of generated links. Defaults to 5 / 8 / 12 based on the article's target word count (≤700 / ≤1150 / >1150).

## Content Planning Pipeline

The `ideon plan` command uses a separate seven-stage pipeline optimized for keyword research and content strategy rather than prose generation. See the [Content Planning guide](./content-planning.md) for full details.

| Stage | Label | What happens |
|-------|-------|--------------|
| 1 | `hydrate` | Load publication, series, output history, and GKP cache |
| 2 | `seeds` | Generate seed keywords from the content idea or existing series |
| 3 | `research` | Iterative GKP queries with broadening and low-volume detection |
| 4 | `score` | KOB scoring, intent classification, and candidate filtering |
| 5 | `cluster` | Group shortlisted keywords into thematic series (explore mode only) |
| 6 | `plan-articles` | Plan individual articles with keywords, intent, format, and priority |
| 7 | `persist` | Save series, update keywords, and queue articles |

### Key differences from the writing pipeline

- **No image stages** — Planning doesn't generate images
- **No link enrichment** — Planning focuses on keyword strategy, not link insertion
- **No section writing** — Articles are planned, not drafted
- **GKP integration** — Every research round queries live Google Ads Keyword Planner data
- **Two modes** — `explore` creates new series from scratch; `expand` adds articles to an existing series
- **Approval gates** — All state mutations wait for explicit user approval (unless `--auto-save`)
