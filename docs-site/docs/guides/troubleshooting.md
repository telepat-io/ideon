---
title: Troubleshooting
---

# Troubleshooting

## Missing OpenRouter API Key

Error pattern:

- `Missing OpenRouter API key...`

Fix:

- Set `IDEON_OPENROUTER_API_KEY`, or
- Save key through `npm run dev -- settings`

## Missing Replicate API Token

Error pattern:

- `Missing Replicate API token...`

Fix:

- Set `IDEON_REPLICATE_API_TOKEN`, or
- Save token through `npm run dev -- settings`

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
