# Ideon Troubleshooting Matrix

Use this matrix to diagnose common failures quickly.

## Fast triage flow

1. Classify failure:
   - input/validation
   - credential/config
   - resume/state
   - filesystem/permissions
   - preview/runtime
2. Run one minimal repro command.
3. Apply exact remediation and re-run the same command.

## Failure matrix

| Symptom | Likely cause | Checks | Remediation |
| --- | --- | --- | --- |
| `No idea provided` | Missing idea and no job-supplied idea/prompt | Check whether positional idea, `--idea`, or `--job` is provided | Provide idea text or use `--job` with `idea` or `prompt` |
| `Missing required --primary` in non-interactive context | Non-interactive run without targets | Verify `--no-interactive` usage and target flags | Add `--primary <type=1>` and optional `--secondary` values |
| `Missing required options for --no-interactive mode` | Style/length/targets absent for strict mode | Check supplied flags and job settings | Supply `--style`, `--length`, and target spec or include them in job settings |
| `Invalid target` / unsupported type | Bad `<content-type=count>` spec | Check target format and allowed content types | Use exact format and one of supported content types |
| `Primary target count must be exactly 1` | Invalid primary count | Inspect `--primary` value | Use `--primary <type=1>` |
| `cannot be both primary and secondary` | Same type used in both roles | Inspect target flags | Keep each type in one role only |
| Keychain warnings/failures in CI/container | Keychain unavailable | Check runtime environment and keychain access | Set `TELEPAT_DISABLE_KEYTAR=true` and inject env secrets |
| `No resumable write session found` | No session state for this project path | Check project directory | Start a fresh `ideon write ...` run; legacy `.ideon/write/state.json` files are automatically migrated |
| Delete requires confirmation in non-TTY | Running delete without `--force` in automation | Check terminal mode and flags | Re-run with `--force` after explicit user confirmation |
| Could not find article by slug | Slug typo or wrong output directory | Check slug and output dir config/env overrides | Use correct slug and run `ideon preview` to identify latest outputs |
| Invalid port for preview | Out-of-range or non-numeric port | Inspect `--port` value | Use `1..65535` (default `4173`) |
| Preview cannot find markdown | No generated outputs or wrong path | Check markdown path and output directory | Run write command first or pass explicit `.md` path |
| Unsupported runtime for `ideon agent` | Runtime outside supported set | Check runtime id | Use `claude`, `chatgpt`, `gemini`, or `generic-mcp` |
| Unsupported config key | Invalid key in config get/set/unset | Compare key to supported key list | Use keys from command catalog |
| GKP credential not configured | Google Ads credential missing | Run `ideon gads status` or `ideon config list --json` | Set via `ideon gads login` (interactive) or `ideon config set googleAds<Name> <value>` |
| `DEVELOPER_TOKEN_NOT_APPROVED` | Developer token in test mode | Check token status at ads.google.com/aw/apicenter | Apply for Basic access and wait for Google approval |
| `USER_PERMISSION_DENIED` | Missing login-customer-id or OAuth access | Run `ideon gads status` to verify all credentials | Set `googleAdsLoginCustomerId` to manager account ID if using sub-account |
| `invalid_grant` | Refresh token expired | Run `ideon gads test` to verify, then `ideon gads login --force` to re-authorize | Obtain new refresh token via `ideon gads login --force` |
| `gkp ideas` returns no results | No matching keywords for seed/URL | Check seed keywords and try different ones | Try broader keywords or use `--url` instead of `--keywords` |
| `gkp historical` returns no results | No historical data for keyword/region | Try different keywords or broaden country codes | Use `--json` to see raw response for debugging |
| `gkp forecast` returns no results | No forecast data for keyword/region | Try different keywords or check match type | Use `--country US` and `--match-type BROAD` for broadest data |
| `gkp list` returns empty | No cached queries for filters | Run a GKP query first or broaden filters | Try `ideon gkp list --verbose` without filters |
| Stale GKP cache | Cached data outdated | Check with `ideon gkp list --stale` | Re-run query with `--refresh` |
| Legacy `xMode` error | Old schema field used in saved/job/CLI targets | Inspect job/settings payload for `xMode` | Replace with explicit `x-post` or `x-thread` content type |

## Minimal repro commands

Validation path:

```bash
ideon write --no-interactive --idea "Validation probe" --primary article=1 --style professional --length medium --dry-run
```

Credentials/config path:

```bash
ideon config list --json
```

Resume path:

```bash
ideon write resume --no-interactive
```

Preview path:

```bash
ideon preview --no-open
```

Delete path:

```bash
ideon delete my-article-slug --force
```

MCP path:

```bash
ideon mcp serve
```

GKP credentials path:

```bash
ideon gads status
ideon gads test
```

GKP query path:

```bash
ideon gkp ideas --keywords test --json
ideon gkp historical --keywords test --json
ideon gkp forecast --keywords test --json
```

## Known doc/code discrepancy notes

- Several command docs list exit code `130` broadly. Code-level signal handling is explicitly implemented for write and preview watcher paths; treat other commands as `0`/`1` unless interruption handling is implemented.

## TODO gaps

- MCP host-level authorization and explicit user approval semantics are not documented by Ideon command/docs surface.
- Cross-platform expanded examples for exact OS config directory paths are not fully enumerated in docs (path is resolved via env-paths in code).
