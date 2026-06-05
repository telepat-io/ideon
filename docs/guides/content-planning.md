---
title: Content Planning
description: Plan content series and articles with Google Keyword Planner-backed research, topic clustering, and interactive review in Ideon.
keywords: [ideon, content planning, keyword research, topic clustering, series planning, SEO strategy]
---

# Content Planning

Ideon's content planning feature turns your topic ideas into data-backed, publication-ready content strategies. Instead of guessing what to write, you get keyword-validated series and article proposals reviewed through an interactive terminal UI — all backed by real Google Ads Keyword Planner data.

## Overview

Content planning has two modes, accessed via the `ideon plan` command:

| Mode | Command | When to use |
|------|---------|-------------|
| **Explore** | `ideon plan explore` | Research a new content idea and generate fresh series and article plans |
| **Expand** | `ideon plan expand` | Add new article ideas to an existing series |

Both modes require a publication, Google Ads credentials, and an OpenRouter API key. The output is a set of series proposals and article ideas that you review and approve before they're persisted into your queue.

## Quick Example

```bash
# Explore a new topic
ideon plan explore "Content strategy for B2B SaaS" \
  --publication tech-blog \
  --series-count 3 \
  --articles-per-series 5 \
  --context "We help early-stage B2B SaaS companies build content engines"

# Expand an existing series
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --article-count 6
```

## How It Works

Ideon runs a seven-stage planning pipeline:

### Stage 1: Hydrate

Loads your publication, series, and output history to build a **coverage map** — a picture of every keyword you've already covered and how old each article is. This prevents duplicate suggestions and surfaces refresh candidates.

### Stage 2: Seeds

Generates seed keywords from your content idea. In explore mode, the LLM proposes keyword themes with rationales; user-provided seed keywords are always included. In expand mode, the target series's existing keywords seed the research.

### Stage 3: Research

Queries Google Keyword Planner (GKP) iteratively. Each round:
- Queries fresh seed keywords against GKP
- Caches results and reuses recent snapshots
- Tracks candidate volume, competition, and CPC data
- Broadens keywords when returns diminish
- Enters low-volume mode when search volume is sparse

### Stage 4: Score

Scores and filters every candidate keyword using the **KOB score** (Keyword Opportunity Benchmark), which weights:
- Search volume
- CPC signal (high bids indicate commercial intent)
- Competition level
- Intent classification (informational, commercial, transactional)

Candidates below the scoring threshold are discarded with reasons.

### Stage 5: Cluster

Groups shortlisted keywords into thematic **series**. Each cluster gets:
- A pillar keyword
- Supporting keyword list
- Funnel stage (top, middle, bottom)
- Rationale and coverage gap notes

Clusters avoid existing series marked for exclusion.

### Stage 6: Plan Articles

For each series cluster, plans individual articles with:
- Title and content angle
- Primary and secondary keywords
- Intent type (informational, commercial, transactional)
- Format (guide, listicle, comparison, case-study, tutorial, opinion)
- Priority (high, medium, low)
- Confidence notes

### Stage 7: Persist

After your approval, the plan is saved:
- New series are created
- Existing series keywords are updated
- Article ideas are queued as `ideon queue` entries
- A planning session record is written

## Interactive Review Flow

When running in interactive mode (default), Ideon presents a terminal UI review after the pipeline completes:

1. **Summary view** — Series count, article count, research stats
2. **Series review** — Navigate and expand each series to see pillar keywords and article lists
3. **Article review** — Browse individual articles with keyword, intent, and format details
4. **Approval gate** — Confirm or reject the full plan

Use the arrow keys to navigate, Enter to expand/collapse series, and `Y`/`N` to confirm.

## Non-Interactive Mode

For CI, automation, and agent workflows, use `--non-interactive` to skip the TUI entirely and write the plan output to stdout:

```bash
ideon plan explore "Content strategy for SaaS" \
  --publication tech-blog \
  --non-interactive \
  --auto-save
```

| Flag | Effect |
|------|--------|
| `--non-interactive` | Skips TUI; writes plan as plain text to stdout |
| `--auto-save` | Bypasses approval gates; persists plan immediately |
| `--dry-run` | Runs research but writes nothing to disk |

## Coverage Map and Deduplication

Before proposing any keyword, Ideon checks your **coverage map** — a record of every keyword you've published under the current publication. Keywords already covered are surfaced with:
- The existing article title
- How old the article is in months
- A **refresh candidate** flag if older than 6 months

This ensures your plan never suggests writing the same topic twice, and helps you spot content that needs updating.

## KOB Scoring and Intent Classification

The **Keyword Opportunity Benchmark (KOB)** score combines:

| Factor | Weight | Source |
|--------|--------|--------|
| Monthly search volume | High | GKP historical data |
| CPC signal | Medium | High top-of-page bid |
| Competition level | Medium | GKP competition index |
| Intent clarity | Low | LLM classification |

**Intent classification** uses a separate LLM call to classify each keyword as informational, commercial, or transactional with a confidence score of 1–5. This feeds into funnel stage assignment during clustering.

## Low-Volume Mode

When research exhausts available keywords in a low-search-volume topic, Ideon switches to **low-volume mode**. This relaxes the scoring thresholds so you still get useful plans rather than empty results. The output flags this condition so you know the topic has limited demand signals.

If no candidates pass even in low-volume mode, a pivot suggestion section appears with alternative angles to try.

## Working with Publications and Series

Content planning is deeply integrated with Ideon's publication and series system:

```bash
# Create a publication first
ideon publication add "Tech Blog" --style technical --intent tutorial

# Create a series manually (optional — plans create series automatically)
ideon series add "AI Deep Dives" --topic "Exploring AI technologies" --publication tech-blog

# Plan against your publication
ideon plan explore "Machine learning trends" --publication tech-blog

# Avoid duplicating an existing series
ideon plan explore "ML trends" \
  --publication tech-blog \
  --exclude-series ai-deep-dives
```

Publication defaults (style, intent, country, language) feed into the planning pipeline. Country codes and language are passed to every GKP query so volume data is market-specific.

## CLI Reference

Full command details on individual pages:

- [`ideon plan explore`](../reference/commands/ideon-plan-explore.md) — Research a new idea
- [`ideon plan expand`](../reference/commands/ideon-plan-expand.md) — Expand an existing series

## Agent and Automation Workflows

Content planning supports the same automation surface as writing:

- **Non-interactive mode** — `ideon plan explore ... --non-interactive --auto-save`
- **Exit codes** — 0 on success, 1 on failure, 2 on no results
- **MCP integration** — Planning is compatible with the MCP server (`ideon mcp serve`) for agent-orchestrated workflows
- **Skill packages** — The `ideon-plan` skill package provides agent-level guidance for planning workflows

## Related Documentation

- [Google Keyword Planner Integration](./google-ads-keyword-planner.md)
- [Configuration](./configuration.md)
- [Pipeline Stages](./pipeline-stages.md)
- [Job Files](./job-files.md)
- [Output Structure](./output-structure.md)
