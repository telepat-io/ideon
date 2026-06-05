# AGENTS.md — Ideon Codebase Guide

Concise reference for AI agents working on this codebase.

---

## Commits and releases

- Use Conventional Commits: `fix:`, `feat:`, `docs:`, etc.
- Only commit if instructed.
- Run after every code change:
  - `npm run lint`
  - `npm run build`
  - `npm run test:coverage` (NOT `npm test` — only `test:coverage` enforces the 90% threshold)
  - `npm run docs:build`
- Keep CLI/config/pipeline/preview/MCP/SKILL.md in sync with code changes.
- Keep `ideon/skill/ideon/` in sync with runtime behavior, especially:
  - pipeline stage semantics and checkpoint flow
  - output metadata format (`meta.json`) and links artifact schema
  - custom link merge/precedence behavior and Replicate model/config guidance
- **Whenever writing guides are updated** (files in `ideon/writing-guide/`):
  - Run `npm run guides:sync` to sync guides into the skill directory
  - Commit both the updated guides and the synced copies in `ideon/skill/ideon/guides/`
  - This keeps the skill self-contained and ensures agents have access to the latest guides
- Update the docs extensively after code changes, especially for new features or architectural changes.

---

## Architecture

- Config: CLI > env > settings file > defaults. Key files: `src/config/schema.ts`, `resolver.ts`, `env.ts`, `secretStore.ts`.
- Pipeline: `runPipelineShell()` in `src/pipeline/runner.ts`; stages run from `shared-plan` to `links`.
- LLM: `OpenRouterClient`, prompt templates in `src/llm/prompts/`, response validation via `src/types/articleSchema.ts`. Shared HTTP retry helper in `src/llm/retry.ts` (used by Replicate image rendering and reusable for other external calls — honors `Retry-After` header and `retry_after` JSON body).
- Images: `ReplicateClient`; model definitions in `src/models/t2i/definitions/`; registry and option resolution in `registry.ts` and `options.ts`.
- Output: `renderMarkdownDocument()` and filesystem helpers in `src/output/filesystem.ts`.
- MCP: dual transport — stdio (`src/integrations/mcp/server.ts`) and Streamable HTTP (`src/integrations/mcp/httpServer.ts`). Shared tool registration via `registerIdeonTools()`. HTTP middleware in `src/integrations/mcp/httpMiddleware.ts`.
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
- Keep user-visible docs and `zh-CN` parity in sync.

---

## Credentials

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN`

---

## Constraints

- Node ≥ 20.
- TypeScript strict.
- `tsc --noEmit` is the lint/typecheck step.
- `docs-site/` is a separate npm workspace.
