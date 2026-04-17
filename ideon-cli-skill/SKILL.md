---
name: ideon-cli-skill
description: Use this skill when users need to install, configure, run, automate, preview, and troubleshoot the Ideon CLI (including MCP server workflows) from zero context.
---

# Ideon CLI Skill

## What this skill does

This skill helps users operate Ideon as a content writer platform, not just a command runner.

Ideon can turn one idea into many publish-ready outputs (article, blog, newsletter, Reddit, LinkedIn, X thread/X post, landing copy), apply a selected writing style, enrich content with relevant links, generate visuals for article-led runs, and support iterative refinement through reruns, preview, and resume.

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
IDEON_DISABLE_KEYTAR=true \
IDEON_OPENROUTER_API_KEY=sk-... \
IDEON_REPLICATE_API_TOKEN=r8_... \
ideon config list --json
```

Setup verification checks:

```bash
# Confirm config surface and secret presence flags
ideon config list --json

# Safe smoke run with no provider API calls
ideon write --dry-run "Smoke test ideon pipeline" --primary article=1 --style professional --length medium --no-interactive
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
| Length (`--length`) | Yes (non-interactive) | Required for strict non-interactive runs when not supplied via job. |
| Credentials strategy | Yes | Keychain via `ideon settings` or env-based secrets for CI. |
| Run mode | Yes | Fresh run vs `ideon write resume`. |

## Deterministic workflow

1. Discover user intent and risk class.
2. Confirm install and setup state using readiness checks.
3. Choose operation path:
   - Create content: `ideon write ...`
   - Resume interrupted run: `ideon write resume`
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

# Use job file
ideon write --job ./job.json

# Resume last failed/interrupted run
ideon write resume
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
- Tool set: `ideon_write`, `ideon_write_resume`, `ideon_delete`, `ideon_config_get`, `ideon_config_set`

Agent runtime registration:

```bash
ideon agent install <runtime>
ideon agent uninstall <runtime>
ideon agent status --json
```

Supported runtimes: `claude`, `chatgpt`, `gemini`, `generic-mcp`.
Unsupported aliases: `cursor`, `vscode`.

TODO (evidence gap): explicit external trust/approval model for third-party MCP hosts is not documented in Ideon docs; assume host-local process trust and avoid claiming additional approval prompts.

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
- `x-thread`
- `x-post`
- `reddit-post`
- `linkedin-post`
- `newsletter`
- `landing-page-copy`

Allowed style values:

- `professional`
- `friendly`
- `technical`
- `academic`
- `opinionated`
- `storytelling`

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

- Interactive (TTY default): prompts for missing idea/style/targets/length.
- Non-interactive (`--no-interactive` or non-TTY): fails fast on missing required inputs.

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

1. `IDEON_OPENROUTER_API_KEY` / `IDEON_REPLICATE_API_TOKEN` from env
2. Keychain-stored secrets

Key paths:

- Saved settings: OS config path via env-paths, file name `settings.json`
- Agent runtime store: `agent-integrations.json` in same config directory
- Resume state: `.ideon/write/state.json` in current working directory (directory-scoped per project)

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
- Link metadata sidecars (`*.links.json`, when link enrichment enabled)
- Analytics sidecars (`*.analytics.json`)
- Session state (`.ideon/write/state.json`, read/written in the directory where the command runs)

## Gotchas and sharp edges

- Non-interactive runs can fail if style/length/targets are missing.
  Mitigation: pass all required flags or provide equivalent job settings.
- `ideon delete` in non-TTY requires `--force`.
  Mitigation: require explicit user confirmation before forced delete.
- Keychain may be unavailable in containers/CI.
  Mitigation: set `IDEON_DISABLE_KEYTAR=true` and inject env secrets.
- Legacy `xMode` fields in content targets are rejected.
  Mitigation: use explicit `x-post` or `x-thread` content types.
- Resume is directory-scoped and can fail when run from a different directory.
  Mitigation: run `ideon write resume` from the same project directory as the original run, or restore that directory's `.ideon/` folder.

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
| Missing required options in non-interactive mode | Add `--primary`, `--style`, and `--length` (or equivalent in job settings). |
| Keychain unavailable | Set `IDEON_DISABLE_KEYTAR=true` and use env secrets. |
| No resumable session found | Verify the current directory matches the original run directory; if state was moved/deleted, restore `.ideon/` or start a fresh `ideon write ...` run. |
| Preview cannot find markdown | Run write first or pass explicit `.md` path. |
| Invalid target spec | Use `<content-type=count>` and keep primary count exactly `1`. |

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
- Write/resume behavior and signal handling: `src/cli/commands/write.tsx`
- Target parsing rules and conflicts: `src/cli/commands/writeTargetSpecs.ts`
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
- Command reference coverage: `docs/reference/commands/ideon-*.md`, `docs/reference/cli-reference.md`, `docs/for-agents/command-index.md`
