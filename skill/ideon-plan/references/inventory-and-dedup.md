# Inventory and Deduplication

## Primary discovery surface

Use `ideon article list` first.

Examples:

```bash
ideon article list --publication tech-blog --json
ideon article list --series onboarding-guides --json
ideon article list --search "keyword research" --publication tech-blog --verbose
```

This is the main way to inspect prior article coverage.

## What to check

Before proposing a plan, inspect:

- articles already targeting the same or adjacent keywords
- articles already attached to the same publication
- articles already attached to the same series
- whether the same angle has already been covered

## Deduplication rule

Default policy:

- overlap inside a series is allowed when the angle is materially distinct
- exact or near-duplicate article intent should be avoided
- if a keyword is reused, explain the difference in angle, audience, or funnel stage

## Forward-only nuance

Publication and series filtering in `ideon article list` only applies to articles generated after that metadata was added.

If the article inventory looks incomplete for older content:

- note the limitation
- use search terms and direct output inspection carefully as a fallback
- avoid claiming that older content is absent just because metadata is missing
# Inventory and Deduplication

## Primary discovery surface

Use `ideon article list` as the main way to inspect prior coverage.

Example commands:

```bash
ideon article list --publication <slug>
ideon article list --series <slug>
ideon article list --search "<query>"
ideon article list --publication <slug> --search "<query>" --verbose
```

## What to check before proposing ideas

Look for:

- exact topic duplicates
- same primary keyword with same angle
- series gaps
- repeated introductions or repeated funnel-stage coverage
- already queued but not yet written ideas

Also inspect:

```bash
ideon queue list --publication <slug>
```

## Deduplication policy

Do not use a naive “same keyword means reject” rule.

Instead:

- reject ideas that reuse the same keyword and the same angle
- keep ideas that reuse a cluster keyword but clearly change the angle
- prefer gaps over overlap when confidence is otherwise similar

## Angle tests

Two ideas are distinct enough when they differ materially in one or more of:

- funnel stage
- ICP segment
- format or use case
- competitive frame
- implementation depth
- problem framing

## Known limitation

`ideon article list` is the correct planner-facing command, but its publication and series filters are forward-only for content generated after metadata support was added. If older content may matter, mention that limitation and use broader search terms to compensate.