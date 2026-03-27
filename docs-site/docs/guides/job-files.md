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
  "settings": {
    "model": "moonshotai/kimi-k2.5",
    "modelSettings": {
      "temperature": 0.7,
      "maxTokens": 2500,
      "topP": 0.95
    },
    "contentTargets": [
      { "contentType": "article", "count": 1 },
      { "contentType": "x-post", "count": 2, "xMode": "thread" },
      { "contentType": "linkedin-post", "count": 1 }
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

- If `settings.contentTargets` is omitted, Ideon defaults to one article output.
- If `settings.style` is omitted, Ideon defaults to `professional`.
- CLI arguments override job-file settings.
- After each run, Ideon writes a generated `job.json` inside the generation directory that captures the resolved run definition and metadata for that specific execution.

## Idea Resolution Rule

Idea selection order:

1. Direct CLI idea argument
2. `job.idea`
3. `job.prompt`

If none are present, Ideon throws a user-facing error.
