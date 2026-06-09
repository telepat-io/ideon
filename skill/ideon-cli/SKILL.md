---
name: ideon-cli
description: Use this skill when users need to install, configure, run, automate, preview, and troubleshoot the Ideon CLI from zero context. Covers non-interactive write/resume/plan/queue/export workflows, GKP research, publications/series management, and starting the MCP server. Do not use for quick single-flag explanations or MCP tool schemas (use ideon-mcp skill).
---

# Ideon CLI Skill

Operate Ideon as a content writer platform from the terminal: one idea to multi-channel outputs (article, blog, newsletter, social, etc.), optional link enrichment and images, resume/checkpoint support, and export. For MCP tool workflows inside clients, use the **`ideon-mcp` skill**.

## Agent constraints

- Always pass `--no-interactive` on write, resume, queue, and plan commands — without it, commands hang waiting for stdin.
- Never invoke `ideon settings` or `ideon gads login` — both require interactive user input.
- Always use `--force` on `ideon delete` and `ideon queue remove/clear` after explicit user confirmation.
- Run dry-run or read-only commands before full generation.
- In containers/CI: set `TELEPAT_DISABLE_KEYTAR=true` and inject secrets via env vars.

## Installation

Prerequisites: Node.js 20+, npm 10+, OpenRouter API key, Replicate API token.

```bash
npm i -g @telepat/ideon
ideon --help
ideon --version
```

## Setup and readiness

Non-interactive setup (agents, CI, containers):

```bash
TELEPAT_DISABLE_KEYTAR=true \
TELEPAT_OPENROUTER_KEY=sk-... \
TELEPAT_REPLICATE_TOKEN=r8_... \
ideon config list --json
```

Readiness checklist:

1. CLI responds: `ideon --help`
2. Config readable: `ideon config list --json`
3. Pipeline works: `ideon write --dry-run "Smoke test" --primary article=1 --style professional --intent tutorial --length medium --no-interactive`
4. Preview starts: `ideon preview --no-open` (expect `Open http://localhost:<port>`)

Human users may run `ideon settings` for an interactive wizard.

## Agent host integration

Install Ideon into supported coding-agent hosts (skills + optional MCP):

```bash
ideon agent install pi                    # default: ideon-cli skill in Pi settings
ideon agent install cursor --mcp-skill    # MCP + ideon-mcp skill
ideon agent install claude --project      # project-scoped .claude/skills/
ideon agent status --json                 # verify artifacts and readiness
```

Supported runtimes: `pi`, `claude`, `claude-desktop`, `chatgpt`, `gemini`, `codex`, `cursor`, `vscode`, `opencode`, `generic-mcp`. Default mode installs `ideon-cli`; `--mcp-skill` is mutually exclusive and registers stdio MCP (`ideon mcp serve`). Use `--force` to replace conflicting Ideon-managed entries only.

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
| Author (`--author`) | No | Author slug for voice and expertise. Overrides publication/series default authors. |
| Experience (`--experience`) | No | Per-run anecdotes or first-hand experience to weave into the draft. |
| Keywords (`--keywords`) | No | Comma-separated SEO keywords. Supports compound keywords. Merges with series keywords. |
| FAQ section (`--faq-section` / `--no-faq-section`) | No | Force FAQ block on or off after conclusion (overrides intent default). |
| Export path (`--export`) | No (write/resume) | Export generated article to directory after write completes. |
| Audience (`--audience`) | No | Target audience description injected into editorial policy. |
| Enrich links (`--enrich-links`) | No | Opt-in web research link enrichment for long-form outputs. |
| Max links (`--max-links`) | No | Cap generated links (defaults: ≤700w→5, ≤1150w→8, >1150w→12). |
| Max images (`--max-images`) | No | Cap total images (1=cover only, higher=cover+inline). |
| Skip SEO check (`--no-seo-check`) | No | Skip post-section SEO lint and editor pass on `ideon write`. |
| SEO check mode (`--seo-check-mode`) | No | `errors-only` (default) or `strict` (zero warnings). |
| SEO check max turns (`--seo-check-max-turns`) | No | Max editor-agent turns during SEO check (1–20, default 10). |
| Force SEO re-check (`--seo-check`) | No (resume) | Re-run SEO lint and editor on `ideon write resume`. |
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
| Publication (cache) (`--publication`) | No | Attach cache context to a publication slug. |
| Series (cache) (`--series`) | No | Attach cache context to a series slug. |
| Refresh cache (`--refresh`) | No | Bypass cache and fetch fresh data. |

### GKP cache list

| Input | Required | Why it matters |
| --- | --- | --- |
| Publication (`--publication`) | No | Filter by publication slug. |
| Series (`--series`) | No | Filter by series slug. |
| Search (`--search`) | No | Filter by keyword, URL, site, publication, or series text. |
| Fresh only (`--fresh`) | No | Show only fresh cache entries. |
| Stale only (`--stale`) | No | Show only stale cache entries. |
| Verbose (`--verbose`) | No | Include full cache entry details. |

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
2. **Collect all required inputs** from the [Inputs to collect](#inputs-to-collect-from-user) tables. Do not guess missing values.
3. Confirm install and setup state using the readiness checklist.
4. Choose operation path:
   - Create content: `ideon write ...`
   - Resume interrupted run: `ideon write resume`
   - Plan content series and articles: `ideon plan explore` / `ideon plan expand`
   - Queue articles: `ideon queue add ...` → `ideon write --from-queue`
   - Enrich links: `ideon links <slug>`
   - List/search articles: `ideon article list`
   - Export: `ideon export <generationId> <path>`
   - Preview: `ideon preview ...`
   - Delete: `ideon delete <slug> --force`
   - Config: `ideon config ...`
   - MCP server: `ideon mcp serve` or `ideon mcp serve-http`
5. Run minimal safe command first (dry-run or read-only status).
6. Escalate to full workflow only after verification succeeds.
7. Report: command run, artifacts/paths touched, exit/result, next safe step.

## Canonical examples

### Write

```bash
ideon write "Your idea" \
  --primary article=1 \
  --style technical \
  --intent tutorial \
  --length medium \
  --no-interactive
```

With publication, series, and link enrichment:

```bash
ideon write "Your idea" \
  --primary article=1 \
  --publication tech-blog \
  --series ai-deep-dives \
  --enrich-links \
  --no-interactive
```

### Resume

```bash
ideon write resume --no-interactive
ideon write resume --no-interactive --export ./out
```

### Queue write

```bash
ideon queue add "Your idea" --primary article=1 --style technical --intent tutorial --no-interactive
ideon write --from-queue --no-interactive
ideon write --from-queue --publication tech-blog --no-interactive
```

### Plan

```bash
# Research only — ask user before --auto-save
ideon plan explore "Your content idea" --publication my-blog --non-interactive
ideon plan expand my-series --publication my-blog --non-interactive

# Persist only after user confirms
ideon plan explore "Your content idea" --publication my-blog --non-interactive --auto-save
```

### Export and links

```bash
ideon export my-article-slug ./export-dir
ideon export my-article-slug ./export-dir --overwrite
ideon links my-article-slug
ideon links my-article-slug --mode append --max-links 5
```

### Preview

```bash
ideon preview --no-open
ideon preview --watch --no-open
```

Read stdout for `Open http://localhost:<port>` and share the URL with the user.

For publication, series, author, queue CRUD, and additional write flags, see [references/command-catalog.md](references/command-catalog.md) (command matrix and scenario paths).

## MCP server

Start the first-party MCP server from the CLI. For tool schemas, JSON examples, and MCP-specific gotchas, use the **`ideon-mcp` skill**.

```bash
# Stdio (local process-spawned clients)
ideon mcp serve

# Streamable HTTP (remote; requires bearer auth)
ideon mcp serve-http --api-key <key> [--port <port>] [--host <host>] [--endpoint <path>]
```

HTTP defaults: `127.0.0.1:3001`, endpoint `/mcp`. API key via `--api-key` or `IDEON_MCP_API_KEY`.

## Google Keyword Planner (CLI)

GKP commands require six Google Ads credentials. Set via `ideon config set` or env vars — see [references/google-ads-setup.md](references/google-ads-setup.md).

```bash
ideon gads status
ideon gads test
ideon gads logout              # Clear refresh token
ideon gads logout --all        # Clear all credentials
```

```bash
ideon gkp ideas --keywords seo,marketing --country US --language en
ideon gkp historical --keywords seo --country US --json
ideon gkp forecast --keywords seo --match-type EXACT --country US --json
ideon gkp list --publication tech-blog --search "content strategy" --fresh
```

All `gkp` subcommands support `--publication`, `--series`, and `--refresh` for cache context. Credential errors include setup instructions in the error message.

## Publications, series, and queue

Settings resolution: `saved settings → job file → env vars → publication defaults → series defaults → CLI flags`.

When a publication or series is active, editorial policy (tone, forbidden topics, disclosures, audience restrictions, notes) is injected into all LLM prompts.

Queue lifecycle: enqueue snapshots settings → claim via `--from-queue` (atomic rename) → success deletes entry, failure reverts to pending. `--export` paths stored at enqueue time are used at write time.

See [references/command-catalog.md](references/command-catalog.md) for `ideon publication *`, `ideon series *`, `ideon author *`, and `ideon queue *` commands.

## Content planning

**Agents must always use `--non-interactive`.** Without it, the command opens an interactive TUI and hangs.

After research completes, ask the user whether to auto-save. If they decline, present the plan output and ask for confirmation before saving.

Pipeline stages: `hydrate → seeds → research → score → cluster (explore only) → plan-articles → persist`

| Flag | Effect |
|------|--------|
| `--non-interactive` | Required for agents. Skips TUI; writes plan to stdout |
| `--auto-save` | Persists without human confirmation — only after user agrees |
| `--dry-run` | Research only, writes nothing |

Exit codes: `0` = persisted, `1` = pipeline error, `2` = no results (topic exhausted).

Full explore/expand options: [references/command-catalog.md](references/command-catalog.md).

## Argument semantics and constraints

Target specs: format `<content-type=count>`. Primary count must be `1`. Same type cannot be both primary and secondary.

Allowed values for content types, styles, intents, and lengths: see [references/command-catalog.md](references/command-catalog.md) § Argument and option semantics.

Key constraints:

- Agents must always use `--no-interactive` — missing required inputs fail fast instead of prompting.
- `ideon delete` in non-TTY requires `--force` after user confirmation.
- `--export` on write/resume has no effect during `--dry-run`.
- Export without `--overwrite` fails if destination markdown already exists.
- Link enrichment is opt-in on write/resume (`--enrich-links`); use `ideon links <slug>` afterward.
- Custom links (`--link "expr->url"`) take precedence over generated links and survive `--mode fresh`.
- `--max-images <n>` caps total images including cover (1=cover only).
- `ideon write` traps SIGINT/SIGTERM, patches resume state, exits `130`.

Config precedence (highest to lowest): CLI args → job file → `IDEON_*` env → saved settings → schema defaults. Secrets: env vars override keychain.

## Gotchas and sharp edges

- Non-interactive runs fail if style/intent/length/targets are missing — pass all required flags or job settings.
- Keychain unavailable in containers — set `TELEPAT_DISABLE_KEYTAR=true` and use env secrets.
- Legacy `xMode` fields in content targets are rejected — use `x-post` or `x-thread`.
- Resume works from any directory — session state is in OS config dir, keyed by project path.
- Queue entries store full publication/series snapshots — deleting a publication does not update queued entries.
- `--from-queue` with `--export` uses stored export path unless overridden at write time.
- Plan without `--auto-save`: present stdout results and ask user before persisting.

## Failure handling

| Failure | Action |
| --- | --- |
| No idea provided | Ask for idea or require `--job` with `idea`/`prompt`. |
| Missing required options in non-interactive mode | Add `--primary`, `--style`, `--intent`, and `--length`. |
| Keychain unavailable | Set `TELEPAT_DISABLE_KEYTAR=true` and use env secrets. |
| No resumable session found | Start a fresh `ideon write ...` run. |
| Preview cannot find markdown | Run write first or pass explicit `.md` path. |
| Invalid target spec | Use `<content-type=count>`; primary count exactly `1`. |
| Export destination already exists | Pass `--overwrite` or choose a different directory. |
| Generation not found for export | Run `ideon article list` to find slugs/IDs. |
| No pending articles in queue | Add with `ideon queue add` or remove `--publication` filter. |
| Queue entry claimed by another process | `--from-queue` skips to next pending entry. |
| Plan exit code 2 | Topic exhausted — present pivot suggestions from stdout. |

## Companion references

- See the **`ideon-mcp` skill** for MCP tool schemas and JSON examples.
- See [references/command-catalog.md](references/command-catalog.md) for full command/argument matrix.
- See [references/troubleshooting.md](references/troubleshooting.md) for detailed failure diagnostics.
- See [references/google-ads-setup.md](references/google-ads-setup.md) for Google Ads credential setup.
