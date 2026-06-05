---
title: ideon plan expand
description: Expand an existing series with new keyword-backed article ideas using Google Keyword Planner data.
keywords: [ideon, plan, expand, content planning, series expansion, keyword research]
---

# ideon plan expand

Expand an existing series with new article ideas, backed by Google Keyword Planner research. The plan is presented in an interactive review flow before being saved to your queue.

## Synopsis

```bash
ideon plan expand [series-slug] [options]
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `series-slug` | Series slug to expand | No (can be selected interactively) |

If `series-slug` is omitted and not provided via `--non-interactive`, Ideon lists available series and prompts for selection interactively.

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--publication` | `-p` | Publication slug | **Required** |
| `--country` | | Comma-separated ISO country codes | Publication default or `US` |
| `--language` | | ISO 639-1 language code | Publication default or `en` |
| `--article-count` | | Target new articles to plan | `5` |
| `--seed-keywords` | | Comma-separated additional seed keywords | — |
| `--content-type` | | Content type for queue entries | `article` |
| `--model` | | Model for strong reasoning calls | `deepseek/deepseek-v4-pro` |
| `--intent-model` | | Model for intent classification | `deepseek/deepseek-v4-flash` |
| `--auto-save` | | Skip approval gates and save automatically | `false` |
| `--non-interactive` | | Agent mode: plain text output to stdout | `false` |
| `--dry-run` | | Run research but skip all writes | `false` |

## Examples

### Basic expansion

```bash
ideon plan expand ai-deep-dives --publication tech-blog
```

If the series slug is omitted, an interactive prompt shows available series to pick from.

### With custom article count

```bash
ideon plan expand kubernetes-series \
  --publication tech-blog \
  --article-count 8
```

### Adding seed keywords

```bash
ideon plan expand cloud-cost \
  --publication finops-blog \
  --seed-keywords "cloud repatriation,AWS savings plans,reserved instances pricing" \
  --article-count 4
```

These additional keywords supplement the series's existing keywords for GKP research.

### Non-interactive agent mode

```bash
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --non-interactive \
  --auto-save
```

Output goes to stdout. The plan is automatically persisted.

### Dry-run to preview

```bash
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --dry-run
```

Runs research but persists nothing. Useful for scoping an expansion before committing.

## How Expand Differs from Explore

| Aspect | Explore (`new-idea`) | Expand (`expand-series`) |
|--------|----------------------|--------------------------|
| Starting point | Content idea from scratch | Existing series |
| Seed keywords | LLM-generated + user-provided | Series keywords + user-provided |
| Series output | Creates new series clusters | Plans articles for one existing series |
| Cluster formation | Groups candidates into new series | Uses the target series's structure |
| Coverage check | Full dedup against existing content | Dedup within the series scope |
| Queue entries | Articles queued under new series | Articles queued under existing series |

## Pipeline Stages

The expand mode skips clustering (since you're expanding a known series) and runs:

1. **Hydrate** — Load publication, series, output history, and GKP cache
2. **Seeds** — Extract keywords from the target series; apply seed keywords
3. **Research** — Iterative GKP queries
4. **Score** — KOB scoring, intent classification, candidate filtering
5. **Plan Articles** — Plan new articles for the existing series
6. **Persist** — Update series keywords and queue new articles

## Interactive Flow

When `--non-interactive` is not set and `--auto-save` is not enabled:

1. **Series selection** (if `series-slug` was not provided) — Pick from available series
2. **Plan review** — Article details with keyword, intent, and format
3. **Approval gate** — Confirm or reject the plan

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Plan completed successfully |
| `1` | Pipeline failed (API error, missing credentials, series not found) |
| `2` | No results found |

## Output Format (Non-Interactive)

When `--non-interactive` is set, the output shows:

```
# Plan: expand
Mode: expand-series
Publication: tech-blog
Series: AI Deep Dives

## Research
Rounds: 2
Candidates evaluated: 45
Candidates passed: 18
Cache hits: 28
API calls: 5

## Articles

### Article: How Transformer Models Revolutionized NLP
Primary keyword: transformer models explained
Secondary keywords: attention mechanism, self-attention tutorial
Intent: informational
Funnel: top
Format: tutorial
Priority: high
Type: new

### Article: Transformers vs RNNs: A Practical Comparison
Primary keyword: transformers vs RNNs
Secondary keywords: sequential models comparison, LSTM alternatives
Intent: commercial
Funnel: middle
Format: comparison
Priority: medium
Type: new
```

## Related Commands

- [`ideon plan explore`](./ideon-plan-explore.md) — Research a new content idea
- [`ideon series add`](./ideon-series.md) — Create a series manually
- [`ideon gkp ideas`](./ideon-gkp.md) — Generate GKP keyword ideas
- [`ideon queue add`](./ideon-queue-add.md) — Add an article to the queue
