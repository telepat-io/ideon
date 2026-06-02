# Google Ads and GKP

## Readiness checks

The planner depends on real Google Keyword Planner data.

Use:

```bash
ideon gads status
ideon gads test
```

If credentials are missing or broken, pause planning and help the user restore access.

## Setup help path

Preferred recovery sequence:

```bash
ideon gads login
ideon gads status
ideon gads test
```

Reference setup guide:

- [Google Ads Keyword Planner Setup](../../../docs/guides/google-ads-keyword-planner.md)

## GKP command surface

Primary commands:

```bash
ideon gkp ideas --keywords "kw1,kw2"
ideon gkp ideas --url https://example.com
ideon gkp historical --keywords "kw1,kw2"
ideon gkp forecast --keywords "kw1,kw2"
ideon gkp list
```

Context and freshness controls:

- `--publication <slug>`
- `--series <slug>`
- `--refresh`

`ideon gkp list` is the primary history surface for planner loops. Use `--json` and `--verbose` as needed.

## Research policy

Use GKP in this order:

1. ideas for expansion
2. historical for scoring inputs
3. forecast when campaign-style projection helps prioritization

Use URL mode when the user provides competitor URLs or explicitly requests that path.

## Reliability policy

When Google Ads requests fail:

1. retry boundedly for transient runtime/network errors
2. distinguish auth/config errors from runtime errors
3. if auth/config is broken, stop and guide setup recovery
4. if data remains sparse, broaden into adjacent topics before surfacing low confidence

Do not continue as if real-data validation happened when it did not.
