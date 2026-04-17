---
title: Troubleshooting
description: Troubleshooting documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Troubleshooting

## Missing OpenRouter API Key

Error pattern:

- `Missing OpenRouter API key...`

Fix:

- Set `IDEON_OPENROUTER_API_KEY`, or
- Save key through `ideon settings`
- If both are set, env var wins for that run

## Missing Replicate API Token

Error pattern:

- `Missing Replicate API token...`

Fix:

- Set `IDEON_REPLICATE_API_TOKEN`, or
- Save token through `ideon settings`

If your run does not include an `article` target, image stages are skipped and Replicate is not required.

## No Idea Provided

Error pattern:

- `No idea provided...`

Fix:

- Pass `ideon write "your idea"`, or
- Use `--job` with `idea` or `prompt`

## Invalid Job File

Error pattern:

- JSON parse or schema validation error

Fix:

- Validate JSON syntax
- Ensure field types match documented schema
- Re-run with a minimal job first (`{ "idea": "..." }`) and add fields incrementally

## No Resumable Session

Error pattern:

- `No resumable write session found in .ideon/write/state.json...`

Fix:

- Start a fresh run first with `ideon write "your idea"`
- Verify you are in the same working directory used for the original run
- Remember each directory has its own `.ideon/write/state.json`; another directory cannot see this session
- If the project was moved, move the `.ideon/` directory with it, or start a fresh run and resume from the new state

## Interrupted Write Run

Scenario:

- Run was interrupted with `Ctrl+C` or process termination

Recovery:

1. Run `ideon write resume`
2. If resume is not found, verify you are running in the same directory as the original `ideon write`
3. If resume fails repeatedly, inspect and remove `.ideon/write/state.json` to start fresh

## No Generated Content Found

Error pattern:

- `No generated content found in ...`

Fix:

- Run a generation command first (`ideon write "your idea"`)
- Check configured output directories in settings
- Pass an explicit markdown path to `ideon preview`

## Preview Loads but Images Are Missing

Error pattern:

- preview page renders markdown but image placeholders are broken

Fix:

- Verify images exist in the generation directory shown by CLI output
- Ensure preview was started against the same workspace/output root used for generation
- Re-run generation if assets were manually deleted

## Empty Model Output

Error pattern:

- `The model returned an empty ... draft.`

Fix:

- Retry run
- Lower temperature for determinism
- Switch model or reduce prompt ambiguity

If this happens repeatedly for one content type, try reducing target count for that type and validating outputs before scaling back up.

## Structured Output Compatibility Error

Error pattern:

- `Model "..." or its routed provider does not support strict structured outputs...`

Fix:

- Use a model that supports structured outputs on OpenRouter
- Verify provider routing can satisfy required parameters
- Retry with a known structured-output capable model if your default model fails

Notes:

- Ideon enforces strict JSON schema for planning and image-prompt expansion
- If a model/provider cannot satisfy structured output requirements, Ideon fails early instead of attempting permissive fallback parsing

## CI/Non-TTY Output

If UI does not render, Ideon automatically falls back to plain stage logs.

## Preview Server Fails to Start

Common causes:

- Port already in use (default `4173`)
- Invalid `--port` value
- Missing markdown outputs in configured output directory

Fix:

1. Run `ideon preview --port 8080 --no-open`
2. Confirm outputs exist or pass a markdown path explicitly
3. Confirm output directories from `ideon settings` match your active workspace
