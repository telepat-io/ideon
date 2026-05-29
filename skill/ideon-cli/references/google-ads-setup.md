# Google Ads Keyword Planner Setup

This reference covers the prerequisites and credential setup required for the three `gkp_*` MCP tools (`gkp_generate_ideas`, `gkp_get_historical_data`, `gkp_get_forecast_data`).

## Quick Setup with `gads login`

The fastest way to configure Google Ads credentials:

```bash
ideon gads login                    # Interactive OAuth flow
ideon gads status                   # Check which credentials are set
ideon gads test                     # Verify credentials work
```

The `gads login` command walks you through each credential interactively, saves them progressively, and runs the OAuth browser flow to obtain a refresh token.

**Commands:**

| Command | Purpose |
|---|---|
| `ideon gads login` | Interactive guided setup with OAuth flow |
| `ideon gads login --force` | Re-authorize even if refresh token exists |
| `ideon gads status` | Show which credentials are configured (env/keychain/not set) |
| `ideon gads test` | Verify credentials with a test API call |
| `ideon gads logout` | Clear refresh token (keeps other credentials) |
| `ideon gads logout --all` | Clear all 6 Google Ads credentials |

For CI/CD or non-interactive environments, use environment variables or `ideon config set` (see manual setup below).

## Querying Keyword Data with `gkp`

Once credentials are configured, use the `gkp` commands to query Google Ads Keyword Planner data:

```bash
# Generate keyword ideas
ideon gkp ideas --keywords seo,marketing
ideon gkp ideas --url https://example.com --country US,GB
ideon gkp ideas --keywords seo --site example.com

# Get historical search volume and competition
ideon gkp historical --keywords seo,marketing --country US
ideon gkp historical --keywords seo --language de --no-include-cpc

# Get forecast projections
ideon gkp forecast --keywords seo --match-type EXACT --country US
ideon gkp forecast --keywords seo --max-cpc-bid 5000000 --start-date 2025-01-01 --end-date 2025-01-31
```

All three subcommands support `--json` for machine-readable output. For full details, see the [ideon gkp command reference](../../../../docs/reference/commands/ideon-gkp.md).

## Prerequisites Checklist

| # | Credential | Config key | Env var | Where to get it |
|---|---|---|---|---|
| 1 | Developer token | `googleAdsDeveloperToken` | `TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API Center |
| 2 | OAuth2 client ID | `googleAdsClientId` | `TELEPAT_GOOGLE_ADS_CLIENT_ID` | GCP Console |
| 3 | OAuth2 client secret | `googleAdsClientSecret` | `TELEPAT_GOOGLE_ADS_CLIENT_SECRET` | GCP Console |
| 4 | OAuth2 refresh token | `googleAdsRefreshToken` | `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` | One-time OAuth2 flow |
| 5 | Customer ID | `googleAdsCustomerId` | `TELEPAT_GOOGLE_ADS_CUSTOMER_ID` | Google Ads account number |
| 6 | Login customer ID | `googleAdsLoginCustomerId` | `TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Manager (MCC) account ID (optional) |

## Step-by-Step Setup

### 1. Create a Google Ads Manager Account (MCC)

Developer tokens are **only issued to manager accounts**. Create one at [ads.google.com/home/tools/manager-accounts](https://ads.google.com/home/tools/manager-accounts/). Note the account number in the top-right corner.

### 2. Get a Developer Token

1. Sign in to your manager account at [ads.google.com](https://ads.google.com)
2. Go to **Tools & Settings → Setup → API Center** (`https://ads.google.com/aw/apicenter`)
3. Copy your **Developer token**

> New tokens start in test mode. To use with real accounts, click **Apply for Basic Access** in the API Center and wait for Google approval (a few days).

### 3. Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Google Ads API: [API Library](https://console.cloud.google.com/apis/library/googleads.googleapis.com) → search **Google Ads API** → **Enable**

### 4. Configure OAuth Consent Screen

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **External**, fill in app name and email
3. Add your Google account as a **Test user**
4. Leave the app in **Testing** mode

### 5. Create OAuth2 Credentials

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. **+ Create Credentials → OAuth client ID → Desktop app**
3. Copy the **Client ID** and **Client Secret**

### 6. Obtain a Refresh Token

Open this URL in your browser (replace `YOUR_CLIENT_ID`):

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:9876&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords&access_type=offline&prompt=consent
```

After authorizing, the browser redirects to `http://localhost:9876?code=...`. Extract the `code` and exchange it:

```bash
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&code=CODE_FROM_URL&grant_type=authorization_code&redirect_uri=http://localhost:9876"
```

The response contains the `refresh_token`. **Save it — it cannot be retrieved again.**

### 7. Find Your Customer ID

Sign in to [Google Ads](https://ads.google.com). The account number in the top-right corner is your **customer ID**. The account must have billing configured (payment method on file, no ad spend required).

### 8. Configure Credentials in Ideon

```bash
ideon config set googleAdsDeveloperToken "your-developer-token"
ideon config set googleAdsClientId "your-client-id.apps.googleusercontent.com"
ideon config set googleAdsClientSecret "your-client-secret"
ideon config set googleAdsRefreshToken "your-refresh-token"
ideon config set googleAdsCustomerId "123-456-7890"
ideon config set googleAdsLoginCustomerId "123-456-7890"  # only if needed
```

Or as environment variables:

```bash
export TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
export TELEPAT_GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export TELEPAT_GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
export TELEPAT_GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"
export TELEPAT_GOOGLE_ADS_CUSTOMER_ID="123-456-7890"
export TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID="123-456-7890"  # only if needed
```

### 9. Verify Setup

```bash
ideon config list --json
```

Check that all `googleAds*` secrets show `true` in the secrets section.

## Understanding Manager Accounts

| Scenario | `googleAdsCustomerId` | `googleAdsLoginCustomerId` |
|---|---|---|
| Direct access to account | The account's own ID | Not needed |
| Accessing through manager | The sub-account's ID | The manager account ID |

**When in doubt:** set `googleAdsLoginCustomerId` to your manager account ID. Both IDs can be found in the top-right of the Google Ads UI. Dashes are optional.

## Common Errors

| Error | Meaning | Fix |
|---|---|---|
| `DEVELOPER_TOKEN_NOT_APPROVED` | Token in test mode | Apply for Basic access at [API Center](https://ads.google.com/aw/apicenter) |
| `USER_PERMISSION_DENIED` (mentions `login-customer-id`) | Missing login customer ID | Set `googleAdsLoginCustomerId` to manager account ID |
| `USER_PERMISSION_DENIED` (no mention) | OAuth user lacks access | Re-run OAuth flow as the Google account that owns the Ads account |
| `DEVELOPER_TOKEN_INVALID` | Wrong developer token | Re-copy from API Center and set via `ideon config set googleAdsDeveloperToken` |
| `invalid_grant` | Refresh token expired | Re-run OAuth authorization flow for a new refresh token |
| `CUSTOMER_NOT_FOUND` | Account ID wrong or not provisioned | Verify from top-right of Google Ads UI |
| `NOT_ADS_USER` | Google account not linked to any Ads account | Create or link a Google Ads account at ads.google.com |

## Tool Reference

### `gkp_generate_ideas`

Generates related keyword ideas from seed keywords, a URL, or a site.

**Parameters:**
- `seedKeywords` (optional) — array of seed keywords
- `url` (optional) — a URL to generate ideas from
- `site` (optional) — a site to generate ideas from (cannot combine with seedKeywords or url)
- `countryCodes` (optional) — ISO 3166-1 alpha-2 codes (e.g. `["US", "GB"]`). Defaults to all countries.
- `language` (optional) — ISO 639-1 code (e.g. `"en"`). Defaults to English.
- `pageSize` (optional) — max results to return

### `gkp_get_historical_data`

Gets historical search volume and competition for keywords.

**Parameters:**
- `keywords` (required) — array of keywords
- `countryCodes` (optional) — ISO 3166-1 alpha-2 codes. Defaults to all countries.
- `language` (optional) — ISO 639-1 code. Defaults to English.
- `includeAverageCpc` (optional) — include CPC data. Defaults to `true`.

### `gkp_get_forecast_data`

Projects impressions, clicks, and cost for keywords.

**Parameters:**
- `keywords` (required) — array of keywords
- `keywordMatchType` (optional) — `BROAD`, `EXACT`, or `PHRASE`. Defaults to `BROAD`.
- `maxCpcBidMicros` (optional) — max CPC bid in micros (1,000,000 = $1.00). If omitted, no bidding strategy is applied.
- `countryCodes` (optional) — ISO 3166-1 alpha-2 codes. Defaults to `["US"]`.
- `language` (optional) — ISO 639-1 code. Defaults to English.
- `startDate` (optional) — forecast start date (`yyyy-MM-dd`). Defaults to today.
- `endDate` (optional) — forecast end date (`yyyy-MM-dd`). Defaults to 30 days from today.
