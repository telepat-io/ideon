---
name: ideon-cli
description: Use this skill when users need to install, configure, run, automate, preview, and troubleshoot the Ideon CLI (including MCP server workflows) from zero context.
---

# Ideon CLI Skill

## What this skill does

This skill helps users operate Ideon as a content writer platform, not just a command runner.

Ideon can turn one idea into many publish-ready outputs (article, blog, newsletter, Reddit, LinkedIn, X thread/X post, press release, science paper), apply a selected writing style and intent, optionally enrich content with relevant links, generate visuals for article-led runs, and support iterative refinement through reruns, preview, and resume.

Use this skill to move from install -> setup -> first publishable drafts -> iterative improvements -> cleanup, without assuming prior Ideon knowledge.

## Installation

Prerequisites:

- Node.js 20+
- npm 10+
- OpenRouter API key
- Replicate API token

Install paths:

```bash
# Global install
npm i -g @telepat/ideon

# Verify install
ideon --help
ideon --version
```

## Setup and first run

Non-interactive setup (agents, CI, containers — always use this):

```bash
TELEPAT_DISABLE_KEYTAR=true \
TELEPAT_OPENROUTER_KEY=sk-... \
TELEPAT_REPLICATE_TOKEN=r8_... \
ideon config list --json
```

Human users may also run `ideon settings` for an interactive setup wizard. Agents should never invoke `ideon settings` — it prompts for user input on stdin.

Setup verification checks:

```bash
# Confirm config surface and secret presence flags
ideon config list --json

# Safe smoke run with no provider API calls
ideon write --dry-run "Smoke test ideon pipeline" --primary article=1 --style professional --intent tutorial --length medium --no-interactive
```

## Local readiness checks

Readiness checklist:

1. CLI responds: `ideon --help`
2. Config readable: `ideon config list --json`
3. Pipeline orchestration works: `ideon write --dry-run ...`
4. Preview opens: `ideon preview --no-open`

Expected success signals:

- Write command exits with code `0` and prints completion output.
- Preview prints `Open http://localhost:<port>` (default `4173`).

## When to use this skill

Use this skill when:

- You need an AI content writer workflow that produces multiple channel-ready outputs from one idea.
- You need to install and configure Ideon from scratch.
- You need reliable non-interactive automation for CI/agents.
- You need to debug failed, interrupted, or misconfigured content runs.
- You need to export generated content as standalone markdown with all assets to a directory.
- You need local preview and URL handoff steps.
- You need first-party MCP server usage with Ideon tools.

Do not use this skill when:

- You only need a quick explanation of one flag.
- You are building VS Code/Cursor runtime integrations (explicitly unsupported by Ideon agent runtime registration).
- You need product architecture discussion without CLI execution.

## Inputs to collect from user

Always collect all relevant inputs before running any command. Ask the user for the values needed based on the operation they want.

### Write / resume

| Input | Required | Why it matters |
| --- | --- | --- |
| Idea text | Yes | Required by `ideon write` unless a job file provides it. |
| Primary target (`--primary`) | Yes | Must be exactly one primary with count `1`. |
| Secondary targets (`--secondary`) | No | Optional channel variants and counts. |
| Style (`--style`) | Yes | Required for non-interactive runs when not supplied via job. |
| Intent (`--intent`) | Yes | Required for non-interactive runs when not supplied explicitly. |
| Length (`--length`) | Yes | Required for non-interactive runs when not supplied via job. `small` / `medium` / `large`. |
| Publication (`--publication`) | No | Publication slug for defaults and editorial policy. |
| Series (`--series`) | No | Content series slug for defaults and thematic context. |
| Keywords (`--keywords`) | No | Comma-separated SEO keywords. Supports compound keywords. Merges with series keywords. |
| Audience (`--audience`) | No | Target audience description injected into editorial policy. |
| Enrich links (`--enrich-links`) | No | Opt-in web research link enrichment for long-form outputs. |
| Max links (`--max-links`) | No | Cap generated links (defaults: ≤700w→5, ≤1150w→8, >1150w→12). |
| Max images (`--max-images`) | No | Cap total images (1=cover only, higher=cover+inline). |
| Credentials strategy | Yes | Env-based secrets for CI/agents (`TELEPAT_OPENROUTER_KEY`, `TELEPAT_REPLICATE_TOKEN`). |
| Run mode | Yes | Fresh run vs `ideon write resume` vs `ideon write --from-queue`. |

### Plan explore / expand

| Input | Required | Why it matters |
| --- | --- | --- |
| Content idea | Yes (explore) | The topic to research. |
| Series slug | Yes (expand) | The existing series to expand. |
| Publication (`--publication`) | Yes | Publication slug. Must exist. |
| Context (`--context`) | No (explore) | Business context or ICP description for better LLM results. |
| Series count (`--series-count`) | No (explore) | Number of series to aim for (default 3). |
| Articles per series (`--articles-per-series`) | No (explore) | Articles per series (default 5). |
| Article count (`--article-count`) | No (expand) | New articles to plan (default 5). |
| Seed keywords (`--seed-keywords`) | No | Comma-separated keywords to always include in research. |
| Exclude series (`--exclude-series`) | No (explore) | Series slugs to avoid duplicating. |
| Country (`--country`) | No | Comma-separated ISO codes for GKP queries (defaults from publication). |
| Language (`--language`) | No | ISO 639-1 code for GKP queries (defaults from publication). |
| Content type (`--content-type`) | No | Content type for queue entries (default `article`). |
| Model (`--model`) | No | LLM model for reasoning calls (default `deepseek/deepseek-v4-pro`). |
| Intent model (`--intent-model`) | No | LLM model for intent classification (default `deepseek/deepseek-v4-flash`). |
| Dry run (`--dry-run`) | No | Run research without persisting. |

### GKP research

| Input | Required | Why it matters |
| --- | --- | --- |
| Keywords (`--keywords`) | Yes (except ideas) | Comma-separated keywords to query. |
| URL (`--url`) | No (ideas only) | URL to generate keyword ideas from. |
| Site (`--site`) | No (ideas only) | Site domain to generate keyword ideas from. |
| Country (`--country`) | No | ISO country code for geography-specific volume (default `US`). |
| Language (`--language`) | No | ISO 639-1 language code (default `en`). |
| Match type (`--match-type`) | No (forecast) | `EXACT`, `PHRASE`, or `BROAD`. |
| Max CPC bid (`--max-cpc-bid`) | No (forecast) | Max CPC bid in micros for forecast projections. |
| Start date (`--start-date`) | No (forecast) | Forecast start date (YYYY-MM-DD). |
| End date (`--end-date`) | No (forecast) | Forecast end date (YYYY-MM-DD). |
| Include CPC (`--no-include-cpc`) | No (historical) | Omit CPC data from historical results. |
| Page size (`--page-size`) | No (ideas) | Number of results per page. |

### Queue

| Input | Required | Why it matters |
| --- | --- | --- |
| Idea text | Yes | Article idea to enqueue. |
| Primary target (`--primary`) | No | Defaults to `article=1`. |
| Secondary targets (`--secondary`) | No | Optional channel variants. |
| Publication (`--publication`) | No | Publication slug. |
| Series (`--series`) | No | Series slug. |
| Style (`--style`) | No | Writing style. |
| Intent (`--intent`) | No | Content intent. |
| Length (`--length`) | No | Target word count alias (`small`/`medium`/`large`). |
| Keywords (`--keywords`) | No | Comma-separated SEO keywords. |
| Audience (`--audience`) | No | Target audience description. |

### Other commands

| Command | Required inputs |
| --- | --- |
| `ideon links <slug>` | `slug` (required), `--mode` (fresh/append, optional), `--link` (optional, repeatable), `--unlink` (optional, repeatable), `--max-links` (optional) |
| `ideon export <genId> <path>` | `generationId` (required), `path` (required), `--index` (optional, default 1), `--overwrite` (optional) |
| `ideon delete <slug>` | `slug` (required), must ask user for confirmation, then use `--force` |
| `ideon preview` | `--port` (optional, default 4173), `--no-open` (always use for agents), `--watch` (optional) |

## Deterministic workflow

1. Discover the user's intent — what operation do they need (write, plan, query GKP, queue, links, export, delete, preview)?
2. **Collect all required inputs from the user** by consulting the [Inputs to collect](#inputs-to-collect-from-user) table above. Ask the user for each required value before choosing an operation path or running any command. Do not guess or default missing values without asking.
3. Confirm install and setup state using readiness checks.
4. Choose operation path:
   - Create content: `ideon write ...`
   - Resume interrupted run: `ideon write resume`
   - Plan content series and articles: `ideon plan explore` / `ideon plan expand`
   - Queue articles for later: `ideon queue add ...`
   - List queued articles: `ideon queue list`
   - Write from queue: `ideon write --from-queue`
   - Enrich links for an existing article: `ideon links <slug> [--mode fresh|append] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]`
   - List and search generated articles: `ideon article list [--search <query>] [--publication <slug>] [--series <slug>] [--content-type <type>] [--limit <n>] [--json] [--verbose]`
   - Export generated articles: `ideon export <generationId> <path>`
   - Preview outputs: `ideon preview ...`
   - Delete outputs: `ideon delete <slug>`
   - Manage config: `ideon config ...`
   - Manage runtime registrations: `ideon agent ...`
   - Start MCP server: `ideon mcp serve`
5. Run minimal safe command first (dry-run or read-only status command).
6. Escalate to full workflow only after verification succeeds.
7. Report:
   - command run
   - artifacts/paths touched
   - exit/result
   - next safe step

Create-if-missing and update-if-existing behavior for this package:

- If this skill package is missing, create all files in this folder.
- If it exists, update in place and remove stale claims that conflict with current code/docs.

## Operations lifecycle

Start / run:

```bash
ideon write "Your idea" --primary article=1
```

Common operations:

```bash
# Add secondary outputs
ideon write "Your idea" --primary article=1 --secondary x-post=1 --secondary linkedin-post=1

# Enable link enrichment during write (opt-in)
ideon write "Your idea" --primary article=1 --enrich-links

# Add custom links during write
ideon write "Your idea" --primary article=1 --link "React->https://react.dev"

# Remove a custom link during write
ideon write "Your idea" --primary article=1 --unlink "OldLink"

# Cap generated links
ideon write "Your idea" --primary article=1 --max-links 8

# Use job file
ideon write --job ./job.json

# Cap images (1=cover only, 2=cover+1 inline, 3=cover+2 inline)
ideon write "Your idea" --primary article=1 --max-images 1

# With publication, series, keywords, and audience
ideon write "Your idea" \
  --primary article=1 \
  --publication tech-blog \
  --series ai-deep-dives \
  --keywords "machine learning, neural networks" \
  --audience "ML engineers at mid-stage startups"

# Resume last failed/interrupted run (always --no-interactive)
ideon write resume --no-interactive

# Resume with link enrichment
ideon write resume --no-interactive --enrich-links

# Re-run only link enrichment for a previous article (default: fresh)
ideon links my-article-slug

# Append new links into existing sidecar
ideon links my-article-slug --mode append

# Add a custom link to an article
ideon links my-article-slug --link "OpenRouter->https://openrouter.ai"

# Remove a custom link
ideon links my-article-slug --unlink "OpenRouter"

# Cap generated links at 5
ideon links my-article-slug --max-links 5

# Export a generation by ID or slug
ideon export my-article-slug ./export-dir

# Export a specific variant when multiple exist (default index: 1)
ideon export my-article-slug ./export-dir --index 2

# Overwrite existing export
ideon export my-article-slug ./export-dir --overwrite

# Auto-export after write (equivalent to write + export in one command)
ideon write "Your idea" --primary article=1 --export ./out

# Auto-export after resume
ideon write resume --no-interactive --export ./out

# Queue articles for later (always --no-interactive)
ideon queue add "Your idea" \
  --primary article=1 \
  --style technical \
  --intent tutorial \
  --no-interactive

ideon queue add "Another idea" \
  --primary article=1 \
  --publication tech-blog \
  --series ai-deep-dives \
  --keywords "ML, AI" \
  --no-interactive

# List queued articles
ideon queue list
ideon queue list --json
ideon queue list --publication tech-blog

# Peek at next pending article
ideon queue peek

# Remove a queued article
ideon queue remove <id> --force

# Clear all queued articles
ideon queue clear --force

# Write the next queued article
ideon write --from-queue

# Write the next queued article for a specific publication
ideon write --from-queue --publication tech-blog

# Write from queue with overrides
ideon write --from-queue --style playful

# Plan content (use --non-interactive; ask user before --auto-save)
ideon plan explore "Your idea" \
  --publication my-blog \
  --non-interactive

ideon plan expand my-series \
  --publication my-blog \
  --non-interactive
```

Monitoring / status:

```bash
ideon config list --json
ideon agent status --json
ideon article list
ideon article list --search "react hooks"
ideon article list --publication tech-blog --json
ideon plan explore --help
ideon plan expand --help
```

Update / upgrade:

```bash
npm i -g @telepat/ideon@latest
ideon --version
```

Cleanup / uninstall:

```bash
# Remove generated output by slug (always --force for agents)
ideon delete my-article-slug --force

# Uninstall global CLI
npm uninstall -g @telepat/ideon
```

## Local preview and URL handoff

Run preview:

```bash
ideon preview [markdownPath] --port 4173 --no-open
```

URL handoff behavior:

1. Read stdout line beginning with `Open`.
2. Share exact URL with user (for example `http://localhost:4173`).
3. If custom port was passed, hand off that port.
4. To stop preview, send Ctrl+C.

Watch mode:

```bash
ideon preview --watch --no-open
```

## MCP and integrations

First-party MCP server:

```bash
ideon mcp serve
```

Documented MCP characteristics:

- Transport: stdio
- Intended usage: local process-spawned MCP clients
- Tool set: `ideon_write`, `ideon_write_resume`, `ideon_delete`, `ideon_links`, `ideon_config_get`, `ideon_config_set`, `ideon_config_list`, `ideon_config_unset`, `gkp_generate_ideas`, `gkp_get_historical_data`, `gkp_get_forecast_data`

### Google Keyword Planner (GKP) Tools

The three `gkp_*` tools provide access to Google Ads Keyword Planner data. They require six credentials:

| Credential | Config key | Env var | Description |
|---|---|---|---|
| Developer token | `googleAdsDeveloperToken` | `TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN` | From Google Ads API Center |
| OAuth2 client ID | `googleAdsClientId` | `TELEPAT_GOOGLE_ADS_CLIENT_ID` | From GCP Console |
| OAuth2 client secret | `googleAdsClientSecret` | `TELEPAT_GOOGLE_ADS_CLIENT_SECRET` | From GCP Console |
| Refresh token | `googleAdsRefreshToken` | `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` | From one-time OAuth2 flow |
| Customer ID | `googleAdsCustomerId` | `TELEPAT_GOOGLE_ADS_CUSTOMER_ID` | Google Ads account number |
| Login customer ID | `googleAdsLoginCustomerId` | `TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Manager account ID (optional) |

**Setup** — agents should set GKP credentials via `ideon config set`:

```bash
ideon config set googleAdsDeveloperToken "your-token"
ideon config set googleAdsClientId "your-client-id"
ideon config set googleAdsClientSecret "your-secret"
ideon config set googleAdsRefreshToken "your-refresh-token"
ideon config set googleAdsCustomerId "123-456-7890"
ideon config set googleAdsLoginCustomerId "123-456-7890"  # only if needed
```

Check credential state:

```bash
ideon gads status                   # Check which credentials are set
ideon gads test                     # Verify credentials work
```

Human users may run `ideon gads login` for an interactive OAuth flow. Agents should never invoke `ideon gads login` — it opens a browser for user interaction.

**CLI data queries** — use `ideon gkp` to query keyword data directly:

```bash
# Keyword ideas from seeds
ideon gkp ideas --keywords seo,marketing --country US --language en --page-size 20

# Keyword ideas from URL
ideon gkp ideas --url https://example.com --country US

# Keyword ideas from site
ideon gkp ideas --site example.com --country US

# Historical metrics
ideon gkp historical --keywords seo --country US --language en

# Historical metrics without CPC data
ideon gkp historical --keywords seo --country US --no-include-cpc

# Forecast projections
ideon gkp forecast --keywords seo --match-type EXACT --country US --start-date 2026-07-01 --end-date 2026-07-31 --max-cpc-bid 5000000
```

All `gkp` subcommands support `--json` for machine-readable output. See [references/command-catalog.md](references/command-catalog.md) for full option details.

**GKP tool error messages include setup instructions.** If a GKP tool fails with a credential error, the error message will tell the user exactly which credential is missing and how to set it.

### GKP Setup Reference

For full step-by-step setup instructions, prerequisites, OAuth flow scripts, and error troubleshooting, see:

- `references/google-ads-setup.md`

Agent runtime registration:

```bash
ideon agent install <runtime>
ideon agent uninstall <runtime>
ideon agent status --json
```

Supported runtimes: `claude`, `claude-desktop`, `chatgpt`, `gemini`, `codex`, `cursor`, `vscode`, `opencode`, `generic-mcp`.

## Publications and series management

Publications define editorial policies, default styles, intents, and audience hints per publication. Series group related articles under a shared topic with optional publication association.

### Settings resolution chain

```
saved settings → job file → env vars → publication defaults → series defaults → CLI flags
```

Series can override any setting a publication can: `style`, `intent`, `targetLength`, `contentTargets`, `model`, `modelSettings`, and `editorialPolicy`.

### Publication commands

```bash
# Create a publication with defaults
ideon publication add "Tech Blog" --style technical --intent tutorial --tone authoritative --forbidden-topics "hype, speculation"

# List publications
ideon publication list
ideon publication list --json
ideon publication list --verbose

# Edit a publication
ideon publication edit tech-blog --style professional --intent how-to-guide

# Delete a publication
ideon publication remove tech-blog --force
```

### Series commands

```bash
# Create a series with topic and publication
ideon series add "AI Deep Dives" --topic "Exploring cutting-edge AI technologies" --publication tech-blog

# List series
ideon series list
ideon series list --publication tech-blog
ideon series list --json

# Edit a series
ideon series edit ai-deep-dives --topic "New topic"

# Remove publication association
ideon series edit ai-deep-dives --unset-publication

# Delete a series
ideon series remove ai-deep-dives --force
```

### How editorial policy is injected

When a publication or series is active, the following data is injected into all LLM prompts:

- Publication name, tone, forbidden topics, disclosure requirements, audience restrictions, and notes
- Series name, topic, and editorial policy (appended after publication policy)

## Content queue

The content queue is a global list of pending articles stored as individual JSON files in `~/.config/ideon/queue/`.

### Queue entry lifecycle

1. **Enqueue** (`ideon queue add`): resolves all parameters (publication/series defaults, style, intent, length, targets) and snapshots them into a self-contained entry file.
2. **Claim** (`ideon write --from-queue`): atomically renames `<id>.json` → `<id>.in-progress.json`. A second concurrent process will fail the rename and skip.
3. **Success**: deletes the `.in-progress` file.
4. **Failure or interruption**: renames back to `.json` with `status: 'pending'`.

### Key behaviors

- **Snapshot at enqueue time**: publication and series defaults are resolved and frozen into the entry. Changing defaults later does not affect queued entries.
- **Write-time overrides**: CLI flags passed alongside `--from-queue` override snapshotted settings.
- **Publication filtering**: `ideon write --from-queue --publication tech-blog` dequeues the oldest pending entry for that publication.
- **Export path**: if `--export <path>` is passed at enqueue time, it is stored in the entry and used at write time.

### Gotchas

- Queue entries store the full publication and series objects. If a publication is deleted, existing queue entries still reference it.
- `--export` paths are stored as-is. If the directory moves before writing, export will fail at write time.
- Concurrent `--from-queue` calls use best-effort atomic rename. Two processes won't pick the same entry, but both may see an empty queue if they check simultaneously.

## Content planning

The `ideon plan` command provides data-backed content strategy using Google Keyword Planner research, KOB (Keyword Opportunity Benchmark) scoring, intent classification, topic clustering, and article planning.

**Agents must always use `--non-interactive`.** Without this flag, the command opens an interactive terminal UI for human review — it will hang waiting for keyboard input.

After research completes, ask the user whether to auto-save results. If they decline, present the plan output and ask for confirmation before saving.

### Canonical agent invocation

```bash
# Explore new topics — research only, no auto-save
ideon plan explore "Your content idea" \
  --publication my-blog \
  --non-interactive

# Expand an existing series — research only, no auto-save
ideon plan expand my-series-slug \
  --publication my-blog \
  --non-interactive

# Auto-save (only after user confirms)
ideon plan explore "Your content idea" \
  --publication my-blog \
  --non-interactive \
  --auto-save
```

### Automation flags

| Flag | Effect |
|------|--------|
| `--non-interactive` | Required for agents. Skips TUI; writes plan output to stdout |
| `--auto-save` | Optional. Bypasses approval gates; persists plan without human confirmation. Only use after user explicitly agrees to save |
| `--dry-run` | Runs research but writes nothing to disk |

### Two planning modes

| Mode | Command | When to use |
|------|---------|-------------|
| **Explore** | `ideon plan explore [idea]` | Research a new content idea and generate series and article plans |
| **Expand** | `ideon plan expand [series-slug]` | Add new article ideas to an existing series |

Both modes require `--publication <slug>`, Google Ads credentials, and an OpenRouter API key.

### Planning pipeline stages

The plan pipeline runs automatically:

```
hydrate → seeds → research → score → cluster (explore only) → plan-articles → persist
```

- **hydrate**: loads publication, series, and output history to build a coverage map
- **seeds**: generates seed keywords from the content idea or existing series
- **research**: iterative GKP queries with broadening and low-volume detection
- **score**: KOB scoring, intent classification, and candidate filtering
- **cluster**: groups shortlisted keywords into thematic series (explore only)
- **plan-articles**: plans individual articles with keywords, intent, format, and priority
- **persist**: saves series, updates keywords, and queues articles (with `--auto-save`)

### Non-interactive output

With `--non-interactive`, the plan is written to stdout as plain text. Progress is logged to stderr in real time:

- **Stage transitions**: `hydrate`, `seeds`, `research`, `score`, `cluster`, `plan-articles`, `persist` (one line per stage)
- **Research rounds**: `research round N: M candidates` (per round)

In TTY contexts (interactive terminals), progress lines use carriage return to overwrite. In non-TTY contexts (agents, CI), each progress line is written with a newline.

The final plan output includes:

- Mode, publication, and series names
- Research stats (rounds, candidates evaluated/passed, cache hits, API calls)
- Series details (pillar keyword, funnel stage, rationale, coverage gap)
- Per-article details (title, keywords, intent, format, priority)
- `ideon queue add` commands ready for copy-paste execution

If no results are found (exit code `2`), the output includes pivot suggestions for alternative angles.

### User confirmation flow

After `--non-interactive` research completes:

1. Ask the user: "Should I auto-save these plan results?"
2. If **yes**: re-run with `--auto-save` to persist.
3. If **no**: present the stdout results, ask for confirmation, then save using the individual `ideon queue add` commands from the output.

### Key explore options

| Option | Description | Default |
|--------|-------------|---------|
| `--publication <slug>` | Publication slug (required) | — |
| `--context <text>` | Business context or ICP description | — |
| `--country <codes>` | Comma-separated ISO country codes for GKP queries | Publication default or `US` |
| `--language <code>` | ISO 639-1 language code for GKP queries | Publication default or `en` |
| `--series-count <n>` | Target number of series | 3 |
| `--articles-per-series <n>` | Target articles per series | 5 |
| `--seed-keywords <kw>` | Comma-separated seed keywords to always include | — |
| `--exclude-series <slugs>` | Series slugs to avoid duplicating | — |
| `--content-type <type>` | Content type for queue entries | `article` |
| `--model <model>` | Model for reasoning calls | deepseek/deepseek-v4-pro |
| `--intent-model <model>` | Model for intent classification | deepseek/deepseek-v4-flash |

### Key expand options

| Option | Description | Default |
|--------|-------------|---------|
| `--publication <slug>` | Publication slug (required) | — |
| `--country <codes>` | Comma-separated ISO country codes for GKP queries | Publication default or `US` |
| `--language <code>` | ISO 639-1 language code for GKP queries | Publication default or `en` |
| `--article-count <n>` | Target new articles | 5 |
| `--seed-keywords <kw>` | Additional seed keywords | — |
| `--content-type <type>` | Content type for queue entries | `article` |
| `--model <model>` | Model for reasoning calls | deepseek/deepseek-v4-pro |
| `--intent-model <model>` | Model for intent classification | deepseek/deepseek-v4-flash |
| `--dry-run` | Run research but persist nothing | `false` |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Plan completed and persisted (with `--auto-save`) |
| `1` | Pipeline failed (API error, missing credentials) |
| `2` | No results found (topic exhausted) |

## Argument semantics and constraints

Primary/secondary target specs:

- Format: `<content-type=count>`
- `--primary` is required when non-interactive and no job targets exist.
- Primary `count` must be exactly `1`.
- Secondary `count` must be positive integer.
- Same content type cannot be both primary and secondary.
- Duplicate secondary types are deduped by summing counts.

Allowed content types:

- `article`
- `blog-post`
- `linkedin-post`
- `newsletter`
- `press-release`
- `reddit-post`
- `science-paper`
- `x-post`
- `x-thread`

Allowed style values:

- `academic`
- `analytical`
- `authoritative`
- `conversational`
- `empathetic`
- `friendly`
- `journalistic`
- `minimalist`
- `persuasive`
- `playful`
- `professional`
- `storytelling`
- `technical`

Allowed intent values:

- `announcement`
- `case-study`
- `cornerstone`
- `counterargument`
- `critique-review`
- `deep-dive-analysis`
- `how-to-guide`
- `interview-q-and-a`
- `listicle`
- `opinion-piece`
- `personal-essay`
- `roundup-curation`
- `tutorial`

Allowed length values:

- `small`
- `medium`
- `large`

Range constraints:

- `modelSettings.temperature`: `0..2`
- `modelSettings.topP`: `0..1`
- `modelSettings.maxTokens`: positive integer
- `modelRequestTimeoutMs`: positive integer

Mode behavior:

- Agents must always use `--no-interactive`. Without it, commands prompt for missing inputs on stdin and will hang.
- Non-interactive mode fails fast on missing required inputs rather than prompting.

Export behavior:

- `ideon export <generationId> <path>` resolves the generation by exact ID, falling back to frontmatter slug match.
- `--index <n>` selects which primary article variant to export when multiple exist (default: 1).
- `--overwrite` replaces the destination file if it exists; without it, export fails with an "already exists" error.
- The primary article markdown is written as `<slug>.md` with inline links injected from `.links.json` sidecars.
- All non-internal files from the generation directory are copied to the destination directory, preserving relative subdirectories.
- Internal files that are **never** exported: `job.json`, `model.interactions.json`, `generation.analytics.json`.
- `meta.json` and all secondary outputs (e.g. `x-post-1.md`) are always included.
- `--export <path>` on `ideon write` or `ideon write resume` has no effect for `--dry-run` runs; export requires a real write to complete first.
- If an export during `--export` fails, the write was already successful and artifacts remain in the output directory.

Image generation behavior:

- Image count and placement are decided at plan time by the LLM, not after writing.
- The plan always includes a cover image and inline images (count proportional to article length):
  - small (≤700 words): 0–1 inline images
  - medium (≤1150 words): 1–2 inline images
  - large (>1150 words): 2–4 inline images
- Each inline image has an explicit `anchorAfterSection` (starting at section 2) that the LLM chooses for optimal visual reinforcement. Inline images are never anchored after the first section because the cover image already appears near the title.
- All planned images are rendered — no images are dropped based on section count.
- `--max-images <n>` caps total images including cover (1=cover only, 2=cover+1 inline, 3=cover+2 inline, etc.). Cannot increase above the plan's count.
- After sections are written, image prompts are expanded by blending the plan's general direction with the actual section content for each anchor position.

What link enrichment means:

- Link enrichment is a post-generation link-suggestion pass for long-form markdown outputs.
- Ideon selects linkable phrases from each eligible markdown file, resolves relevant source URLs using model + web search, and writes results to `*.links.json` sidecar files.
- Ideon does not rewrite markdown files when enriching links; markdown remains unchanged.
- During preview, Ideon applies sidecar link metadata at render time.

Link enrichment behavior:

- `ideon write` and `ideon write resume` default to link enrichment disabled.
- Enable write-time enrichment explicitly with `--enrich-links`.
- For existing outputs, use `ideon links <slug>`.
- Link enrichment applies to eligible long-form outputs and skips short-form channels like `x-post` and `x-thread`.
- `ideon links --mode fresh` (default) replaces existing **generated** sidecar links only. Custom links are always preserved.
- `ideon links --mode append` merges into existing generated sidecar content (creates sidecar if missing).
- **Custom links** (`--link "expression->url"`): user-specified mappings stored separately from generated links. They take precedence over LLM-generated ones, survive `--mode fresh`, and are applied to **every unprotected occurrence** of the expression in the article body (generated links only apply to the first occurrence). Use `--unlink <expression>` to remove.
- **Max links** (`--max-links <n>`): caps the number of generated links. Defaults: ≤700 words→5, ≤1150 words→8, >1150 words→12. Does not cap custom links.
- Sidecar format is v2: `{ version: 2, customLinks: [...], links: [...] }`. v1 sidecars are read transparently.

Signal/cancellation behavior:

- `ideon write` traps `SIGINT` and `SIGTERM`, patches resume state, and exits `130`.
- `ideon preview --watch` cleans up watcher process on `SIGINT`/`SIGTERM`.

## Configuration precedence and discovery

Precedence (highest to lowest):

1. CLI args
2. Job file settings
3. Environment variables (`IDEON_*`)
4. Saved settings file
5. Schema defaults

Secrets precedence:

1. `TELEPAT_OPENROUTER_KEY` / `TELEPAT_REPLICATE_TOKEN` from env
2. Keychain-stored secrets

Key paths:

- Saved settings: OS config path via env-paths, file name `settings.json`
- Agent runtime store: `agent-integrations.json` in same config directory
- Resume state: `~/.ideon/sessions/<project-hash>/state.json` (OS config directory, keyed by project path)

## Output and exit semantics

Machine-readable outputs:

- `ideon config list --json`
- `ideon config get <key> --json`
- `ideon agent status --json`

Common exit semantics:

- `0`: success
- `1`: validation/runtime/storage error
- `130`: interrupted by Ctrl+C (documented for key command pages)

Write artifacts and sidecars:

- Markdown outputs (`*.md`)
- Content metadata sidecars (`meta.json`, written into every generation directory and included in exports)
- Link metadata sidecars (`*.links.json`, when `--enrich-links` is enabled or `ideon links` is run; injected inline during export)
- Analytics sidecars (`*.analytics.json`)
- Session state (`~/.ideon/sessions/<project-hash>/state.json`, read/written from the OS config directory)

Export artifacts:

- `ideon export` produces a self-contained directory with the enriched primary markdown, `meta.json`, all referenced images, secondary markdown outputs, and any remaining non-internal sidecar files.
- Internal files (`job.json`, `model.interactions.json`, `generation.analytics.json`) are excluded from exports.

## Gotchas and sharp edges

- Non-interactive runs can fail if style/intent/length/targets are missing.
  Mitigation: pass all required flags or provide equivalent job settings.
- `ideon delete` in non-TTY requires `--force`.
  Mitigation: require explicit user confirmation before forced delete.
- Keychain may be unavailable in containers/CI.
  Mitigation: set `TELEPAT_DISABLE_KEYTAR=true` and inject env secrets.
- Legacy `xMode` fields in content targets are rejected.
  Mitigation: use explicit `x-post` or `x-thread` content types.
- Resume works from any directory — session state is stored in the user's config directory, keyed by project path.
  Mitigation: legacy `.ideon/write/state.json` files are automatically migrated on first resume.
- Link enrichment is opt-in for write/resume runs.
  Mitigation: pass `--enrich-links` during write/resume, or run `ideon links <slug>` afterward.
- Export without `--overwrite` fails if the destination markdown already exists.
  Mitigation: pass `--overwrite` to replace, or export to a fresh directory.
- `--export` on write/resume has no effect during `--dry-run`.
  Mitigation: export requires a real generation to exist; run a full write first.
- Queue entries store full publication/series snapshots. Deleting a publication does not remove or update queued entries.
  Mitigation: remove or re-add queue entries after deleting a publication.
- `--from-queue` with `--export` uses the stored export path from the queue entry unless overridden.
  Mitigation: pass `--export` explicitly on `write --from-queue` to override.

## Clarifying questions for risky operations

Destructive:

1. Do you want a confirmation prompt, or should deletion run with `--force`?
2. Is the slug exact, and are you sure this output should be removed now?

Stateful/resume:

1. Should we resume the last interrupted session or start a fresh write run?
2. Should resume keep prior dry-run/live behavior, or switch modes explicitly?

Credentials:

1. Should credentials be stored in OS keychain or environment variables only?
2. Are we running in CI/container where keychain access should be disabled?

## Failure handling

| Failure | Action |
| --- | --- |
| No idea provided | Ask for idea or require `--job` with `idea`/`prompt`. |
| Missing required options in non-interactive mode | Add `--primary`, `--style`, `--intent`, and `--length` (or equivalent in job settings). |
| Keychain unavailable | Set `TELEPAT_DISABLE_KEYTAR=true` and use env secrets. |
| No resumable session found | Start a fresh `ideon write ...` run. Legacy `.ideon/write/state.json` files are automatically migrated. |
| Preview cannot find markdown | Run write first or pass explicit `.md` path. |
| Invalid target spec | Use `<content-type=count>` and keep primary count exactly `1`. |
| Export destination already exists | Pass `--overwrite` or choose a different destination directory. |
| Generation not found for export | Run `ideon preview` to list available generation IDs and slugs. |
| No pending articles in queue | Add articles with `ideon queue add` or remove `--publication` filter. |
| Queue entry claimed by another process | `--from-queue` automatically skips to the next pending entry. |

## Verification prompts

Should trigger:

1. Create a full Ideon CLI workflow from install through preview.
2. Run Ideon non-interactively in CI with strict flag and secret handling.
3. Use Ideon MCP server and map tool arguments safely.
4. Queue articles and write from queue with publication filtering.
5. Run `ideon plan explore ... --non-interactive` and verify plan output on stdout, then ask user whether to auto-save.
6. Run `ideon plan expand ... --non-interactive` and verify plan output on stdout, then ask user whether to auto-save.

Should not trigger:

1. Explain one Ideon flag quickly.
2. Build a VS Code extension UI.
3. Summarize repo architecture without running CLI workflows.

## Companion references

- See `references/command-catalog.md` for full command/argument matrix.
- See `references/troubleshooting.md` for detailed failure diagnostics.
- See `references/framework-patterns.md` for reusable workflow patterns.
- See `references/google-ads-setup.md` for Google Ads Keyword Planner credential setup.
- See `assets/generated-skill-template.md` for reusable scaffold.
- See `docs/reference/commands/ideon-queue.md` for queue command documentation.
- See `docs/reference/commands/ideon-series.md` for publication and series command documentation.
