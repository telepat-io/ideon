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

Interactive setup path:

```bash
ideon settings
```

Non-interactive setup path (CI/agents/containers):

```bash
TELEPAT_DISABLE_KEYTAR=true \
TELEPAT_OPENROUTER_KEY=sk-... \
TELEPAT_REPLICATE_TOKEN=r8_... \
ideon config list --json
```

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

| Input | Required | Why it matters |
| --- | --- | --- |
| Idea text | Yes | Required by `ideon write` unless a job file provides it. |
| Primary target (`--primary`) | Yes (non-interactive) | Must be exactly one primary with count `1`. |
| Secondary targets (`--secondary`) | No | Optional channel variants and counts. |
| Style (`--style`) | Yes (non-interactive) | Required for strict non-interactive runs when not supplied via job. |
| Intent (`--intent`) | Yes (non-interactive) | Required for strict non-interactive runs when not supplied explicitly. |
| Length (`--length`) | Yes (non-interactive) | Required for strict non-interactive runs when not supplied via job. |
| Credentials strategy | Yes | Keychain via `ideon settings` or env-based secrets for CI. |
| Run mode | Yes | Fresh run vs `ideon write resume`. |

## Deterministic workflow

1. Discover user intent and risk class.
2. Confirm install and setup state using readiness checks.
3. Choose operation path:
   - Create content: `ideon write ...`
   - Resume interrupted run: `ideon write resume`
   - Enrich links for an existing article: `ideon links <slug> [--mode fresh|append] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]`
   - Export generated articles: `ideon export <generationId> <path>`
   - Preview outputs: `ideon preview ...`
   - Delete outputs: `ideon delete <slug>`
   - Manage config: `ideon config ...`
   - Manage runtime registrations: `ideon agent ...`
   - Start MCP server: `ideon mcp serve`
4. Run minimal safe command first (dry-run or read-only status command).
5. Escalate to full workflow only after verification succeeds.
6. Report:
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

# Use job file
ideon write --job ./job.json

# Cap images (1=cover only, 2=cover+1 inline, 3=cover+2 inline)
ideon write "Your idea" --primary article=1 --max-images 1

# Resume last failed/interrupted run
ideon write resume

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
ideon write resume --export ./out
```

Monitoring / status:

```bash
ideon config list --json
ideon agent status --json
```

Update / upgrade:

```bash
npm i -g @telepat/ideon@latest
ideon --version
```

Cleanup / uninstall:

```bash
# Remove generated output by slug
ideon delete my-article-slug

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
- Tool set: `ideon_write`, `ideon_write_resume`, `ideon_delete`, `ideon_links`, `ideon_config_get`, `ideon_config_set`, `ideon_config_list`, `ideon_config_unset`

Agent runtime registration:

```bash
ideon agent install <runtime>
ideon agent uninstall <runtime>
ideon agent status --json
```

Supported runtimes: `claude`, `claude-desktop`, `chatgpt`, `gemini`, `codex`, `cursor`, `vscode`, `opencode`, `generic-mcp`.

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

- Interactive (TTY default): prompts for missing idea/style/intent/targets/length.
- Non-interactive (`--no-interactive` or non-TTY): fails fast on missing required inputs.

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

## Verification prompts

Should trigger:

1. Create a full Ideon CLI workflow from install through preview.
2. Run Ideon non-interactively in CI with strict flag and secret handling.
3. Use Ideon MCP server and map tool arguments safely.

Should not trigger:

1. Explain one Ideon flag quickly.
2. Build a VS Code extension UI.
3. Summarize repo architecture without running CLI workflows.

## Companion references

- See `references/command-catalog.md` for full command/argument matrix.
- See `references/troubleshooting.md` for detailed failure diagnostics.
- See `references/framework-patterns.md` for reusable workflow patterns.
- See `assets/generated-skill-template.md` for reusable scaffold.

## Source evidence map

- CLI command surface and options: `src/cli/app.ts`
- Standalone links command behavior: `src/cli/commands/links.ts`
- Write/resume behavior and signal handling: `src/cli/commands/write.tsx`
- Target parsing rules and conflicts: `src/cli/commands/writeTargetSpecs.ts`
- Export command behavior, internal file filtering, and `--export` flag integration: `src/cli/commands/export.ts`
- Delete behavior and confirmation rules: `src/cli/commands/delete.ts`
- Preview behavior and watch mode: `src/cli/commands/serve.ts`, `src/server/previewHelpers.ts`
- Config key surface and coercion: `src/config/manage.ts`
- Settings defaults and enums: `src/config/schema.ts`
- Precedence logic: `src/config/resolver.ts`, `docs/guides/configuration.md`
- Env variable parsing: `src/config/env.ts`, `docs/reference/environment-variables.md`
- Keychain and env fallback for secrets: `src/config/secretStore.ts`
- Saved settings path: `src/config/settingsFile.ts`
- Agent runtime store path and runtime IDs: `src/integrations/agent/store.ts`, `src/cli/commands/agent.ts`
- MCP server transport and tools: `src/cli/commands/mcp.ts`, `src/integrations/mcp/server.ts`, `src/integrations/mcp/tools.ts`, `docs/reference/commands/ideon-mcp-serve.md`
- Config key surface and management: `src/config/manage.ts`
- Skill contract registry: `src/integrations/skills/registry.ts`
- Command reference coverage: `docs/reference/commands/ideon-*.md`, `docs/reference/cli-reference.md`, `docs/for-agents/command-index.md`
