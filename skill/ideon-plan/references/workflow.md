# Workflow

## Goal

Turn a topic into publication-aware series and article plans using real keyword data, existing Ideon state, and explicit user approval.

## Step 1: Confirm planning mode

Ask whether the user wants:

- net-new topic cluster exploration
- expansion of an existing series

This choice determines how aggressively new series are proposed.

## Step 2: Hydrate current state

Read current context before researching.

1. Check Google Ads readiness.
2. Read publications and series.
3. Read queue state.
4. Search prior coverage with `ideon article list`.
5. Read GKP query history with `ideon gkp list`.
6. Read cache state under `envPaths('ideon').config/gkp` when deeper provenance is needed.

When publication or series context is present, capture first-class market defaults (`countryCodes` and `language`) before issuing new GKP queries.

## Step 3: Build seeds

Derive 5 to 8 seed keywords from:

- core topic variants
- ICP vocabulary
- adjacent commercial terms
- broad and long-tail phrasings

Record a short reason for each seed.

## Step 4: Research loop

Run this loop until you have at least 30 scored candidates.

1. Query seeds via `ideon gkp ideas`.
2. Query promising terms via `ideon gkp historical`.
3. Use `ideon gkp forecast` when commercial projection context helps prioritization.
4. Expand promising terms into long-tail variants.
5. Use URL mode when competitor URLs are available.
6. Reuse fresh cached results whenever possible.
7. Use `--refresh` only when data is stale or the user explicitly requests fresh reads.
8. If data is sparse, broaden into adjacent topics and synonyms.

Only present low-confidence planning after this refinement loop fails.

## Step 5: Score keywords

Use KOB-style scoring:

$$
KOB = \frac{volume\_score \times intent\_score}{difficulty\_score}
$$

Default policy:

- `< 2`: discard unless strategically justified
- `2-3.99`: secondary/supporting
- `>= 4`: strong candidate

Do not auto-discard zero/dash volume terms when intent is strong and competition is low.

## Step 6: Synthesize plan

Group keywords into series and article ideas.

- use a parent problem or strategic keyword as cluster center
- map shared terms to series keyword defaults
- map specific terms to per-article keyword sets
- avoid near-duplicate angles
- prefer uncovered or under-covered publication territory

For each article, record:

- target keyword set
- angle
- search intent
- funnel stage
- confidence
- overlap notes

## Step 7: Review and approval

Present:

- research performed
- accepted and rejected candidates
- series and article proposals
- intended series mutations
- intended queue additions

Do not write state before explicit approval.

## Step 8: Persist conservatively

After approval:

1. create or conservatively update series
2. add queue entries
3. write or refresh keyword cache artifacts
4. write a planning-session summary artifact
