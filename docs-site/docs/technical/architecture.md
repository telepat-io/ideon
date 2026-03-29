---
title: Architecture
---

# Architecture

Ideon is organized as a modular CLI pipeline with generation-directory outputs and resumable stage artifacts.

## High-Level Execution

1. Resolve config and secrets
2. Build generation directory and run metadata (`job.json`)
3. Conditionally run article planning + section writing
4. Conditionally expand image prompts + render assets
5. Write one or more output markdown files + analytics

## Module Boundaries

- `src/bin`: executable entrypoint
- `src/cli`: command layer and rendering
- `src/config`: schema, env parsing, merging, persistence
- `src/pipeline`: orchestration and stage state
- `src/generation`: article planning/writing + non-article single-shot generation
- `src/llm`: OpenRouter client and prompt builders
- `src/images`: Replicate client + image pipeline
- `src/models/t2i`: model registry + override coercion
- `src/output`: markdown and filesystem utilities
- `src/server`: local preview server, generation discovery helpers, API routes
- `src/preview-app`: React + Ant Design preview client (Vite-built static app)
- `src/types`: domain and validation schemas

## Stage Contract

Each stage carries:

- `id`
- `title`
- `status`
- `detail`
- optional `summary`

This contract drives both Ink UI and plain text renderer output.

## Output Model

Each run writes a generation directory:

- numbered markdown outputs (`article-1.md`, `x-thread-1.md`, `x-post-1.md`, etc.)
- `job.json` with resolved run definition metadata
- `generation.analytics.json`
- shared assets for that generation

Preview and delete operations work against this generation structure.

## Preview Subsystem

Preview is split into two cooperating layers:

1. `src/server/previewServer.ts` (Express server)
2. `src/preview-app/*` (React SPA)

The server is responsible for:

- generation discovery and initial selection
- API endpoints for bootstrap, list, and article detail payloads
- generation-scoped asset serving
- serving static client files from `dist/preview`
- graceful fallback HTML shell when client build is unavailable

The React app is responsible for:

- generation navigation and output variant switching
- channel-specific markdown presentation
- interaction inspection (`Prompt / Response` and `Full JSON` modes)
- light/dark theme UX and persisted theme preference

Build path:

- Vite builds `src/preview-app` into `dist/preview`
- `npm run build` includes `npm run build:preview`
- `ideon preview` launches the preview server and app
- `npm run preview` (repo convenience script) builds preview client first, then launches `ideon preview`

## Error Boundary Strategy

- Stage failures are localized and clearly surfaced
- Handled CLI errors avoid redundant stack traces
- Unknown failures still return non-zero exit codes
