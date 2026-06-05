# Google Ads Keyword Planner Setup via MCP

This reference covers the prerequisites and credential setup required for the three GKP MCP tools (`gkp_generate_ideas`, `gkp_get_historical_data`, `gkp_get_forecast_data`) and for the planning tools (`ideon_plan_explore`, `ideon_plan_expand`).

## Quick Setup with `gads_login`

The fastest way to configure Google Ads credentials is the `gads_login` MCP tool. It saves credentials, starts a temporary OAuth server, and returns an authorization URL. You open the URL in your browser, authorize, and the tool saves the refresh token automatically.

### Step 1: Gather prerequisites

You need these values before calling `gads_login`:

| # | Credential | Where to get it |
|---|---|---|
| 1 | Developer token | Google Ads API Center |
| 2 | OAuth2 client ID | GCP Console |
| 3 | OAuth2 client secret | GCP Console |
| 4 | Customer ID | Google Ads account number |

### Step 2: Call `gads_login`

```json
{"tool": "gads_login", "parameters": {
  "developerToken": "your-developer-token",
  "clientId": "your-client-id.apps.googleusercontent.com",
  "clientSecret": "your-client-secret",
  "customerId": "123-456-7890"
}}
```

For manager account access, add `loginCustomerId`:

```json
{"tool": "gads_login", "parameters": {
  "developerToken": "your-developer-token",
  "clientId": "your-client-id.apps.googleusercontent.com",
  "clientSecret": "your-client-secret",
  "customerId": "123-456-7890",
  "loginCustomerId": "987-654-3210"
}}
```

### Step 3: Open the auth URL

The tool returns an auth URL. Open it in your browser and complete the Google authorization. After you authorize, Google redirects back to the temporary local server.

### Step 4: Confirm completion

```json
{"tool": "gads_login_status", "parameters": {}}
```

This returns `completed` when the refresh token has been saved.

### Step 5: Verify

```json
{"tool": "gads_test", "parameters": {}}
```

This makes a test API call to confirm all credentials work.

### Re-authorization

If a refresh token already exists, `gads_login` returns an error. Pass `force: true` to re-authorize:

```json
{"tool": "gads_login", "parameters": {
  "developerToken": "your-developer-token",
  "clientId": "your-client-id.apps.googleusercontent.com",
  "clientSecret": "your-client-secret",
  "customerId": "123-456-7890",
  "force": true
}}
```

## Manual Setup (Alternative)

For environments where `gads_login` cannot be used (e.g., headless servers without browser access), set credentials individually.

### Prerequisites Checklist

| # | Credential | Config key | Env var | Where to get it |
|---|---|---|---|---|
| 1 | Developer token | `googleAdsDeveloperToken` | `TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API Center |
| 2 | OAuth2 client ID | `googleAdsClientId` | `TELEPAT_GOOGLE_ADS_CLIENT_ID` | GCP Console |
| 3 | OAuth2 client secret | `googleAdsClientSecret` | `TELEPAT_GOOGLE_ADS_CLIENT_SECRET` | GCP Console |
| 4 | OAuth2 refresh token | `googleAdsRefreshToken` | `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` | One-time OAuth2 flow |
| 5 | Customer ID | `googleAdsCustomerId` | `TELEPAT_GOOGLE_ADS_CUSTOMER_ID` | Google Ads account number |
| 6 | Login customer ID | `googleAdsLoginCustomerId` | `TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Manager (MCC) account ID (optional) |

### Setting credentials via `ideon_config_set`

```json
{"tool": "ideon_config_set", "parameters": {"key": "googleAdsDeveloperToken", "value": "your-developer-token"}}
```

```json
{"tool": "ideon_config_set", "parameters": {"key": "googleAdsClientId", "value": "your-client-id.apps.googleusercontent.com"}}
```

```json
{"tool": "ideon_config_set", "parameters": {"key": "googleAdsClientSecret", "value": "your-client-secret"}}
```

```json
{"tool": "ideon_config_set", "parameters": {"key": "googleAdsRefreshToken", "value": "your-refresh-token"}}
```

```json
{"tool": "ideon_config_set", "parameters": {"key": "googleAdsCustomerId", "value": "123-456-7890"}}
```

```json
{"tool": "ideon_config_set", "parameters": {"key": "googleAdsLoginCustomerId", "value": "123-456-7890"}}
```

### Environment variables

Alternatively, set environment variables before starting the MCP server:

```bash
export TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
export TELEPAT_GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export TELEPAT_GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
export TELEPAT_GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"
export TELEPAT_GOOGLE_ADS_CUSTOMER_ID="123-456-7890"
export TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID="123-456-7890"  # only if needed
```

### Manual OAuth flow

If you need to obtain a refresh token manually:

1. Open this URL in your browser (replace `YOUR_CLIENT_ID`):

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:9876&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords&access_type=offline&prompt=consent
```

2. After authorizing, the browser redirects to `http://localhost:9876?code=...`. Extract the `code` and exchange it:

```bash
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&code=CODE_FROM_URL&grant_type=authorization_code&redirect_uri=http://localhost:9876"
```

3. The response contains the `refresh_token`. **Save it — it cannot be retrieved again.**

### Verify manual setup

```json
{"tool": "gads_test", "parameters": {}}
```

Or check config flags:

```json
{"tool": "ideon_config_list", "parameters": {}}
```

Check that all `googleAds*` secrets show `true` in the secrets section.

## Prerequisites: Google Cloud Setup

If you don't have Google Ads credentials yet, follow these steps.

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

### 6. Find Your Customer ID

Sign in to [Google Ads](https://ads.google.com). The account number in the top-right corner is your **customer ID**. The account must have billing configured (payment method on file, no ad spend required).

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
| `USER_PERMISSION_DENIED` (no mention) | OAuth user lacks access | Re-authorize via `gads_login` with `force: true` |
| `DEVELOPER_TOKEN_INVALID` | Wrong developer token | Re-copy from API Center and set via `ideon_config_set` |
| `invalid_grant` | Refresh token expired | Re-authorize via `gads_login` with `force: true` |
| `CUSTOMER_NOT_FOUND` | Account ID wrong or not provisioned | Verify from top-right of Google Ads UI |
| `NOT_ADS_USER` | Google account not linked to any Ads account | Create or link a Google Ads account at ads.google.com |
| `googleAds*` secret shows `false` in `ideon_config_list` | Credential not set | Set via `gads_login` or `ideon_config_set` |
| `Already authenticated with Google Ads` | Refresh token exists, `force` not set | Pass `force: true` to `gads_login` |
| OAuth flow timed out | User did not authorize within 120s | Start a new flow with `gads_login` and authorize promptly |
| All ports in use | Ports 9876–9879 occupied | Close processes on those ports and retry |

## GKP Tool Quick Reference

### `gkp_generate_ideas`

Generates related keyword ideas from seed keywords, a URL, or a site.

```json
{"tool": "gkp_generate_ideas", "parameters": {
  "seedKeywords": ["seo", "marketing"],
  "countryCodes": ["US"],
  "language": "en",
  "pageSize": 20
}}
```

### `gkp_get_historical_data`

Gets historical search volume and competition for keywords.

```json
{"tool": "gkp_get_historical_data", "parameters": {
  "keywords": ["seo", "marketing"],
  "countryCodes": ["US"],
  "language": "en"
}}
```

### `gkp_get_forecast_data`

Projects impressions, clicks, and cost for keywords.

```json
{"tool": "gkp_get_forecast_data", "parameters": {
  "keywords": ["seo"],
  "keywordMatchType": "EXACT",
  "countryCodes": ["US"],
  "startDate": "2026-07-01",
  "endDate": "2026-07-31"
}}
```
