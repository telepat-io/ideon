---
name: ideon-plan
description: Use this skill when users need publication-aware content planning, keyword research, topic clustering, series planning, queue planning, and SEO strategy in Ideon using real Google Ads Keyword Planner data with explicit approval gates.
---

# Ideon Planning Skill

## What this skill does

This skill turns Ideon into a planning strategist workflow rather than a writing-only flow.

Use it when the user wants to:

- explore new topic clusters and turn them into series plus article ideas
- expand an existing publication or series with data-backed ideas
- rely on real Google Ads Keyword Planner data for prioritization
- reduce duplication using prior article and queue discovery
- review and approve all state mutations before saving

This skill plans content. It does not write articles unless the user explicitly switches to a writing workflow.

## Current CLI reality

This skill is designed for the current Ideon command surface.

- Use `ideon gads status|test|login` for readiness and setup recovery.
- Use `ideon gkp ideas|historical|forecast` for live keyword research.
- Use `ideon gkp list` for cached query history discovery.
- Use GKP cache under `envPaths('ideon').config/gkp` and `--refresh` when fresh reads are explicitly needed.
- Use `ideon publication`, `ideon series`, `ideon queue`, and `ideon article list` as planning state inputs.

## When to use this skill

Use this skill when:

- the user asks for a content plan, roadmap, or topic-cluster strategy
- the user wants keyword-backed planning rather than pure brainstorming
- the user wants plans attached to publication and series state
- the user wants approved plans persisted into series and queue

Do not use this skill when:

- the user only wants one article drafted immediately
- the user only needs a quick flag explanation
- Google Ads data is unavailable and the user declines setup help

## Inputs to collect

Collect these before deep research.

### Required

- planning mode: net-new cluster exploration or expansion of existing series
- content idea or business topic

### Usually required

- publication slug, or confirmation no publication is needed
- series slug when expanding an existing series
- desired number of series and article ideas

### Optional but important

- business context and ICP
- preferred or enforced seed keywords
- existing series to avoid or extend
- competitor URLs for URL-based idea expansion

Market and locale handling:

- read first-class `countryCodes` and `language` from publication/series defaults when present
- ask for market/locale only when state does not already provide them

## Workflow summary

1. Confirm planning mode and success criteria.
2. Validate Google Ads readiness.
3. Hydrate publication, series, queue, article, and GKP history state.
4. Build seed keywords.
5. Run iterative GKP research.
6. Score and filter candidates.
7. Synthesize series and article proposals.
8. Review and approve the plan.
9. Persist conservatively only after explicit save approval.

Load references as needed:

- [workflow.md](./references/workflow.md)
- [ideon-operations.md](./references/ideon-operations.md)
- [gads-gkp.md](./references/gads-gkp.md)
- [keyword-cache.md](./references/keyword-cache.md)
- [inventory-and-dedup.md](./references/inventory-and-dedup.md)
- [examples.md](./references/examples.md)
- [troubleshooting.md](./references/troubleshooting.md)

## Approval gates

This skill has three mandatory approval points.

### Gate 1: Research brief confirmation

Before expensive research, confirm:

- planning mode
- publication/series scope
- market and language context
- priority constraints

### Gate 2: Plan review

Before save, present:

- proposed series and article ideas
- target keywords and confidence notes
- overlap and dedup findings
- intended series keyword changes

### Gate 3: Save confirmation

Before mutation, present exactly:

- series to create
- series to update
- queue entries to add
- cache files to write or refresh

## Save behavior

Default to conservative persistence.

- create new series after approval
- update existing series only after approval
- change existing series keywords only with explicit approval
- add queue entries after series state is correct
- if the user asks for planning-only mode, do not persist anything

## Quality bar

- prefer evidence over guesswork
- show confidence and uncertainty explicitly
- broaden adjacent terms before declaring sparse-data failure
- keep angles distinct within a series
- use native Ideon keyword and market/locale fields before ad hoc metadata
