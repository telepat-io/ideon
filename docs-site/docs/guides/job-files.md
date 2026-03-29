---
title: Job Files
---

# Job Files

Job files allow repeatable and shareable generation runs across one or more content types.

## Minimal Example

```json
{
  "idea": "How content teams can scale AI-assisted writing"
}
```

Run:

```bash
npm run dev -- write --job ./job.json
```

## Extended Example

```json
{
  "idea": "How editorial teams can ship weekly explainers",
  "targetAudience": "Content leads at small SaaS teams building repeatable thought-leadership motions",
  "settings": {
    "model": "moonshotai/kimi-k2.5",
    "modelSettings": {
      "temperature": 0.7,
      "maxTokens": 2500,
      "topP": 0.95
    },
    "modelRequestTimeoutMs": 90000,
    "contentTargets": [
      { "contentType": "article", "role": "primary", "count": 1 },
      { "contentType": "x-thread", "role": "secondary", "count": 2 },
      { "contentType": "x-post", "role": "secondary", "count": 1 },
      { "contentType": "linkedin-post", "role": "secondary", "count": 1 }
    ],
    "style": "friendly",
    "t2i": {
      "modelId": "black-forest-labs/flux-schnell",
      "inputOverrides": {
        "output_format": "png"
      }
    },
    "markdownOutputDir": "/output",
    "assetOutputDir": "/output/assets"
  }
}
```

## Notes

- `settings.contentTargets` must include exactly one primary target and optional secondary targets.
- If `settings.style` is omitted, Ideon defaults to `professional`.
- If `targetAudience` is omitted, Ideon seeds shared-brief planning with a general non-specific audience.
- CLI arguments override job-file settings for `idea`, `targetAudience`, `style`, and `contentTargets`.
- Environment variables override matching job-file fields where supported.
- After each run, Ideon writes a generated `job.json` inside the generation directory that captures the resolved run definition and metadata for that specific execution.

## Override Matrix

Highest to lowest precedence:

1. CLI flags and direct idea input
2. Environment variables (`IDEON_*`)
3. Job file `settings`
4. Saved settings
5. Schema defaults

Practical examples:

- `ideon write --job ./job.json --style technical` forces technical style even if the job file says otherwise.
- `ideon write --job ./job.json --audience "Procurement leaders evaluating AI ops tooling"` overrides `job.targetAudience` for that run.
- `IDEON_MODEL=... ideon write --job ./job.json` uses the env model instead of the job model.
- `--primary` with optional `--secondary` replaces the full job `settings.contentTargets` array for that run.

## Reusing Generated Job Definitions

Every generation directory includes a resolved `job.json`. You can copy that file, adjust only what you need (for example model, style, or targets), and run it again:

```bash
ideon write --job ./output/20260327-your-slug/job.json
```

This is the easiest way to reproduce or branch previous runs with minimal drift.

## Idea Resolution Rule

Idea selection order:

1. Direct CLI idea argument
2. `job.idea`
3. `job.prompt`

If none are present, Ideon throws a user-facing error.
