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
| `ideon write [idea]` | Fresh pipeline run | idea required unless provided via `--idea` or job | `--primary`, `--secondary`, `--job`, `--style`, `--length`, `--no-interactive`, `--dry-run`, `--no-enrich-links`, `--audience` | no |
| `ideon write resume` | Resume latest failed/interrupted run | none | `--no-interactive` | no |
| `ideon delete <slug>` | Delete generated output by slug | `<slug>` | `--force` | no |
| `ideon preview [markdownPath]` | Start local preview server/UI | none | `--port`, `--no-open`, `--watch` | no |
| `ideon mcp serve` | Start first-party MCP server over stdio | none | none | MCP tool protocol output |
| `ideon agent install <runtime>` | Register local runtime integration | `<runtime>` | `--dry-run` | no |
| `ideon agent uninstall <runtime>` | Remove runtime integration | `<runtime>` | `--dry-run` | no |
| `ideon agent status` | Show installed runtimes and readiness checks | none | `--json` | yes |

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
- `x-thread`
- `x-post`
- `reddit-post`
- `linkedin-post`
- `newsletter`
- `landing-page-copy`

### Style and length

`--style` allowed values:

- `professional`
- `friendly`
- `technical`
- `academic`
- `opinionated`
- `storytelling`

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
- `targetLength`

Secret keys:

- `openRouterApiKey`
- `replicateApiToken`

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

1. Environment secrets (`IDEON_OPENROUTER_API_KEY`, `IDEON_REPLICATE_API_TOKEN`)
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

- `ideon write`: catches SIGINT/SIGTERM, patches `.ideon/write/state.json`, exits `130`.
- `ideon preview --watch`: kills watcher process on SIGINT/SIGTERM.

## Data flow and filesystem touch points

Config and state:

- Settings file: OS config directory, `settings.json`.
- Agent integration store: OS config directory, `agent-integrations.json`.
- Resume state: current working directory, `.ideon/write/state.json`.

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
IDEON_DISABLE_KEYTAR=true \
IDEON_OPENROUTER_API_KEY=sk-... \
IDEON_REPLICATE_API_TOKEN=r8_... \
ideon write --no-interactive --idea "CI generation check" --primary article=1 --style professional --length medium
```

### Recovery path

```bash
ideon write resume
ideon write resume --no-interactive
```

### MCP path

```bash
ideon mcp serve
```

MCP tools currently registered:

- `ideon_write`
- `ideon_write_resume`
- `ideon_delete`
- `ideon_config_get`
- `ideon_config_set`

TODO:

- External-host approval/trust prompts are not documented by Ideon; only stdio transport and tool registration are documented.

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
- `docs/reference/environment-variables.md`
- `docs/guides/configuration.md`
- `docs/for-agents/command-index.md`
- `docs/for-agents/mcp-servers.md`
