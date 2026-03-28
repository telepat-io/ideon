# AGENTS.md — Ideon Codebase Guide

Concise reference for AI agents (and humans) working on this codebase.

---

## Required checks — run before every commit

```bash
npm run lint        # tsc --noEmit (typecheck, no emit)
npm run build       # tsup → dist/ideon.js
npm run test:coverage # Jest suites + coverage report in src/__tests__/
npm run docs:build  # Docusaurus static build
```

All four must pass clean. If you change a feature, update the relevant doc page(s) under `docs-site/docs/` and confirm `docs:build` still succeeds.

If changes touch the local preview server (`ideon preview`, `src/server/preview*`, preview docs), also run:

```bash
npm run preview -- --no-open
```

Confirm the command starts successfully and serves the latest generated markdown from `output/`.

---

## Project layout

```
src/
  bin/          Entry point: ideon.ts (wires Commander CLI)
  cli/          Ink-based TUI — commands/, flows/, ui/, logging/
  config/       Settings resolution pipeline (see below)
  generation/   LLM calls: planArticle.ts, writeSections.ts
  images/       Replicate image render: replicateClient.ts, renderImages.ts
  llm/          OpenRouter client + prompt templates
  models/t2i/   JSON model definitions + options resolver + registry
  output/       Markdown renderer + filesystem helpers
  pipeline/     runPipelineShell() orchestrator + event types
  types/        Zod schemas: articleSchema.ts
  __tests__/    Jest test suites (co-located under src)

docs-site/      Docusaurus site (separate npm workspace, deployed to GitHub Pages)
.github/        CI workflow: docs-pages.yml deploys docs on push to main
```

---

## Architecture overview

### Config resolution (src/config/)

Priority order (highest wins): CLI flags → environment variables (`IDEON_*`) → settings file (XDG config dir) → schema defaults.

Key files:
- `schema.ts` — Zod schemas for all settings; `appSettingsSchema`, `jobInputSchema`, `envSettingsSchema`
- `resolver.ts` — merges all sources into `ResolvedConfig { settings, secrets }`
- `env.ts` — reads `IDEON_*` env vars
- `secretStore.ts` — reads credentials via keytar (OS keychain) or env vars

### Pipeline (src/pipeline/)

`runPipelineShell(input, options)` in `runner.ts` orchestrates seven sequential stages:

| Stage | ID | What it does |
|---|---|---|
| 1 | `shared-brief` | LLM → shared cross-channel content brief |
| 2 | `planning` | LLM → `ParsedArticlePlan` (title, slug, sections, image slots) |
| 3 | `sections` | LLM → section prose (intro, body, conclusion) |
| 4 | `image-prompts` | LLM → expanded image prompt strings |
| 5 | `images` | Replicate API → rendered image files |
| 6 | `output` | Assembles and writes final Markdown document |
| 7 | `links` | LLM + web search → sidecar link metadata (`*.links.json`) |

Each stage updates a `StageViewModel[]` array and calls `options.onUpdate()` for live TUI rendering. The pipeline is cancellable at any stage by propagating thrown errors.

### LLM client (src/llm/)

`OpenRouterClient` wraps the OpenRouter chat-completions API. Prompt templates live in `src/llm/prompts/` (`articlePlan.ts`, `articleSection.ts`, `channelContent.ts`, `imagePrompt.ts`, `writingFramework.ts`). All LLM responses are validated via Zod schemas from `src/types/articleSchema.ts`.

### Image rendering (src/images/)

`ReplicateClient` wraps the Replicate predictions API. Model definitions (input schemas, defaults) live as JSON files in `src/models/t2i/definitions/` — one file per model. `src/models/t2i/registry.ts` indexes them; `src/models/t2i/options.ts` resolves and validates per-model options.

### Output (src/output/)

`renderMarkdownDocument()` produces the final Markdown file. Images are referenced by relative path. `src/output/filesystem.ts` handles directory creation and file writes.

### CLI (src/cli/)

Built with [Ink](https://github.com/vadimdemedes/ink) (React for terminals).
- `commands/write.tsx` — main write command (launches pipeline + live UI)
- `commands/delete.ts` — delete generated markdown by slug
- `commands/serve.ts` — preview server command
- `commands/settings.tsx` — interactive settings wizard
- `commands/writeTargetSpecs.ts` — target parsing and validation helpers
- `flows/` — multi-step terminal flows
- `logging/` — non-TTY/plain log renderers
- `cli/app.ts` — root Ink app component
- `cli/ui/` — presentational components (`pipelinePresenter`, `stageRow`, `finalSummary`)

CLI command surface in `app.ts`:
- `ideon settings`
- `ideon write [idea]`
- `ideon write resume`
- `ideon delete <slug>`
- `ideon preview [markdownPath]`

---

## Adding a new T2I model

1. Create `src/models/t2i/definitions/<org>__<model>.json` with schema fields matching the Replicate model's input spec.
2. The registry (`registry.ts`) auto-discovers all JSON files in that directory.
3. Add a test case in `src/__tests__/options.test.ts`.
4. Update `docs-site/docs/reference/t2i-models.md`.

## Adding a new pipeline stage

1. Add a new `StageViewModel` entry in `createInitialStages()` in `runner.ts`.
2. Wire the stage logic and `onUpdate` calls in `runPipelineShell()`.
3. Add or extend tests in `src/__tests__/pipeline.runner.test.ts`.
4. Update `docs-site/docs/guides/pipeline-stages.md`.

## Adding a new config setting

1. Add the field to the appropriate Zod schema in `src/config/schema.ts`.
2. Thread it through `src/config/resolver.ts` and `src/config/env.ts` as needed.
3. Add/extend tests in `src/__tests__/config.resolver.test.ts`.
4. Document in `docs-site/docs/guides/configuration.md` and/or `docs-site/docs/reference/environment-variables.md`.

---

## Testing

```bash
npm test                  # run all suites once
npm run test:watch        # re-run on file changes
npm run test:coverage     # generate coverage report
```

Tests use Jest with `ts-jest` transformer and `NODE_OPTIONS=--experimental-vm-modules` for ESM support. Mocking strategy: external clients (`OpenRouterClient`, `ReplicateClient`) are always mocked in unit tests; filesystem helpers use temp dirs or are mocked.

Test files live in `src/__tests__/` and are named `<module>.test.ts`.

---

## Docs

Source: `docs-site/docs/` — Docusaurus Markdown pages.
Deployed to: https://cozymantis.github.io/ideon/ via `.github/workflows/docs-pages.yml` on push to `main`.

```bash
npm run docs:start    # local dev server (hot reload)
npm run docs:build    # production build — must pass before merging
npm run docs:serve    # serve the production build locally
```

Doc page map:
- `getting-started/` — overview, installation, quickstart
- `guides/` — configuration, credentials, job files, writing framework, pipeline stages, output structure, performance and costs, local preview, troubleshooting
- `reference/` — CLI reference, content types, environment variables, T2I models
- `technical/` — architecture, LLM/image pipeline, testing
- `contributing/` — development setup, releasing and docs deploy

Docs update guardrails:
- If behavior changes in `src/cli/`, `src/config/`, `src/pipeline/`, or `src/server/preview*`, update the corresponding page under `docs-site/docs/` in the same change.
- Keep command examples executable as written (`ideon ...` or `npm run dev -- ...`) and avoid mixing styles in one example block.

---

## Credentials

Required at runtime, never committed:
- `IDEON_OPENROUTER_API_KEY` — OpenRouter API key (or via keychain: service `ideon`, account `openrouter`)
- `IDEON_REPLICATE_API_TOKEN` — Replicate API token (or via keychain: service `ideon`, account `replicate`)

Use `ideon settings` to store credentials interactively via the OS keychain.

---

## Key constraints

- Node ≥ 20 required (`"type": "module"` — ESM throughout).
- All source is TypeScript strict mode; no `any` without explicit suppression comment.
- `tsc --noEmit` is the lint/typecheck step — there is no separate ESLint config.
- Docusaurus site is a separate npm workspace (`docs-site/`); run its commands via root `npm run docs:*` scripts or `npm --prefix docs-site run <script>`.
