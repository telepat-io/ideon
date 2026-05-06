# AGENTS.md — Ideon Codebase Guide

Concise reference for AI agents working on this codebase.

---

## Commits and releases

- Use Conventional Commits: `fix:`, `feat:`, `docs:`, etc.
- Only commit if instructed.
- Run after every code change:
  - `npm run lint`
  - `npm run build`
  - `npm run test:coverage`
  - `npm run docs:build`
- Keep CLI/config/pipeline/preview/MCP/SKILL.md in sync with code changes.
- Update the docs extensively after code changes, especially for new features or architectural changes.

---

## Architecture

- Config: CLI > env > settings file > defaults. Key files: `src/config/schema.ts`, `resolver.ts`, `env.ts`, `secretStore.ts`.
- Pipeline: `runPipelineShell()` in `src/pipeline/runner.ts`; stages run from `shared-plan` to `links`.
- LLM: `OpenRouterClient`, prompt templates in `src/llm/prompts/`, response validation via `src/types/articleSchema.ts`.
- Images: `ReplicateClient`; model definitions in `src/models/t2i/definitions/`; registry and option resolution in `registry.ts` and `options.ts`.
- Output: `renderMarkdownDocument()` and filesystem helpers in `src/output/filesystem.ts`.
- CLI: Ink commands in `src/cli/commands/`, root app in `src/cli/app.ts`.

---

## Additions

- New T2I model: add JSON definition, add test, update docs.
- New pipeline stage: add stage in `runner.ts`, wire logic, add tests, update docs.
- New config setting: add schema field, update resolver/env, add tests, update docs.

---

## Testing

- `npm test`
- `npm run test:coverage`
- Jest uses `ts-jest` and `NODE_OPTIONS=--experimental-vm-modules`.

---

## Docs

- Primary docs live in `docs/`.
- Site workspace is `docs-site/`.
- Keep user-visible docs and `zh-Hans` parity in sync.

---

## Credentials

- `IDEON_OPENROUTER_API_KEY`
- `IDEON_REPLICATE_API_TOKEN`

---

## Constraints

- Node ≥ 20.
- TypeScript strict.
- `tsc --noEmit` is the lint/typecheck step.
- `docs-site/` is a separate npm workspace.
