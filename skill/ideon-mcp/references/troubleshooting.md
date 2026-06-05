# Ideon MCP Troubleshooting Matrix

Use this matrix to diagnose common failures when using Ideon through its MCP tool surface.

## Fast triage flow

1. Classify failure:
   - tool response error (`isError: true`)
   - credential/config missing
   - server not running
   - tool not found
   - unexpected structured content
2. Call `ideon_config_list` to check setup state.
3. Apply exact remediation and re-invoke the tool.

## Failure matrix

| Symptom | Likely cause | Checks | Remediation |
| --- | --- | --- | --- |
| `isError: true` with "No idea provided" | Missing `idea` on `ideon_write` | Check tool parameters | Provide `idea` string. |
| `isError: true` with "Missing required" | Required parameter absent | Compare against tool catalog | Supply the missing parameter. |
| `isError: true` with "Invalid target" | Bad primary/secondary format | Check `<type=count>` format | Use exact format, primary count must be `1`. |
| `isError: true` with "Primary target count must be exactly 1" | Invalid primary count | Inspect `primary` parameter | Use `"<type>=1"` format. |
| `isError: true` with "cannot be both primary and secondary" | Same type in both roles | Inspect target params | Keep each type in one role only. |
| `isError: true` with "Unsupported config key" | Invalid key in config tool | Compare against allowed keys | Use keys from the config keys list. |
| `isError: true` with "No resumable write session found" | No session state for this project | Check project directory | Start a fresh `ideon_write` run. |
| `isError: true` with "The last write session already completed" | Session is completed, not interrupted | — | Start a fresh `ideon_write` run. |
| `isError: true` with "already exists" on export | Export destination markdown exists | Check destination | Pass `overwrite: true`. |
| `isError: true` with "Generation not found" | Slug/ID typo for export | Check `ideon_article_list` output | Use correct slug or generation ID. |
| `isError: true` with "Publication already exists" | Duplicate slug on add | Check existing publications | Choose a different name. |
| `isError: true` with "Series already exists" | Duplicate slug on add | Check existing series | Choose a different name. |
| `isError: true` with "No pending articles in queue" | Queue is empty or publication filter wrong | Call `ideon_queue_list` | Add entries with `ideon_queue_add` or remove publication filter. |
| `isError: true` with "Google Ads credentials are not configured" | Missing GKP credentials | Call `ideon_config_list` | Set all required Google Ads credentials. See [google-ads-setup.md](google-ads-setup.md). |
| `isError: true` with "DEVELOPER_TOKEN_NOT_APPROVED" | Token in test mode | Check token status | Apply for Basic access at ads.google.com/aw/apicenter. |
| `isError: true` with "USER_PERMISSION_DENIED" (mentions login-customer-id) | Missing login customer ID | Check `googleAdsLoginCustomerId` | Set to manager account ID. |
| `isError: true` with "invalid_grant" | Refresh token expired | Call `gkp_get_historical_data` to test | Re-authorize via `gads_login` with `force: true`. See [google-ads-setup.md](google-ads-setup.md). |
| `isError: true` with "Already authenticated with Google Ads" | Refresh token exists, `force` not set | Check `gads_login_status` | Pass `force: true` to `gads_login` to re-authorize. |
| `gads_login` returns `pending` but `gads_login_status` shows `timed_out` | User did not authorize within 120s | Call `gads_login_status` | Start a new flow with `gads_login` and authorize promptly. |
| `gads_login` fails with "All ports in use" | Ports 9876–9879 all occupied | Check for other processes on those ports | Close processes using ports 9876–9879 and retry. |
| `gads_test` fails with missing credentials | Not all Google Ads credentials are set | Read the missing keys from the error message | Set missing keys via `ideon_config_set` or run `gads_login`. |
| `gads_test` fails with API error | Credentials set but invalid | Read the error message for specifics | Re-authorize via `gads_login` with `force: true`. |
| `isError: true` with "OpenRouter API key not configured" | Missing OpenRouter key | Call `ideon_config_list` | Set via `ideon_config_set` with key `openRouterApiKey`. |
| `isError: true` with "Google Ads developer token not configured" | Missing GKP token | Call `ideon_config_list` | Set via `ideon_config_set` with key `googleAdsDeveloperToken`. |
| `gkp_generate_ideas` returns empty results | No matching keywords | Check seed keywords and country | Try broader seeds, different URL, or `["US"]` country. |
| `gkp_get_historical_data` returns empty | No historical data for keyword/region | Check keywords and country | Try different keywords or broader country codes. |
| `gkp_get_forecast_data` returns empty | No forecast data | Check match type and dates | Use `keywordMatchType: "BROAD"` for widest data. |
| `ideon_plan_explore` times out | Research pipeline exceeded timeout | Check `timeout` parameter | Increase timeout (default 600s) or use `dryRun` to test. |
| `ideon_write` returns empty `structuredContent` | Generation completed but metadata missing | Check response text | The `content` text field always has the result message. |
| `ideon_delete` succeeds but files still visible | Cache or stale view | Re-check filesystem | Refresh any file listings. Deletion is immediate. |
| Legacy `xMode` error | Old schema field in job file | Inspect job file | Replace with explicit `x-post` or `x-thread` content type. |
| Tool not found error | Ideon MCP server not running or not configured | Check MCP server config | Start server or add to MCP client configuration. |

## Minimal repro calls

Validation path:

```json
{"tool": "ideon_write", "parameters": {
  "idea": "Validation probe",
  "primary": "article=1",
  "style": "professional",
  "length": "medium",
  "dryRun": true
}}
```

Config check:

```json
{"tool": "ideon_config_list", "parameters": {}}
```

Resume check:

```json
{"tool": "ideon_write_resume", "parameters": {"dryRun": true}}
```

GKP credentials check:

```json
{"tool": "ideon_config_list", "parameters": {}}
```

GKP query check:

```json
{"tool": "gkp_generate_ideas", "parameters": {"seedKeywords": ["test"], "countryCodes": ["US"]}}
```

GAds credentials test:

```json
{"tool": "gads_test", "parameters": {}}
```

GAds login status check:

```json
{"tool": "gads_login_status", "parameters": {}}
```

Queue check:

```json
{"tool": "ideon_queue_list", "parameters": {}}
```

Article list check:

```json
{"tool": "ideon_article_list", "parameters": {}}
```

## Error response format

All MCP tools return errors in this format:

```json
{
  "content": [{"type": "text", "text": "Human-readable error message"}],
  "isError": true
}
```

The error message always explains what went wrong and often includes the specific remediation. Read it carefully before retrying.

## Tool parameter validation

MCP tool parameters are validated against Zod schemas. Common validation errors:

- **Missing required parameter**: the tool returns an error naming the missing field.
- **Invalid enum value**: the tool returns an error listing the allowed values.
- **Wrong type**: the tool returns a type mismatch error (e.g., string provided for integer field).
- **Empty string for required field**: the tool returns a min-length validation error.

## Known limitations

- MCP transport-level auth (bearer token for HTTP) is separate from Ideon's own credentials. A 401/403 from the HTTP server means the bearer token is wrong, not that Ideon credentials are missing.
- The MCP server uses the current working directory for project-scoped operations. If the server is started from a different directory than expected, resume state and article lists may differ.
- Concurrent `ideon_queue_write` calls are safe (atomic claim), but concurrent `ideon_write` calls for the same idea may produce overlapping outputs.

## Source evidence index

- `src/integrations/mcp/server.ts` — MCP tool registration and handlers
- `src/integrations/mcp/tools.ts` — Tool input schemas (Zod)
- `src/integrations/mcp/httpServer.ts` — HTTP transport server
- `src/integrations/mcp/httpMiddleware.ts` — Bearer auth and origin validation
- `src/config/manage.ts` — Config key definitions
- `src/config/schema.ts` — Allowed enum values
- `src/types/queue.ts` — Queue entry status values
