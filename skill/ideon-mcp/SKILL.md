---
name: ideon-mcp
description: Use this skill when operating Ideon through its MCP tool surface — generating content, managing config, planning with Google Keyword Planner, organizing publications/series/authors/queues, enriching links, exporting, previewing, or deleting outputs via MCP tool calls. Use inside MCP clients (Claude, Cursor, VS Code, ChatGPT, Codex, etc.). Do not use for CLI/terminal workflows (use ideon-cli skill).
---

# Ideon MCP Skill

Operate Ideon through 39 MCP tools covering the full content lifecycle: write, resume, plan, queue, export, links, config, publications, series, authors, GKP research, and Google Ads auth. All operations are MCP tool invocations with structured JSON responses.

## Agent constraints

- Always call `ideon_write` with `dryRun: true` first before full generation.
- `ideon_delete` and `ideon_queue_remove/clear` always force-delete — verify slug/ID with user first.
- Plan tools: use `dryRun: true` first; only set `autoSave: true` after user confirms.
- No post-write export on `ideon_write` — use `ideon_export` separately or `exportPath` on resume/queue.
- No agent registration MCP tool — use `ideon agent install <runtime>` from the terminal (or configure MCP manually per host).
- In containers: set `TELEPAT_DISABLE_KEYTAR=true` and use `ideon_config_set` for secrets.

## Server setup

### Stdio transport

```json
{
  "mcpServers": {
    "ideon": {
      "command": "ideon",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Streamable HTTP transport

```json
{
  "mcpServers": {
    "ideon": {
      "command": "ideon",
      "args": ["mcp", "serve-http", "--api-key", "YOUR_KEY", "--port", "3001"]
    }
  }
}
```

Or connect to a running server: `http://127.0.0.1:3001/mcp` with `Authorization: Bearer YOUR_API_KEY`. API key also via `IDEON_MCP_API_KEY`.

### Prerequisites

Configure before generating content:

```json
{"tool": "ideon_config_set", "parameters": {"key": "openRouterApiKey", "value": "sk-..."}}
{"tool": "ideon_config_set", "parameters": {"key": "replicateApiToken", "value": "r8_..."}}
{"tool": "ideon_config_list", "parameters": {}}
```

Secrets show `true`/`false` for availability, never actual values.

### Host-specific MCP paths

Prefer `ideon agent install <runtime> --mcp-skill` to register stdio MCP and install this skill. Manual paths when needed:

| Host | Config file | Key |
| --- | --- | --- |
| Pi | `~/.pi/agent/mcp.json` (global) or `.pi/mcp.json` (project) | `mcpServers.ideon` — use with `pi-mcp-adapter` (`pi install npm:pi-mcp-adapter`) |
| Claude Code | `~/.mcp.json` | `mcpServers.ideon` |
| Cursor | `~/.cursor/mcp.json` or `.cursor/mcp.json` | `mcpServers.ideon` |
| VS Code | `.vscode/mcp.json` | `servers.ideon` |
| Gemini | `~/.gemini/mcp.json` | `mcpServers.ideon` |
| Codex | `~/.codex/config.toml` | `[mcp_servers.ideon]` |
| OpenCode | `opencode.json` | `mcp.ideon` |
| Generic MCP | `~/.config/mcp/mcp.json` | `mcpServers.ideon` |

Pi uses **proxy mode** via pi-mcp-adapter — do not enable direct tool injection for the full 39-tool surface unless the user explicitly accepts the context cost.

## Inputs to collect from user

Always collect all relevant inputs before invoking any tool. Ask the user for the values needed based on the operation they want.

### Write / resume

| Input | Required | MCP parameter | Why it matters |
| --- | --- | --- | --- |
| Idea text | Yes | `idea` | Required by `ideon_write`. |
| Primary target | Yes | `primary` | Format: `<content-type=1>`. Required for non-interactive. |
| Secondary targets | No | `secondary` (array) | Optional channel variants. |
| Style | No | `style` | Writing style enum. Defaults from publication/series/settings. |
| Intent | No | `intent` | Content intent enum. Defaults from publication/series/settings. |
| Length | No | `length` | `small`/`medium`/`large` or positive integer. |
| Publication | No | `publication` | Publication slug for defaults and editorial policy. |
| Series | No | `series` | Series slug for defaults and thematic context. |
| Author | No | `author` | Author slug for voice and expertise. Overrides publication/series defaults. |
| Experience notes | No | `experienceNotes` | Per-run anecdotes or first-hand experience to weave into the draft. |
| Keywords | No | `keywords` | Comma-separated SEO keywords (e.g. `"organic marketing, seo"`). |
| FAQ section | No | `faqSection` (boolean) | Force FAQ block on (`true`) or off (`false`) after conclusion. |
| Export path (resume) | No (resume) | `exportPath` | Export the generated article after `ideon_write_resume` completes. |
| Audience | No | `audience` | Target audience description injected into editorial policy. |
| Enrich links | No | `enrichLinks` (boolean) | Opt-in link enrichment for long-form outputs. |
| Max links | No | `maxLinks` (integer) | Cap generated links. |
| Max images | No | `maxImages` (integer) | Cap total images (1=cover only). |
| Custom links | No | `link` (array) | Custom link mappings: `"expression->url"`. |
| Unlinks | No | `unlink` (array) | Remove custom links by expression. |
| Job path | No | `jobPath` | Path to a job JSON file. |
| Dry run | No | `dryRun` (boolean) | Validate without generating. |
| Skip SEO check | No | `noSeoCheck` (boolean) | Skip post-section SEO lint and editor on `ideon_write`. |
| SEO check mode | No | `seoCheckMode` | `errors-only` (default) or `strict`. |
| SEO check max turns | No | `seoCheckMaxTurns` (integer) | Max editor-agent turns (1–20, default 10). |
| Force SEO re-check | No (resume) | `seoCheck` (boolean) | Re-run SEO lint and editor on `ideon_write_resume`. |

### Plan explore / expand

| Input | Required | MCP parameter | Why it matters |
| --- | --- | --- | --- |
| Content idea | Yes (explore) | `idea` | The topic to research. |
| Series slug | Yes (expand) | `seriesSlug` | The existing series to expand. |
| Publication | Yes (explore) | `publication` | Publication slug. Must exist. |
| Context | No (explore) | `context` | Business context or ICP description. |
| Series count | No (explore) | `seriesCount` | Number of series to aim for (default 3). |
| Articles per series | No (explore) | `articlesPerSeries` | Articles per series (default 5). |
| Article count | No (expand) | `articleCount` | New articles to plan (default 5). |
| Seed keywords | No | `seedKeywords` (array) | Keywords to always include. |
| Exclude series | No (explore) | `excludeSeries` (array) | Series slugs to avoid. |
| Country | No | `country` | Comma-separated ISO codes. |
| Language | No | `language` | ISO 639-1 code. |
| Content type | No | `contentType` | Content type for queue entries. |
| Model | No | `model` | LLM model for reasoning calls. |
| Intent model | No | `intentModel` | LLM model for intent classification. |
| Auto save | No | `autoSave` (boolean) | Persist without human confirmation. |
| Dry run | No | `dryRun` (boolean) | Research without persisting. |
| Timeout | No | `timeout` | Timeout in seconds (default 600). |

### GKP research

| Input | Required | MCP parameter | Why it matters |
| --- | --- | --- | --- |
| Seed keywords | No (ideas) | `seedKeywords` (array) | Seed keywords to generate ideas from. |
| URL | No (ideas) | `url` | URL to generate keyword ideas from. |
| Site | No (ideas) | `site` | Site domain to generate keyword ideas from. |
| Keywords | Yes (historical/forecast) | `keywords` (array) | Keywords to query. |
| Country codes | No | `countryCodes` (array) | ISO country codes (default `["US"]`). |
| Language | No | `language` | ISO language code (default `en`). |
| Match type | No (forecast) | `keywordMatchType` | `EXACT`, `PHRASE`, or `BROAD`. |
| Max CPC bid | No (forecast) | `maxCpcBidMicros` | Max CPC bid in micros. |
| Start date | No (forecast) | `startDate` | Forecast start (`yyyy-MM-dd`). |
| End date | No (forecast) | `endDate` | Forecast end (`yyyy-MM-dd`). |
| Include CPC | No (historical) | `includeAverageCpc` (boolean) | Include CPC data. |
| Page size | No (ideas) | `pageSize` (integer) | Max results to return. |
| Publication (cache) | No | `publication` | Attach cache context to a publication slug. |
| Series (cache) | No | `series` | Attach cache context to a series slug. |
| Refresh cache | No | `refresh` (boolean) | Bypass cache and fetch fresh data. |

### GKP cache list

| Input | Required | MCP parameter | Why it matters |
| --- | --- | --- | --- |
| Publication | No | `publication` | Filter by publication slug. |
| Series | No | `series` | Filter by series slug. |
| Search | No | `search` | Filter by keyword, URL, site, publication, or series text. |
| Fresh only | No | `fresh` (boolean) | Show only fresh cache entries. |
| Stale only | No | `stale` (boolean) | Show only stale cache entries. |
| Verbose | No | `verbose` (boolean) | Include full cache entry details. |

### Article list

| Input | Required | MCP parameter | Why it matters |
| --- | --- | --- | --- |
| Search | No | `search` | Search by title, keywords, description, or body. |
| Publication | No | `publication` | Filter by publication slug. |
| Series | No | `series` | Filter by series slug. |
| Content type | No | `contentType` | Filter by content type (e.g. `article`, `x-post`). |
| Limit | No | `limit` (integer) | Maximum results (default 50). |
| Verbose | No | `verbose` (boolean) | Include detailed article metadata. |

### Queue

| Input | Required | MCP parameter | Why it matters |
| --- | --- | --- | --- |
| Idea text | Yes | `idea` | Article idea to enqueue. |
| Publication | No | `publication` | Publication slug. |
| Series | No | `series` | Series slug. |
| Style | No | `style` | Writing style. |
| Intent | No | `intent` | Content intent. |
| Length | No | `length` | Target length alias. |
| Type | No | `type` | Content type. |
| Audience | No | `audience` | Target audience. |
| Country | No | `country` | Comma-separated ISO codes. |
| Language | No | `language` | ISO 639-1 code. |
| Export path | No | `exportPath` | Auto-export path for when article is written. |

### Queue write

| Input | Required | MCP parameter | Why it matters |
| --- | --- | --- | --- |
| Publication filter | No | `publication` | Dequeue next pending entry for this publication. |
| Dry run | No | `dryRun` (boolean) | Validate without generating. |
| Skip SEO check | No | `noSeoCheck` (boolean) | Skip SEO lint and editor pass. |
| SEO check mode | No | `seoCheckMode` | `errors-only` or `strict`. |
| SEO check max turns | No | `seoCheckMaxTurns` (integer) | Max editor-agent turns (1–20). |
| Enrich links | No | `enrichLinks` (boolean) | Enable link enrichment. |
| Custom links / unlinks | No | `link` / `unlink` (arrays) | Custom link mappings or removals. |
| Max links / images | No | `maxLinks` / `maxImages` (integers) | Cap generated links or images. |

Post-write export uses `exportPath` stored on the queue entry (from `ideon_queue_add`).

### Publications

| Input | Required | MCP parameter | Why it matters |
| --- | --- | --- | --- |
| Name | Yes (add) | `name` | Publication name. |
| Slug | Yes (edit/remove) | `slug` | Publication slug. |
| Style/Intent/Length/Type | No | `style`/`intent`/`length`/`type` | Publication defaults. |
| Audience | No | `audience` | Default audience hint. |
| Country | No | `country` | ISO country codes. |
| Language | No | `language` | ISO language code. |
| Tone | No | `tone` | Editorial tone. |
| Forbidden topics | No | `forbiddenTopics` (array) | Topics to avoid. |
| Disclosure requirements | No | `disclosureRequirements` (array) | Required disclosures. |
| Audience restrictions | No | `audienceRestrictions` (array) | Audience constraints. |
| Editorial policy | No | `editorialPolicy` | Free-text editorial notes. |

### Series

| Input | Required | MCP parameter | Why it matters |
| --- | --- | --- | --- |
| Name | Yes (add) | `name` | Series name. |
| Slug | Yes (edit/remove) | `slug` | Series slug. |
| Topic | No | `topic` | Series topic description. |
| Publication | No | `publication` | Publication slug. |
| Unset publication | No (edit) | `unsetPublication` (boolean) | Remove publication association. |
| Keywords | No | `keywords` (array) | Series-level SEO keywords. |
| All other fields | No | Same as publication | Style, intent, editorial policy, etc. |

## Deterministic workflow

1. Discover the user's intent — what operation do they need?
2. **Collect all required inputs** from the [Inputs to collect](#inputs-to-collect-from-user) tables.
3. Verify setup: call `ideon_config_list` and check required secrets.
4. For content generation, call `ideon_write` with `dryRun: true` first.
5. Escalate to full generation only after dry run succeeds.
6. Report: tool called, structured response data, next safe step.

## After a successful write

1. Read `structuredContent.generationDir` and `markdownPath` from `ideon_write` or `ideon_write_resume`.
2. Open `<generationDir>/meta.json` for full metadata (`outputs[]`, `images[]`, `editorialChecklist`, `seoCheck`).
3. Read primary markdown at `markdownPath` (or the first entry in `meta.json` `outputs[]`).
4. Call `ideon_export` when publish-ready markdown with inlined links is needed (`ideon_write` does not auto-export).
5. Use `ideon_article_list` to discover older runs by slug, publication, or search.

Full artifact schemas and directory layout: [references/output-structure.md](references/output-structure.md).

## Tool catalog

39 tools across content, config, publications, series, authors, queue, planning, GKP, and GAds auth. See [references/tool-catalog.md](references/tool-catalog.md) for complete parameter schemas and constraints.

Quick reference:

| Domain | Tools |
| --- | --- |
| Content | `ideon_write`, `ideon_write_resume`, `ideon_delete`, `ideon_links`, `ideon_export`, `ideon_article_list`, `ideon_preview` |
| Config | `ideon_config_list`, `ideon_config_get`, `ideon_config_set`, `ideon_config_unset` |
| Publications | `ideon_publication_add/list/edit/remove` |
| Series | `ideon_series_add/list/edit/remove` |
| Authors | `ideon_author_add/list/edit/remove` |
| Queue | `ideon_queue_add/list/peek/remove/clear/write` |
| Planning | `ideon_plan_explore`, `ideon_plan_expand` |
| GKP | `gkp_generate_ideas`, `gkp_get_historical_data`, `gkp_get_forecast_data`, `gkp_list` |
| GAds auth | `gads_login`, `gads_login_status`, `gads_test`, `gads_logout` |

## Canonical examples

### Write

```json
{"tool": "ideon_write", "parameters": {
  "idea": "How small teams ship docs faster",
  "primary": "article=1",
  "style": "technical",
  "intent": "tutorial",
  "length": "medium",
  "dryRun": true
}}
```

With publication, series, and enrichment:

```json
{"tool": "ideon_write", "parameters": {
  "idea": "How small teams ship docs faster",
  "primary": "article=1",
  "publication": "tech-blog",
  "series": "engineering-practices",
  "enrichLinks": true,
  "keywords": "documentation, developer experience"
}}
```

### Resume and export

```json
{"tool": "ideon_write_resume", "parameters": {"exportPath": "./export-dir"}}
```

### Queue

```json
{"tool": "ideon_queue_add", "parameters": {
  "idea": "The future of WebAssembly",
  "publication": "tech-blog",
  "style": "technical",
  "intent": "deep-dive-analysis",
  "length": "large",
  "exportPath": "./export-dir"
}}
{"tool": "ideon_queue_write", "parameters": {"publication": "tech-blog", "enrichLinks": true}}
```

### Plan

```json
{"tool": "ideon_plan_explore", "parameters": {
  "idea": "Content strategy for SaaS companies",
  "publication": "tech-blog",
  "dryRun": true
}}
```

After user confirms: re-run with `"autoSave": true`.

```json
{"tool": "ideon_plan_expand", "parameters": {
  "seriesSlug": "ai-deep-dives",
  "publication": "tech-blog",
  "articleCount": 6
}}
```

### Export, links, delete, list

```json
{"tool": "ideon_export", "parameters": {"generationId": "my-article-slug", "destinationPath": "./export-dir", "overwrite": true}}
{"tool": "ideon_links", "parameters": {"slug": "my-article-slug", "mode": "append", "maxLinks": 5}}
{"tool": "ideon_delete", "parameters": {"slug": "my-article-slug"}}
{"tool": "ideon_article_list", "parameters": {"search": "react hooks", "publication": "tech-blog", "limit": 25}}
```

### Publications and series

| Tool | Purpose |
| --- | --- |
| `ideon_publication_add` | Create publication with defaults and editorial policy |
| `ideon_publication_list` | List all publications |
| `ideon_publication_edit` | Patch publication fields by slug |
| `ideon_publication_remove` | Delete publication |
| `ideon_series_add` | Create series with topic and publication |
| `ideon_series_list` | List series (optional `publication` filter) |
| `ideon_series_edit` | Patch series fields by slug |
| `ideon_series_remove` | Delete series |

Full parameter schemas: [references/tool-catalog.md](references/tool-catalog.md).

When a publication or series is active, editorial policy is injected into all LLM prompts.

Queue lifecycle: enqueue snapshots settings → `ideon_queue_write` claims atomically → success deletes entry, failure reverts to pending.

## Google Ads and GKP

The `gkp_*` and `ideon_plan_*` tools require Google Ads credentials.

### Login flow

1. Call `gads_login` with developer token, client ID, client secret, and customer ID.
2. Instruct user to open the returned auth URL in their browser.
3. After authorization, call `gads_login_status` (expect `completed`).
4. Verify with `gads_test`.

Re-authorize with `force: true` if a refresh token already exists. Clear credentials with `gads_logout` (`all: true` for all six).

See [references/google-ads-setup.md](references/google-ads-setup.md) for full setup and troubleshooting.

### GKP queries

```json
{"tool": "gkp_generate_ideas", "parameters": {"seedKeywords": ["seo", "marketing"], "countryCodes": ["US"], "publication": "tech-blog", "refresh": true}}
{"tool": "gkp_get_historical_data", "parameters": {"keywords": ["seo"], "countryCodes": ["US"]}}
{"tool": "gkp_get_forecast_data", "parameters": {"keywords": ["seo"], "keywordMatchType": "EXACT", "startDate": "2026-07-01", "endDate": "2026-07-31"}}
{"tool": "gkp_list", "parameters": {"publication": "tech-blog", "search": "content strategy", "fresh": true}}
```

Planning pipeline: `hydrate → seeds → research → score → cluster (explore only) → plan-articles → persist`. Response is structured JSON; ask user before `autoSave: true`.

## Argument semantics and constraints

Target specs: `primary` format `<content-type=count>`, count must be `1`. Allowed content types, styles, intents, and lengths: see [references/tool-catalog.md](references/tool-catalog.md).

Config precedence (highest to lowest): tool parameters → job file → `IDEON_*` env → saved settings → schema defaults.

## Tool response format

```json
{
  "content": [{"type": "text", "text": "Human-readable message"}],
  "structuredContent": {"key": "value"}
}
```

Errors: `"isError": true` with message in `content`. GKP credential errors include setup instructions.

## Gotchas and sharp edges

- **Preview differs from CLI**: `ideon_preview` manages server start/stop/status; CLI `ideon preview` opens browser and supports `--watch` — use **`ideon-cli` skill** for watch workflows.
- **Delete always forces**: verify slug before `ideon_delete`.
- **Queue entries snapshot settings** at enqueue time — changing defaults later has no effect.
- **`ideon_queue_write` is atomic** — concurrent calls claim different entries.
- **Plan tools require Google Ads credentials** — use `dryRun` first, `autoSave` only after user confirms.
- **Link enrichment is opt-in** on `ideon_write` — pass `enrichLinks: true`.
- **No post-write export on `ideon_write`** — use `ideon_export` or `exportPath` on resume/queue.
- **`length` accepts aliases and integers**: `small`/`medium`/`large` or custom word count.

## Failure handling

| Failure | Action |
| --- | --- |
| `isError: true` response | Read error message — often includes the fix. |
| Missing OpenRouter key | `ideon_config_set` with key `openRouterApiKey`. |
| Missing Replicate token | `ideon_config_set` with key `replicateApiToken`. |
| Missing Google Ads credentials | Use `gads_login` or see [references/google-ads-setup.md](references/google-ads-setup.md). |
| No resumable session | Start fresh `ideon_write`. |
| No pending articles in queue | Add with `ideon_queue_add` or remove publication filter. |
| Generation not found for export | Run `ideon_article_list` to find slugs/IDs. |
| Export destination exists | Pass `overwrite: true` or choose different path. |
| Plan tool timeout | Increase `timeout` (default 600 seconds). |
| Keychain unavailable | Set `TELEPAT_DISABLE_KEYTAR=true` and use `ideon_config_set`. |

## Companion references

- See [references/output-structure.md](references/output-structure.md) for generation directory layout, `meta.json`, link sidecars, and export behavior.
- See [references/tool-catalog.md](references/tool-catalog.md) for full tool parameter schemas.
- See [references/troubleshooting.md](references/troubleshooting.md) for detailed failure diagnostics.
- See [references/google-ads-setup.md](references/google-ads-setup.md) for Google Ads credential setup.
- See the **`ideon-cli` skill** for terminal commands and `ideon preview --watch` workflows.
