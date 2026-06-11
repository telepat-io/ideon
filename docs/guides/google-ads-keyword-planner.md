---
title: Google Ads Keyword Planner Setup
description: Step-by-step guide to configure Google Ads API credentials for Ideon's Keyword Planner tools.
keywords: [ideon, google ads, keyword planner, mcp, setup, credentials]
---

# Google Ads Keyword Planner Setup

Ideon includes three Google Keyword Planner (GKP) MCP tools that provide real keyword data from Google Ads:

- `gkp_generate_ideas` — find related keywords from seed keywords or a URL
- `gkp_get_historical_data` — get historical search volume and competition for keywords
- `gkp_get_forecast_data` — project impressions, clicks, and cost for keywords

This guide walks you through everything you need to set up, from creating a Google Ads account to configuring credentials in Ideon.

---

## Quick Setup

The fastest way to get started is the `ideon gads` command:

```bash
ideon gads login          # Interactive guided setup with OAuth flow
ideon gads status         # Check which credentials are configured
ideon gads test           # Verify credentials work with a test API call
```

The `gads login` command prompts for each credential, saves them as you go, and opens a browser for Google OAuth consent. No need to manually run curl commands or edit config files.

**Other `gads` commands:**

| Command | Purpose |
|---|---|
| `ideon gads login --force` | Re-authorize even if a refresh token already exists |
| `ideon gads logout` | Clear the refresh token (keeps other credentials) |
| `ideon gads logout --all` | Clear all 6 Google Ads credentials |

For CI/CD or non-interactive environments, use the credential and environment-variable flow in Step 8 below.

---

## Using the CLI (`ideon gkp`)

Once credentials are configured, query keyword data directly from the CLI:

```bash
# Generate keyword ideas
ideon gkp ideas --keywords seo,marketing
ideon gkp ideas --url https://example.com --country US,GB

# Get historical metrics
ideon gkp historical --keywords seo,marketing --country US

# Get forecast data
ideon gkp forecast --keywords seo --match-type EXACT --country US

# List cached query history
ideon gkp list --publication tech-blog --verbose
```

`ideon gkp ideas`, `historical`, and `forecast` are cache-aware by default. Use `--refresh` to force a live read, and use `--publication` / `--series` to tag and filter keyword research by editorial context.

All three subcommands support `--json` for machine-readable output:

```bash
ideon gkp ideas --keywords seo --json
```

For full details, see the [ideon gkp command reference](../reference/commands/ideon-gkp.md).

---

## Prerequisites Checklist

You need **six credentials** total. Here is what each one is and where to get it:

| # | Credential | Where to get it | Required |
|---|---|---|---|
| 1 | Developer token | Google Ads API Center | Yes |
| 2 | OAuth2 client ID | Google Cloud Console | Yes |
| 3 | OAuth2 client secret | Google Cloud Console | Yes |
| 4 | OAuth2 refresh token | One-time authorization flow | Yes |
| 5 | Customer ID | Google Ads account number | Yes |
| 6 | Login customer ID | Manager (MCC) account number | Only if using a sub-account |

---

## Step 1: Create a Google Ads Manager Account (MCC)

Developer tokens are **only issued to manager accounts**, not regular Google Ads accounts.

1. Go to [Google Ads Manager Accounts](https://ads.google.com/home/tools/manager-accounts/)
2. Click **Create a manager account**
3. Fill in the required information and complete setup
4. Note the account number in the top-right corner — this is your **manager account ID** (format: `XXX-XXX-XXXX`)

> **Already have a Google Ads account?** You can still create a manager account and link your existing account to it.

---

## Step 2: Get a Developer Token

1. Sign in to your manager account at [ads.google.com](https://ads.google.com)
2. Go to **Tools & Settings → Setup → API Center** (or navigate directly to `https://ads.google.com/aw/apicenter`)
3. Find your **Developer token** and copy it
4. Store it — you will need it as `googleAdsDeveloperToken`

> **⚠️ New tokens start in test mode.** A brand-new developer token can only call the API against [Google Ads test accounts](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts). Calls to any real account will return `DEVELOPER_TOKEN_NOT_APPROVED`.
>
> **To apply for Basic access:** In the API Center, click **Apply for Basic Access** and fill in the form. Google reviews requests within a few days. Basic access is sufficient for the Keyword Planner API — you do not need Standard access.

---

## Step 3: Set Up Google Cloud Project

You need a Google Cloud (GCP) project with the Google Ads API enabled.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Ads API:
   - Go to [API Library](https://console.cloud.google.com/apis/library/googleads.googleapis.com)
   - Search for **Google Ads API**
   - Click **Enable**

---

## Step 4: Configure OAuth Consent Screen

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **External** user type
3. Fill in:
   - **App name**: anything (e.g. "Ideon Keyword Planner")
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue** through the scopes and test users screens
5. Leave the app in **Testing** mode
6. Add your own Google account as a **Test user**:
   - Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) → **Test users**
   - Click **Add users** and enter your Google email

---

## Step 5: Create OAuth2 Credentials

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **+ Create Credentials → OAuth client ID**
3. Select **Application type: Web application** (recommended for reverse-proxy / container deployments) or **Desktop app** (bare-metal local dev)
4. Give it a name (e.g. "Ideon GKP")

**Web application** (production and Telepat Monad):

| Field | Local dev example | Production example |
|-------|-------------------|-------------------|
| Authorized JavaScript origins | `http://ideon.localhost:8080` | `https://ideon.telepat.dev` |
| Authorized redirect URIs | `http://ideon.localhost:8080/callback` | `https://ideon.telepat.dev/callback` |

Set `TELEPAT_IDEON_GADS_REDIRECT_URL` to the same redirect URI (including `/callback`).

**Desktop app** (local CLI only): no origins/redirect URIs in GCP; Ideon uses `http://localhost:9876/callback` when `TELEPAT_IDEON_GADS_REDIRECT_URL` is unset.

5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

---

## Step 6: Obtain a Refresh Token

This is a **one-time** authorization flow. The refresh token lets Ideon obtain new access tokens automatically.

### Option A: MCP `gads_login` (containers, agents, Telepat Monad)

Use when `TELEPAT_DISABLE_KEYTAR=1` or when driving Ideon from an MCP client:

1. Pre-fill static credentials in env (`TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `CUSTOMER_ID`).
2. Call MCP **`gads_login`** — response includes `authUrl` in `structuredContent`.
3. Open `authUrl` in a browser and authorize.
4. Poll **`gads_login_status`** until `status: completed`.
5. Read `refreshToken` from `structuredContent` and persist as `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` (when `saved: false`, keychain is disabled).
6. Call **`gads_test`** to verify.

In Telepat Monad, the agent writes the refresh token to `/telepat/.env` after user confirmation. See the Monad [Google Ads Setup](https://github.com/telepat-ai/monad/blob/main/docs/guides/google-ads-setup.md) guide.

### Option B: CLI `ideon gads login` (interactive desktop)

```bash
ideon gads login
```

Opens a browser for OAuth consent and saves credentials to keychain or env.

### Option C: Manual Desktop OAuth (bare-metal fallback)

When `TELEPAT_IDEON_GADS_REDIRECT_URL` is unset, redirect URI is `http://localhost:9876/callback`:

```bash
CLIENT_ID="YOUR_CLIENT_ID"
CLIENT_SECRET="YOUR_CLIENT_SECRET"
REDIRECT_URI="http://localhost:9876/callback"

open "https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords&access_type=offline&prompt=consent"

# Catch redirect on port 9876, exchange code for refresh_token (see ideon gads login implementation)
```

> **⚠️ Save your refresh token immediately.** You cannot retrieve it again. If lost, re-run authorization with `gads_login` or `ideon gads login --force`.

---

## Step 7: Find Your Customer ID

1. Sign in to [Google Ads](https://ads.google.com)
2. The **account number** is displayed in the top-right corner (format: `XXX-XXX-XXXX`)
3. This is your **customer ID** — use the account that has billing configured

> **Billing requirement:** The Google Ads Keyword Planner API requires an account with an active payment method. You do not need to run ads or spend money — you just need a payment method on file.

---

## Step 8: Configure Credentials in Ideon

Once you have all six credentials, configure them in Ideon:

```bash
# Required credentials
ideon config set googleAdsDeveloperToken "your-developer-token"
ideon config set googleAdsClientId "your-client-id.apps.googleusercontent.com"
ideon config set googleAdsClientSecret "your-client-secret"
ideon config set googleAdsRefreshToken "your-refresh-token"
ideon config set googleAdsCustomerId "123-456-7890"

# Only if accessing through a manager account (MCC)
ideon config set googleAdsLoginCustomerId "123-456-7890"
```

Or set them as environment variables:

```bash
export TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
export TELEPAT_GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export TELEPAT_GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
export TELEPAT_GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"
export TELEPAT_GOOGLE_ADS_CUSTOMER_ID="123-456-7890"
export TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID="123-456-7890"  # only if needed
```

---

## Step 9: Verify Setup

Test that your credentials work by running a simple keyword ideas query through the MCP server:

```bash
# Start the MCP server
ideon mcp serve
```

Or verify credentials are configured:

```bash
ideon config list --json
```

You should see `googleAdsDeveloperToken: true`, `googleAdsClientId: true`, etc. in the secrets section.

---

## Understanding Manager Accounts and Sub-Accounts

The `googleAdsLoginCustomerId` credential is your **manager/MCC account ID**. It is required **only when your `googleAdsCustomerId` account is a sub-account managed through a manager account**.

| Scenario | `googleAdsCustomerId` | `googleAdsLoginCustomerId` |
|---|---|---|
| Direct access to account | The account's own ID | Not needed |
| Accessing through manager | The sub-account's ID | The manager account ID |

**When in doubt:** set `googleAdsLoginCustomerId` to your manager account ID. It does not hurt to include it even when not strictly required.

Both IDs can be found in the Google Ads UI — the account number shown in the top-right corner when viewing that account. Dashes are optional — `123-456-7890` and `1234567890` both work.

---

## Common Errors and Fixes

| Error | Meaning | Fix |
|---|---|---|
| `DEVELOPER_TOKEN_NOT_APPROVED` | Developer token is in test mode | Apply for Basic access at [API Center](https://ads.google.com/aw/apicenter) and wait for approval |
| `USER_PERMISSION_DENIED` (mentions `login-customer-id`) | Account is a sub-account but login customer ID is missing | Set `googleAdsLoginCustomerId` to your manager account ID |
| `USER_PERMISSION_DENIED` (no mention of `login-customer-id`) | OAuth user does not have access to the account | Re-run the OAuth flow as the Google account that owns the Ads account |
| `DEVELOPER_TOKEN_INVALID` | Wrong or malformed developer token | Re-copy from [API Center](https://ads.google.com/aw/apicenter) and set via `ideon config set googleAdsDeveloperToken` |
| `invalid_grant` | Refresh token expired | Re-run the OAuth authorization flow to get a new refresh token |
| `CUSTOMER_NOT_FOUND` | Account ID is wrong or not provisioned | Verify the customer ID from the top-right of the Google Ads UI |
| `NOT_ADS_USER` | Google account not linked to any Ads account | Create or link a Google Ads account at [ads.google.com](https://ads.google.com) |

---

## Tool Reference

### `gkp_generate_ideas`

Generates related keyword ideas from seed keywords, a URL, or a site.

**Parameters:**
- `seedKeywords` (optional) — array of seed keywords
- `url` (optional) — a URL to generate ideas from
- `site` (optional) — a site to generate ideas from (cannot be combined with seedKeywords or url)
- `countryCodes` (optional) — ISO 3166-1 alpha-2 country codes (e.g. `["US", "GB"]`). Defaults to all countries.
- `language` (optional) — ISO 639-1 language code (e.g. `"en"`). Defaults to English.
- `pageSize` (optional) — maximum number of results to return

**Returns:** List of keyword ideas with `text`, `avgMonthlySearches`, `competition`, `competitionIndex`, `lowTopOfPageBidMicros`, `highTopOfPageBidMicros`, and `closeVariants`.

### `gkp_get_historical_data`

Gets historical search volume and competition data for a specific list of keywords.

**Parameters:**
- `keywords` (required) — array of keywords to look up
- `countryCodes` (optional) — ISO 3166-1 alpha-2 country codes. Defaults to all countries.
- `language` (optional) — ISO 639-1 language code. Defaults to English.
- `includeAverageCpc` (optional) — whether to include CPC data. Defaults to `true`.

**Returns:** Per-keyword metrics including `avgMonthlySearches`, `competition`, `competitionIndex`, bid estimates, and `monthlySearchVolumes` (12-month breakdown).

### `gkp_get_forecast_data`

Projects impressions, clicks, and cost for keywords.

**Parameters:**
- `keywords` (required) — array of keywords to forecast
- `keywordMatchType` (optional) — `BROAD`, `EXACT`, or `PHRASE`. Defaults to `BROAD`.
- `maxCpcBidMicros` (optional) — maximum CPC bid in micros (1,000,000 = $1.00). If omitted, no bidding strategy is applied.
- `countryCodes` (optional) — ISO 3166-1 alpha-2 country codes. Defaults to `["US"]`.
- `language` (optional) — ISO 639-1 language code. Defaults to English.
- `startDate` (optional) — forecast start date in `yyyy-MM-dd` format. Defaults to today.
- `endDate` (optional) — forecast end date in `yyyy-MM-dd` format. Defaults to 30 days from today.

**Returns:** Per-keyword projected `impressions`, `clicks`, `costMicros`, and `ctr`.

---

## Related Resources

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/)
- [Google Ads API Test Accounts](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts)
- [Google Ads API Center](https://ads.google.com/aw/apicenter)
- [Google Cloud Console](https://console.cloud.google.com/)
