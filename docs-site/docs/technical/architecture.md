---
title: Architecture
---

# Architecture

Ideon is organized as a modular CLI pipeline.

## High-Level Execution

1. Resolve config and secrets
2. Plan article structure
3. Draft article sections
4. Expand image prompts and render assets
5. Assemble markdown artifact

## Module Boundaries

- `src/bin`: executable entrypoint
- `src/cli`: command layer and rendering
- `src/config`: schema, env parsing, merging, persistence
- `src/pipeline`: orchestration and stage state
- `src/generation`: article planning and writing
- `src/llm`: OpenRouter client and prompt builders
- `src/images`: Replicate client + image pipeline
- `src/models/t2i`: model registry + override coercion
- `src/output`: markdown and filesystem utilities
- `src/types`: domain and validation schemas

## Stage Contract

Each stage carries:

- `id`
- `title`
- `status`
- `detail`
- optional `summary`

This contract drives both Ink UI and plain text renderer output.

## Error Boundary Strategy

- Stage failures are localized and clearly surfaced
- Handled CLI errors avoid redundant stack traces
- Unknown failures still return non-zero exit codes
