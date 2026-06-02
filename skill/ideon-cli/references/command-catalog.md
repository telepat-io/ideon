# Ideon Command Catalog

This catalog is the deep reference for command surface, argument semantics, constraints, and scenario command paths.

## Command matrix

| Command | Purpose | Required args | Key options | Machine-readable output |
| --- | --- | --- | --- | --- |
| `ideon settings` | Interactive setup for settings and credential storage | none | none | no |
| `ideon config list` | List settings and secret-presence flags | none | `--json` | yes |
| `ideon config get <key>` | Read one config value/secret-presence key | `<key>` | `--json` | yes |
| `ideon config set <key> <value>` | Set one setting or secret | `<key> <value>` | none | no |
| `ideon config unset <key>` | Reset setting to default or delete stored secret | `<key>` | none | no |
| `ideon write [idea]` | Fresh pipeline run | idea required unless provided via `--idea` or job | `--primary`, `--secondary`, `--job`, `--style`, `--intent`, `--length`, `--no-interactive`, `--dry-run`, `--enrich-links`, `--link`, `--unlink`, `--max-links`, `--max-images`, `--audience`, `--publication`, `--series`, `--from-queue` | no |
| `ideon write resume` | Resume latest failed/interrupted run | none | `--no-interactive`, `--enrich-links`, `--link`, `--unlink`, `--max-links`, `--max-images` | no |
| `ideon delete <slug>` | Delete generated output by slug | `<slug>` | `--force` | no |
| `ideon links <slug>` | Run link enrichment for an existing article | `<slug>` | `--mode`, `--link`, `--unlink`, `--max-links` | no |
| `ideon export <generationId> <path>` | Export a generated article as a standalone markdown file with inline links and copied images | `<generationId> <path>` | `--index`, `--overwrite` | no |
| `ideon preview [markdownPath]` | Start local preview server/UI | none | `--port`, `--no-open`, `--watch` | no |
| `ideon mcp serve` | Start first-party MCP server over stdio | none | none | MCP tool protocol output |
| `ideon agent install <runtime>` | Register local runtime integration | `<runtime>` | `--dry-run` | no |
| `ideon agent uninstall <runtime>` | Remove runtime integration | `<runtime>` | `--dry-run` | no |
| `ideon agent status` | Show installed runtimes and readiness checks | none | `--json` | yes |
| `ideon gads login` | Interactive OAuth flow for Google Ads credentials | none | `--force`, `--developer-token`, `--client-id`, `--client-secret`, `--customer-id`, `--login-customer-id` | no |
| `ideon gads logout` | Clear stored Google Ads credentials | none | `--all` | no |
| `ideon gads status` | Show Google Ads credential status and source | none | `--json` | yes |
| `ideon gads test` | Verify Google Ads credentials with a test API call | none | none | no |
| `ideon gkp ideas` | Generate keyword ideas from seeds/URL/site | none* | `--keywords`, `--url`, `--site`, `--country`, `--language`, `--page-size`, `--json` | yes |
| `ideon gkp historical` | Get historical search volume and competition | `--keywords` | `--country`, `--language`, `--no-include-cpc`, `--json` | yes |
| `ideon gkp forecast` | Get projected impressions, clicks, and cost | `--keywords` | `--match-type`, `--max-cpc-bid`, `--country`, `--language`, `--start-date`, `--end-date`, `--json` | yes |
| `ideon publication add [name]` | Create publication with defaults and editorial policy | none | `--style`, `--intent`, `--length`, `--type`, `--audience`, `--tone`, `--forbidden-topics`, `--disclosure-requirements`, `--audience-restrictions`, `--editorial-policy` | no |
| `ideon publication list` | List all publications | none | `--json`, `--verbose` | yes |
| `ideon publication edit <slug>` | Edit publication fields | `<slug>` | `--name`, `--style`, `--intent`, `--length`, `--type`, `--audience`, `--tone`, `--forbidden-topics`, `--disclosure-requirements`, `--audience-restrictions`, `--editorial-policy` | no |
| `ideon publication remove <slug>` | Delete a publication | `<slug>` | `--force` | no |
| `ideon series add [name]` | Create content series with topic and defaults | none | `--topic`, `--publication`, `--style`, `--intent`, `--length`, `--type`, `--audience`, `--tone`, `--forbidden-topics`, `--disclosure-requirements`, `--audience-restrictions`, `--editorial-policy` | no |
| `ideon series list` | List all series, optionally filtered by publication | none | `--json`, `--verbose`, `--publication` | yes |
| `ideon series edit <slug>` | Edit series fields and publication association | `<slug>` | `--name`, `--topic`, `--publication`, `--unset-publication`, `--style`, `--intent`, `--length`, `--type`, `--audience`, `--tone`, `--forbidden-topics`, `--disclosure-requirements`, `--audience-restrictions`, `--editorial-policy` | no |
| `ideon series remove <slug>` | Delete a series | `<slug>` | `--force` | no |
| `ideon queue add [idea]` | Add article to content queue (same args as write) | none | `--primary`, `--secondary`, `--job`, `--style`, `--intent`, `--length`, `--audience`, `--publication`, `--series`, `--no-interactive`, `--export` | no |
| `ideon queue list` | List queued articles | none | `--json`, `--publication`, `--status` | yes |
| `ideon queue peek` | Show next pending article without consuming | none | `--publication` | no |
| `ideon queue remove <id>` | Delete a queued article by ID | `<id>` | `--force` | no |
| `ideon queue clear` | Delete all queued articles | none | `--force` | no |

## Argument and option semantics

### Write target specs

Format:

```bash
--primary <content-type=1>
--secondary <content-type=count>
```

Rules:

- Primary is required when non-interactive and no job targets exist.
- Primary count must be exactly `1`.
- Secondary count must be positive integer.
- Secondary content type cannot equal primary content type.
- Duplicate secondary content types are merged by summing counts.

Supported content types:

- `article`
- `blog-post`
- `linkedin-post`
- `newsletter`
- `press-release`
- `reddit-post`
- `science-paper`
- `x-post`
- `x-thread`

### Style and length

`--style` allowed values:

- `academic`
- `analytical`
- `authoritative`
- `conversational`
- `empathetic`
- `friendly`
- `journalistic`
- `minimalist`
- `persuasive`
- `playful`
- `professional`
- `storytelling`
- `technical`

`--length` allowed values:

- `small`
- `medium`
- `large`

### Config keys

Settings keys:

- `model`
- `modelSettings.temperature`
- `modelSettings.maxTokens`
- `modelSettings.topP`
- `modelRequestTimeoutMs`
- `notifications.enabled`
- `markdownOutputDir`
- `assetOutputDir`
- `style`
- `intent`
- `targetLength`

Secret keys:

- `openRouterApiKey`
- `replicateApiToken`
- `googleAdsDeveloperToken`
- `googleAdsClientId`
- `googleAdsClientSecret`
- `googleAdsRefreshToken`
- `googleAdsCustomerId`
- `googleAdsLoginCustomerId`

### Runtime IDs for agent command

Supported:

- `claude`
- `chatgpt`
- `gemini`
- `generic-mcp`

Explicitly rejected aliases:

- `cursor`
- `vscode`

## Config precedence matrix

Highest -> lowest:

1. CLI flags/args
2. Job file settings (`--job`)
3. Environment variables (`IDEON_*`)
4. Saved settings file
5. Schema defaults

Secrets precedence:

1. Environment secrets (`TELEPAT_OPENROUTER_KEY`, `TELEPAT_REPLICATE_TOKEN`)
2. Keychain secrets

## Interactive and non-interactive behavior

- Interactive (TTY, default): prompts for missing inputs in write flows.
- Non-interactive (`--no-interactive` or non-TTY): fails on missing required inputs.
- `ideon delete` requires interactive confirmation unless `--force` is supplied.

## Signal and exit behavior

- Common success code: `0`.
- Validation/runtime errors: `1`.
- Interrupted runs: `130` (documented command pages and write signal handling).

Specific behavior:

- `ideon write`: catches SIGINT/SIGTERM, patches session state, exits `130`.
- `ideon preview --watch`: kills watcher process on SIGINT/SIGTERM.

## Data flow and filesystem touch points

Config and state:

- Settings file: OS config directory, `settings.json`.
- Agent integration store: OS config directory, `agent-integrations.json`.
- Resume state: OS config directory, `sessions/<project-hash>/state.json` (keyed by project path).
- Resume works from any directory — session state is stored in the user's config directory.

Output artifacts:

- Markdown outputs: `*.md`
- Link sidecars: `*.links.json` (if enrichment enabled)
- Analytics sidecars: `*.analytics.json`
- Asset files under configured asset output directory

## Scenario command paths

### Minimal path

```bash
npm i -g @telepat/ideon
ideon settings
ideon write "How small teams ship docs faster" --primary article=1
ideon preview
```

### Common path

```bash
ideon write "How small teams ship docs faster" \
  --primary article=1 \
  --secondary x-post=1 \
  --secondary linkedin-post=1 \
  --style technical \
  --length medium
```

### Debug path

```bash
ideon config list --json
ideon write --dry-run "Pipeline smoke" --primary article=1 --style professional --length medium --no-interactive
ideon preview --no-open
```

### CI path

```bash
TELEPAT_DISABLE_KEYTAR=true \
TELEPAT_OPENROUTER_KEY=sk-... \
TELEPAT_REPLICATE_TOKEN=r8_... \
ideon write --no-interactive --idea "CI generation check" --primary article=1 --style professional --length medium
```

### Recovery path

```bash
ideon write resume
ideon write resume --no-interactive
```

### GKP path

```bash
ideon gkp ideas --keywords seo,marketing --country US
ideon gkp historical --keywords seo --json
ideon gkp forecast --keywords seo --match-type EXACT --country US
```

### MCP path

```bash
ideon mcp serve
```

MCP tools currently registered:

- `ideon_write`
- `ideon_write_resume`
- `ideon_delete`
- `ideon_links`
- `ideon_config_get`
- `ideon_config_set`
- `ideon_config_list`
- `ideon_config_unset`
- `gkp_generate_ideas`
- `gkp_get_historical_data`
- `gkp_get_forecast_data`

## Source evidence index

- `src/cli/app.ts`
- `src/cli/commands/write.tsx`
- `src/cli/commands/writeTargetSpecs.ts`
- `src/cli/commands/delete.ts`
- `src/cli/commands/serve.ts`
- `src/server/previewHelpers.ts`
- `src/cli/commands/config.ts`
- `src/config/manage.ts`
- `src/config/schema.ts`
- `src/config/resolver.ts`
- `src/config/env.ts`
- `src/config/settingsFile.ts`
- `src/config/secretStore.ts`
- `src/cli/commands/agent.ts`
- `src/cli/commands/gkp.ts`
- `src/integrations/agent/store.ts`
- `src/cli/commands/mcp.ts`
- `src/integrations/mcp/server.ts`
- `src/integrations/mcp/tools.ts`
- `docs/reference/commands/ideon-write.md`
- `docs/reference/commands/ideon-write-resume.md`
- `docs/reference/commands/ideon-delete.md`
- `docs/reference/commands/ideon-preview.md`
- `docs/reference/commands/ideon-config.md`
- `docs/reference/commands/ideon-agent.md`
- `docs/reference/commands/ideon-mcp-serve.md`
- `docs/reference/commands/ideon-gkp.md`
- `docs/reference/environment-variables.md`
- `docs/guides/configuration.md`
- `docs/for-agents/command-index.md`
- `docs/for-agents/mcp-servers.md`
