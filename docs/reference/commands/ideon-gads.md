---
title: ideon gads
description: Manage Google Ads integration credentials, OAuth authorization, and connection verification.
keywords: [ideon, cli, gads, google ads, oauth, credentials, keyword planner]
---

# ideon gads

## What This Command Does

`ideon gads` manages Google Ads integration credentials, OAuth authorization flows, and connection verification for the Keyword Planner API tools.

## Usage

```bash
ideon gads login [options]
ideon gads logout [options]
ideon gads status [options]
ideon gads test
```

## Subcommands

### ideon gads login

Start an interactive OAuth flow to obtain Google Ads tokens and save all required credentials.

```bash
ideon gads login
ideon gads login --force
ideon gads login --developer-token <token> --client-id <id> --client-secret <secret> --customer-id <id>
```

Collects the following credentials (interactively or via flags):

| Flag | Required | Description |
| --- | --- | --- |
| `--developer-token <token>` | Yes | Google Ads API developer token |
| `--client-id <id>` | Yes | OAuth2 client ID from GCP |
| `--client-secret <secret>` | Yes | OAuth2 client secret from GCP |
| `--customer-id <id>` | Yes | Google Ads customer ID (10 digits, dashes optional) |
| `--login-customer-id <id>` | No | Manager account customer ID (MCC only, flag only, not prompted) |
| `--force` | No | Re-authorize even if a refresh token already exists |

Credentials are saved progressively as entered. If the OAuth flow fails partway through, previously entered credentials are preserved.

The OAuth flow opens a browser window for Google consent. If the browser cannot open, the authorization URL is printed for manual use.

### ideon gads logout

Clear stored Google Ads credentials.

```bash
ideon gads logout
ideon gads logout --all
```

| Flag | Description |
| --- | --- |
| `--all` | Clear all 6 Google Ads credentials instead of just the refresh token |

Without `--all`, only the refresh token is cleared, allowing re-authorization via `gads login` without re-entering other credentials.

### ideon gads status

Show which Google Ads credentials are configured and their source.

```bash
ideon gads status
ideon gads status --json
```

| Flag | Description |
| --- | --- |
| `--json` | Print machine-readable JSON output |

TTY output:

```
Google Ads Credential Status
─────────────────────────────────────
  developer Token        ✓ keychain
  client Id              ✓ env
  client Secret          ✓ keychain
  refresh Token          ✓ keychain
  customer Id            ✓ keychain
  login Customer Id      — not set (optional)

Run `ideon gads test` to verify credentials work.
Run `ideon gads login` to set up missing credentials.
```

JSON output:

```json
{
  "googleAdsDeveloperToken": { "set": true, "source": "keychain" },
  "googleAdsClientId": { "set": true, "source": "env" },
  "googleAdsClientSecret": { "set": true, "source": "keychain" },
  "googleAdsRefreshToken": { "set": true, "source": "keychain" },
  "googleAdsCustomerId": { "set": true, "source": "keychain" },
  "googleAdsLoginCustomerId": { "set": false, "source": null }
}
```

Source can be `env` (environment variable), `keychain` (system keychain), or `null` (not set). Environment variables take precedence over keychain values.

### ideon gads test

Verify Google Ads credentials by making a test API call.

```bash
ideon gads test
```

Makes a lightweight `generateKeywordIdeas` call with a single keyword to verify the full credential chain works (token refresh, API headers, customer ID).

Success output:

```
✓ Google Ads credentials verified.
  Customer ID: 1234567890
  API response received successfully (1 keyword returned).
```

Failure output includes the specific error and actionable fix suggestions.

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
| `TELEPAT_IDEON_GADS_REDIRECT_URL` | Full public OAuth callback URL (Web OAuth). Unset → `http://localhost:9876/callback` |

Environment variables take precedence over keychain-stored values. In CI/CD or headless environments where keytar is unavailable, use environment variables — they bypass keychain entirely.

## Container / MCP mode

When `TELEPAT_DISABLE_KEYTAR=1` (Telepat Monad, Docker, CI):

- Pre-fill `TELEPAT_GOOGLE_ADS_*` env vars; do not rely on `gads login` keychain saves.
- Use MCP **`gads_login`** and **`gads_login_status`** instead of interactive CLI login.
- On OAuth completion, MCP returns `refreshToken` with `saved: false` — persist as `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` externally.
- Verify with MCP **`gads_test`**.

Set `TELEPAT_IDEON_GADS_REDIRECT_URL` for Web OAuth behind a reverse proxy. See [MCP Servers](../../for-agents/mcp-servers.md).

## Storage Behavior

`gads login` and `ideon config set` store credentials in the **system keychain** via the `keytar` module (macOS Keychain, Linux Secret Service, Windows Credential Manager). This is not environment variable storage.

| Environment | `gads login` | `config set` | Env vars |
| --- | --- | --- | --- |
| Interactive + keytar | Keychain | Keychain | N/A |
| Interactive, no keytar | Fails | Fails | Works |
| CI/CD (no TTY) | Fails | Works | Works |

For headless environments, set `TELEPAT_GOOGLE_ADS_*` variables directly in your CI configuration.

## Related Commands

- [ideon config](./ideon-config.md) — Set individual credentials non-interactively
- [Google Ads Keyword Planner Setup](../../guides/google-ads-keyword-planner.md) — Full setup guide

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- The `gads login` command requires an interactive terminal (TTY). For CI/CD environments, use environment variables or `ideon config set`.
- OAuth tokens are stored in the system keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager) via the `keytar` module.
