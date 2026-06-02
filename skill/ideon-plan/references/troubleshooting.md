# Troubleshooting

## Google Ads setup is not ready

Symptoms:

- `ideon gads status` shows missing fields
- `ideon gads test` fails
- GKP commands error immediately

Response:

- stop broad research
- explain the exact missing or broken prerequisite
- route the user through `ideon gads login` or the config path

## Cache looks stale or contradictory

Symptoms:

- old data conflicts with current research
- high-value terms look obviously outdated

Response:

- refresh the relevant live GKP query
- update cache artifacts
- note the refresh in the planning summary

## Prior coverage is ambiguous

Symptoms:

- `ideon article list` does not surface older articles by publication or series
- metadata coverage is incomplete

Response:

- rely on `ideon article list` first
- note the forward-only metadata limitation
- use cautious fallback inspection of older output where necessary

## Sparse or zero-volume terms dominate

Response:

- broaden into adjacent or synonymous terms first
- keep niche terms if commercial intent and low competition are still attractive
- mark low-confidence decisions explicitly

## User wants immediate writing instead of planning

Response:

- stop this skill after presenting the plan or approved queue
- hand off to the Ideon writing workflow rather than mixing planning and generation implicitly
# Troubleshooting

## Google Ads not configured

Symptoms:

- `ideon gads status` shows missing credentials
- `ideon gads test` fails
- `ideon gkp ...` commands error immediately

Response:

1. pause planning
2. show the missing readiness check
3. guide the user through `ideon gads login` or manual setup
4. resume only after `ideon gads test` succeeds

## Sparse or weak keyword data

Symptoms:

- many zero or dash search values
- not enough candidates to score
- only tangential terms appear

Response:

1. expand synonyms
2. expand adjacent commercial topics
3. expand use-case and comparison terms
4. if still weak, present a low-confidence plan with explicit warning

## Existing content overlap

Symptoms:

- prior articles already cover the same topic
- queue already contains similar ideas
- series keywords already point to the same angle

Response:

1. use `ideon article list` and `ideon queue list` to confirm overlap
2. change angle before changing the keyword set
3. prefer a gap over a duplicate when confidence is otherwise similar

## Series keyword changes feel risky

Response:

- default to conservative behavior
- show the current keywords and proposed keywords together
- ask for explicit approval before changing an existing series

## Cache confusion

If results look inconsistent:

1. check whether the cache is still within the freshness window
2. inspect query snapshots and keyword records separately
3. use `--refresh` when a fresh Google Ads read is required

## Missing CLI capability

This skill assumes a planner-friendly GKP workflow including `ideon gkp list` and cache-aware behavior.

If the running build does not expose that surface yet:

1. say so explicitly
2. fall back to direct cache inspection if available
3. avoid pretending the command exists