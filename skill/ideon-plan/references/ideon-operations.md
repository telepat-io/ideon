# Ideon Operations

## Read-only discovery commands

Run these before planning mutations.

```bash
ideon gads status
ideon gads test
ideon publication list
ideon series list
ideon series list --publication <slug>
ideon queue list
ideon queue list --publication <slug>
ideon article list
ideon article list --publication <slug>
ideon article list --series <slug>
ideon article list --search "<query>"
ideon gkp list
```

## GKP research commands

```bash
ideon gkp ideas --keywords "content strategy,saas seo"
ideon gkp ideas --url https://example.com
ideon gkp historical --keywords "content strategy for saas"
ideon gkp forecast --keywords "content strategy software" --match-type EXACT
```

Current behavior:

- `ideas`, `historical`, `forecast`, and `list` are available.
- GKP responses are persisted under `envPaths('ideon').config/gkp`.
- `--refresh` bypasses fresh cached snapshots for `ideas`, `historical`, and `forecast`.

## Publication and series market defaults

Market and locale fields are first-class publication/series defaults:

- `countryCodes` via `--country "US,GB"`
- `language` via `--language en`

Examples:

```bash
ideon publication add "Tech Blog" --country "US,GB" --language en
ideon publication edit tech-blog --country "DE,AT,CH" --language de
ideon series add "Topic Cluster Name" --publication tech-blog --country "US,GB" --language en --keywords "keyword one, keyword two"
ideon series edit topic-cluster --country "DE,AT,CH" --language de --keywords "keyword one, keyword two"
```

## Series creation and update

Use series commands only after explicit approval.

```bash
ideon series add "<name>" --topic "<topic>" --publication <slug> --keywords "kw1, kw2"
ideon series edit <slug> --topic "<topic>" --keywords "kw1, kw2"
```

Guidance:

- prefer conservative series updates
- do not replace existing series keywords automatically
- show keyword diffs before editing existing series defaults

## Queue additions

Queue article ideas only after plan approval.

```bash
ideon queue add "<idea>" --primary article=1 --publication <slug> --series <slug> --keywords "kw1, kw2"
```

When queueing, preserve:

- publication
- series
- article keywords
- user-specified style, intent, and length overrides

## Save protocol

Before any write, present:

- series to create
- series keyword updates
- queue entries to add
- cache artifacts to write or refresh

If the user does not explicitly approve, do not mutate state.
