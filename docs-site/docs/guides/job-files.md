---
title: Job Files
---

# Job Files

Job files allow repeatable and shareable article runs.

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

## Idea Resolution Rule

Idea selection order:

1. Direct CLI idea argument
2. `job.idea`
3. `job.prompt`

If none are present, Ideon throws a user-facing error.
