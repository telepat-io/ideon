# Keyword Cache

## Purpose

The planner should remember prior keyword research so it can:

- avoid repeating the same GKP requests
- refine previous research instead of starting from zero
- reuse recent data for scheduled planning runs

## Location

Use:

```text
<ideon-config>/gkp/
```

In practice Ideon stores this under the config directory returned by `envPaths('ideon', { suffix: '' }).config`.

## Two-layer structure

### Layer 1: Query snapshots

Store raw per-query snapshots for provenance and replay.

Suggested directory:

```text
<ideon-config>/gkp/queries/
```

Suggested record shape:

```json
{
  "version": 1,
  "savedAt": "2026-06-03T12:34:56.000Z",
  "queryFingerprint": "...",
  "queryMode": "ideas",
  "publication": "tech-blog",
  "series": "seo-playbooks",
  "language": "en",
  "countryCodes": ["US"],
  "sourceSeed": ["content strategy for saas"],
  "request": {},
  "response": {},
  "freshForDays": 30
}
```

Current CLI support:

- `ideon gkp ideas|historical|forecast` writes these snapshots automatically
- `ideon gkp list` reads and filters them
- `--refresh` bypasses fresh cached snapshots

### Layer 2: Keyword records

Store normalized per-keyword records for fast reuse and scoring.

Suggested directory:

```text
<ideon-config>/gkp/keywords/
```

Suggested record shape:

```json
{
  "version": 1,
  "keyword": "content strategy for saas",
  "normalizedKey": "content-strategy-for-saas",
  "savedAt": "2026-06-03T12:34:56.000Z",
  "publication": "tech-blog",
  "series": "seo-playbooks",
  "language": "en",
  "countryCodes": ["US"],
  "avgMonthlySearches": 90,
  "competition": "LOW",
  "lowTopOfPageBidMicros": 1200000,
  "highTopOfPageBidMicros": 4500000,
  "volumeScore": 2,
  "intentScore": 4,
  "difficultyScore": 1,
  "kobScore": 8,
  "sourceQueries": ["..."]
}
```

## Freshness policy

- Default freshness window: 30 days
- Use cache when the record is still fresh
- Use `--refresh` when the user wants a forced recheck

## Planner behavior

Before any new GKP request:

1. inspect prior query snapshots
2. inspect matching keyword records
3. reuse fresh records when appropriate
4. refresh only when missing, stale, or explicitly requested

## Planning-session artifacts

In addition to raw cache, store per-run planning summaries so scheduled runs can learn from prior decisions.

Suggested directory:

```text
<ideon-config>/gkp/plans/
```

Suggested contents:

- brief
- accepted clusters
- rejected clusters
- deferred ideas
- queued ideas
- publication and series scope
- confidence notes