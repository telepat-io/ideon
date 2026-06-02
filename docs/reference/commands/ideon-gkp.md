---
title: ideon gkp
description: Query Google Ads Keyword Planner data with cache-aware ideas, historical metrics, forecasts, and query history.
keywords: [ideon, cli, gkp, keyword planner, google ads, keywords, forecast, historical]
---

# ideon gkp

## What This Command Does

`ideon gkp` queries Google Ads Keyword Planner data directly from the CLI. It provides cache-aware ideas, historical metrics, and forecast commands, plus a `list` subcommand for cached query history.

Successful live queries are cached under the Ideon config directory in `gkp/queries` and `gkp/keywords`. Re-running the same query reuses fresh cache entries unless you pass `--refresh`.

Requires Google Ads credentials configured via `ideon gads login` or environment variables.

## Usage

```bash
ideon gkp ideas [options]
ideon gkp historical [options]
ideon gkp forecast [options]
ideon gkp list [options]
```

## Subcommands

### ideon gkp ideas

Generate keyword ideas from seed keywords, a URL, or a site.

```bash
ideon gkp ideas --keywords seo,marketing
ideon gkp ideas --keywords seo --country US,GB --language en
ideon gkp ideas --url https://example.com
ideon gkp ideas --keywords seo --url https://example.com --page-size 20
ideon gkp ideas --keywords seo --publication tech-blog --series seo-playbooks
ideon gkp ideas --keywords seo --refresh
```

| Flag | Required | Default | Description |
| --- | --- | --- | --- |
| `--keywords <keywords>` | * | — | Comma-separated seed keywords |
| `--url <url>` | * | — | Seed URL for keyword ideas |
| `--site <site>` | ** | — | Seed site domain (exclusive with keywords/url) |
| `--country <codes>` | No | *all countries* | Comma-separated ISO 3166-1 alpha-2 country codes |
| `--language <code>` | No | `en` | ISO 639-1 language code |
| `--page-size <n>` | No | — | Number of results per page |
| `--publication <slug>` | No | — | Tag the cached query with a publication slug |
| `--series <slug>` | No | — | Tag the cached query with a series slug |
| `--refresh` | No | `false` | Bypass cache and fetch fresh data |
| `--json` | No | `false` | Print machine-readable JSON output |

\* At least one of `--keywords` or `--url` is required.
\*\* `--site` cannot be combined with `--keywords` or `--url`.

#### TTY Output Example

```
Keyword Ideas
──────────────────────────────────────────────────────────────────────────
Keyword                                  Searches   Competition    Low Bid   High Bid
──────────────────────────────────────────────────────────────────────────
seo tools                                   12,000         MEDIUM      $0.50      $2.00
marketing automation                         8,000           HIGH      $1.00      $5.00
seo strategy                                 5,500          MEDIUM      $0.80      $3.50
──────────────────────────────────────────────────────────────────────────
Total: 3 keywords
```

#### JSON Output Example

```json
{
  "ideas": [
    {
      "text": "seo tools",
      "avgMonthlySearches": 12000,
      "competition": "MEDIUM",
      "competitionIndex": 50,
      "lowTopOfPageBidMicros": 500000,
      "highTopOfPageBidMicros": 2000000,
      "closeVariants": []
    }
  ],
  "count": 1
}
```

---

### ideon gkp historical

Get historical search volume and competition metrics for a list of keywords.

```bash
ideon gkp historical --keywords seo,marketing
ideon gkp historical --keywords seo --country US --language en
ideon gkp historical --keywords seo --no-include-cpc
ideon gkp historical --keywords seo --publication tech-blog --series seo-playbooks
ideon gkp historical --keywords seo --refresh
```

| Flag | Required | Default | Description |
| --- | --- | --- | --- |
| `--keywords <keywords>` | **Yes** | — | Comma-separated keywords to look up |
| `--country <codes>` | No | *all countries* | Comma-separated ISO 3166-1 alpha-2 country codes |
| `--language <code>` | No | `en` | ISO 639-1 language code |
| `--include-cpc` / `--no-include-cpc` | No | `true` | Include average CPC in results |
| `--publication <slug>` | No | — | Tag the cached query with a publication slug |
| `--series <slug>` | No | — | Tag the cached query with a series slug |
| `--refresh` | No | `false` | Bypass cache and fetch fresh data |
| `--json` | No | `false` | Print machine-readable JSON output |

#### TTY Output Example

```
Historical Metrics
──────────────────────────────────────────────────────────────────────────
Keyword                                  Searches   Competition    Low Bid   High Bid
──────────────────────────────────────────────────────────────────────────
seo tools                                   12,000         MEDIUM      $0.50      $2.00
──────────────────────────────────────────────────────────────────────────
Total: 1 keyword
```

---

### ideon gkp forecast

Get projected impressions, clicks, and cost for a set of keywords.

```bash
ideon gkp forecast --keywords seo,marketing
ideon gkp forecast --keywords seo --match-type EXACT --country US
ideon gkp forecast --keywords seo --max-cpc-bid 5000000 --start-date 2025-01-01 --end-date 2025-01-31
ideon gkp forecast --keywords seo --publication tech-blog --series seo-playbooks
ideon gkp forecast --keywords seo --refresh
```

| Flag | Required | Default | Description |
| --- | --- | --- | --- |
| `--keywords <keywords>` | **Yes** | — | Comma-separated keywords to forecast |
| `--match-type <type>` | No | `BROAD` | Keyword match type: `BROAD`, `EXACT`, or `PHRASE` |
| `--max-cpc-bid <micros>` | No | — | Max CPC bid in micros (1 USD = 1,000,000 micros) |
| `--country <codes>` | No | `US` | Comma-separated ISO country codes (defaults to US) |
| `--language <code>` | No | `en` | ISO 639-1 language code |
| `--start-date <date>` | No | today | Forecast start date (`YYYY-MM-DD`) |
| `--end-date <date>` | No | today+30 | Forecast end date (`YYYY-MM-DD`) |
| `--publication <slug>` | No | — | Tag the cached query with a publication slug |
| `--series <slug>` | No | — | Tag the cached query with a series slug |
| `--refresh` | No | `false` | Bypass cache and fetch fresh data |
| `--json` | No | `false` | Print machine-readable JSON output |

---

### ideon gkp list

List cached GKP query history.

```bash
ideon gkp list
ideon gkp list --publication tech-blog
ideon gkp list --series seo-playbooks --search "content strategy"
ideon gkp list --stale --verbose
```

| Flag | Required | Default | Description |
| --- | --- | --- | --- |
| `--publication <slug>` | No | — | Filter by publication slug |
| `--series <slug>` | No | — | Filter by series slug |
| `--search <query>` | No | — | Match cached keywords, URL, site, publication, or series text |
| `--fresh` | No | `false` | Show only fresh cache entries |
| `--stale` | No | `false` | Show only stale cache entries |
| `--verbose` | No | `false` | Print detailed cache entry metadata |
| `--json` | No | `false` | Print machine-readable JSON output |

#### TTY Output Example

```
  Mode      Query                 Publication  Series          Count  Fresh  Saved
  -------------------------------------------------------------------------------
  ideas     content strategy      tech-blog    seo-playbooks      12  yes    2026-06-03
  historical seo tools            tech-blog    seo-playbooks       8  no     2026-04-01
```

#### TTY Output Example

```
Forecast
────────────────────────────────────────────────────────────────────────────────────
Keyword                          Match    Impr.   Clicks       Cost      CTR
────────────────────────────────────────────────────────────────────────────────────
seo tools                       BROAD    50,000     1,500      $7.50     3.0%
────────────────────────────────────────────────────────────────────────────────────
Total: 1 keyword
```

#### JSON Output Example

```json
{
  "keywords": [
    {
      "text": "seo tools",
      "matchType": "BROAD",
      "impressions": 50000,
      "clicks": 1500,
      "costMicros": 7500000,
      "ctr": 0.03
    }
  ],
  "count": 1
}
```

---

## Output and Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | Command completed successfully. |
| `1` | Validation failed, credentials are invalid, or a runtime error occurred. |
| `130` | Command interrupted by `Ctrl+C`. |

## Environment Variables

All Google Ads credentials can alternatively be set via environment variables:

| Variable | Description |
| --- | --- |
| `TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN` | Developer token |
| `TELEPAT_GOOGLE_ADS_CLIENT_ID` | OAuth2 client ID |
| `TELEPAT_GOOGLE_ADS_CLIENT_SECRET` | OAuth2 client secret |
| `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` | OAuth2 refresh token |
| `TELEPAT_GOOGLE_ADS_CUSTOMER_ID` | Customer ID |
| `TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Manager account ID (optional) |

Environment variables take precedence over keychain-stored values.

## Related Commands

- [ideon gads](./ideon-gads.md) — Manage Google Ads credentials and OAuth
- [ideon config](./ideon-config.md) — Set individual credentials non-interactively
- [Google Ads Keyword Planner Setup](../../guides/google-ads-keyword-planner.md) — Full setup guide

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- The `gkp` commands require Google Ads credentials to be configured first for live requests. Cached responses can be listed without authenticating.
- Query cache is stored in the Ideon config directory under `gkp/queries` and `gkp/keywords`.
- TTY output formats bids in dollars; JSON output preserves raw micros.
