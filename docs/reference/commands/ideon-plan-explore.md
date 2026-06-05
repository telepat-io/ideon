---
title: ideon plan explore
description: Research a new content idea and generate keyword-backed series and article plans.
keywords: [ideon, plan, explore, content planning, keyword research, topic clustering]
---

# ideon plan explore

Research a new content idea with Google Keyword Planner data and generate series and article proposals. The plan is presented in an interactive review flow before being saved to your queue.

## Synopsis

```bash
ideon plan explore [idea] [options]
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `idea` | Content idea to research | No (can be entered interactively) |

If `idea` is omitted and not provided via `--non-interactive`, Ideon prompts for it interactively.

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--publication` | `-p` | Publication slug | **Required** |
| `--context` | | Business context or ICP description | — |
| `--country` | | Comma-separated ISO country codes | Publication default or `US` |
| `--language` | | ISO 639-1 language code | Publication default or `en` |
| `--series-count` | | Target number of series | `3` |
| `--articles-per-series` | | Target articles per series | `5` |
| `--seed-keywords` | | Comma-separated seed keywords to always include | — |
| `--exclude-series` | | Comma-separated series slugs to avoid duplicating | — |
| `--content-type` | | Content type for queue entries | `article` |
| `--model` | | Model for strong reasoning calls | `deepseek/deepseek-v4-pro` |
| `--intent-model` | | Model for intent classification | `deepseek/deepseek-v4-flash` |
| `--auto-save` | | Skip approval gates and save automatically | `false` |
| `--non-interactive` | | Agent mode: plain text output to stdout | `false` |
| `--dry-run` | | Run research but skip all writes | `false` |

## Examples

### Basic exploration

```bash
ideon plan explore "Content strategy for B2B SaaS" --publication tech-blog
```

This opens an interactive prompt for any missing required inputs, runs all seven planning stages, and presents the results in the review TUI.

### With business context and seed keywords

```bash
ideon plan explore "Cloud cost optimization" \
  --publication tech-blog \
  --context "We target engineering leaders at companies spending $50k+/month on cloud" \
  --seed-keywords "FinOps,AWS cost savings,cloud waste reduction" \
  --series-count 4 \
  --articles-per-series 6
```

### Non-interactive agent mode

```bash
ideon plan explore "DevOps automation trends" \
  --publication tech-blog \
  --non-interactive \
  --auto-save \
  --context "Our ICP: platform engineering teams at mid-market companies"
```

Output goes to stdout. The plan is automatically persisted. Exit code 2 if no results are found.

### Avoiding existing series

```bash
ideon plan explore "Kubernetes best practices" \
  --publication tech-blog \
  --exclude-series kubernetes-101,k8s-security
```

Excluded series and their keywords are excluded from cluster formation.

### Dry-run to preview without saving

```bash
ideon plan explore "AI in healthcare" \
  --publication health-tech \
  --dry-run
```

All research runs normally but nothing is persisted — no series created, no queue entries added. Useful for validating ideas before committing.

### With custom models

```bash
ideon plan explore "Growth marketing strategies" \
  --publication growth-blog \
  --model anthropic/claude-opus-4 \
  --intent-model openai/gpt-4.1-mini
```

Uses a strong model for the planning LLM calls and a faster/cheaper model for intent classification.

## Pipeline Stages

The explore mode runs these seven stages sequentially:

1. **Hydrate** — Load publication, series, output history, and GKP cache
2. **Seeds** — Generate seed keywords from the content idea
3. **Research** — Iterative GKP queries with broadening and low-volume detection
4. **Score** — KOB scoring, intent classification, and candidate filtering
5. **Cluster** — Group shortlisted keywords into thematic series
6. **Plan Articles** — Plan individual articles per series
7. **Persist** — Save series, update keywords, and queue articles

## Interactive Flow

When `--non-interactive` is not set and `--auto-save` is not enabled:

1. **Input prompt** (if `idea` wasn't provided) — Enter your content idea
2. **Plan review** — Series summary, navigate series, review articles
3. **Approval gate** — Confirm or reject the plan

Press `Ctrl+C` at any point to cancel without saving.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Plan completed successfully |
| `1` | Pipeline failed (API error, missing credentials, etc.) |
| `2` | No results found (topic exhausted, low demand) |

## Output Format (Non-Interactive)

When `--non-interactive` is set, the output is plain text structured as:

```
# Plan: explore
Mode: new-idea
Publication: tech-blog
Series: AI Strategy

## Research
Rounds: 3
Candidates evaluated: 87
Candidates passed: 23
Cache hits: 42
API calls: 9

## Series: AI Strategy
Pillar keyword: enterprise AI strategy
Funnel: top
Rationale: Foundational keyword cluster with strong informational intent
Coverage gap: No existing content in this cluster

### Article: How to Build an Enterprise AI Strategy
Primary keyword: enterprise AI strategy
Secondary keywords: AI adoption framework, enterprise AI roadmap
Intent: informational
Funnel: top
Format: guide
Priority: high
Pillar: yes
Type: new

ideon queue add "How to Build an Enterprise AI Strategy" --publication tech-blog --series ai-strategy --keywords "enterprise AI strategy, AI adoption framework, enterprise AI roadmap" --intent guide --type article
```

If no results are found, the output shows:

```
# Plan: explore
Mode: new-idea
Publication: tech-blog

## No Results
Candidates found: 12
Status: exhausted

No sufficient demand signals found for this topic.

## Pivot Suggestions
- Try broader seed keywords
- Narrow your target market
- Check if existing content already covers this topic
```

## Related Commands

- [`ideon plan expand`](./ideon-plan-expand.md) — Expand an existing series
- [`ideon gkp ideas`](./ideon-gkp.md) — Generate GKP keyword ideas
- [`ideon series add`](./ideon-series.md) — Create a series manually
- [`ideon queue add`](./ideon-queue-add.md) — Add an article to the queue
