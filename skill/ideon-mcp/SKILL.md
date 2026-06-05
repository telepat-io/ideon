---
name: ideon-mcp
description: Use this skill when users need to operate Ideon through its MCP tool surface — generating content, managing config, planning content strategy with Google Keyword Planner data, organizing publications, series, and queues, enriching links, exporting articles, or deleting outputs — all via MCP tool calls rather than CLI commands. Use this skill whenever the user mentions Ideon MCP tools, is running Ideon inside an MCP client (Claude, Claude Desktop, Gemini, opencode, Cursor, VS Code, ChatGPT, Codex), asks about ideon_write, ideon_config_set, ideon_delete, ideon_links, ideon_export, ideon_publication_*, ideon_series_*, ideon_queue_*, ideon_plan_*, ideon_article_list, gkp_generate_ideas, gkp_get_historical_data, gkp_get_forecast_data, wants to set up or configure the Ideon MCP server, or needs content generation workflows through the MCP protocol — even if they do not explicitly say "MCP".
---

# Ideon MCP Skill

## What this skill does

This skill teaches how to operate Ideon as a content writer platform through its MCP (Model Context Protocol) tool surface — not the CLI.

Ideon exposes 29 MCP tools covering the full content lifecycle: generate content from an idea, resume interrupted runs, enrich links, export articles, manage configuration, create and manage publications and series, queue articles for batch processing, plan content strategy with Google Keyword Planner research, and list generated articles.

Use this skill when working inside any MCP-compatible client. All operations are performed as MCP tool invocations with structured JSON responses.

## Server setup

Ideon offers two MCP transport modes.

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

Stdio is the standard for local process-spawned MCP clients. The server reads from stdin and writes to stdout.

### Streamable HTTP transport

```json
{
  "mcpServers": {
    "ideon": {
      "url": "http://127.0.0.1:3001/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

The HTTP server requires a bearer API key. Start it with:

```json
{
  "tool": "ideon_mcp_serve_http",
  "parameters": {
    "apiKey": "your-secret-key",
    "port": "3001",
    "host": "127.0.0.1",
    "endpoint": "/mcp"
  }
}
```

Or configure the MCP server entry to call the CLI directly:

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

The API key can also be set via the `IDEON_MCP_API_KEY` environment variable.

### Prerequisites

Before the MCP server can generate content, configure:

1. OpenRouter API key
2. Replicate API token (for image generation)

Set them via MCP tools:

```json
{"tool": "ideon_config_set", "parameters": {"key": "openRouterApiKey", "value": "sk-..."}}
{"tool": "ideon_config_set", "parameters": {"key": "replicateApiToken", "value": "r8_..."}}
```

Verify setup:

```json
{"tool": "ideon_config_list", "parameters": {}}
```

The response includes `settings` and `secrets` sections. Secrets show `true`/`false` for availability, never the actual values.

## When to use this skill

Use this skill when:

- You are running inside an MCP client and need to use Ideon tools.
- You need to generate multi-channel content from a single idea via MCP.
- You need to configure Ideon settings or secrets via MCP tools.
- You need to manage publications, series, or content queues via MCP.
- You need Google Keyword Planner research or content planning via MCP.
- You need to enrich, export, or delete generated content via MCP.
- You need to start or configure the Ideon MCP server.

Do not use this skill when:

- You are using Ideon from the command line (use the `ideon-cli` skill instead).
- You need a quick explanation of one tool parameter (the tool description is sufficient).
- You need VS Code or Cursor runtime integration setup (no MCP tool exists for this).

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
| Keywords | No | `keywords` | Not a direct parameter — use publication/series keywords. |
| Audience | No | `audience` | Target audience description injected into editorial policy. |
| Enrich links | No | `enrichLinks` (boolean) | Opt-in link enrichment for long-form outputs. |
| Max links | No | `maxLinks` (integer) | Cap generated links. |
| Max images | No | `maxImages` (integer) | Cap total images (1=cover only). |
| Custom links | No | `link` (array) | Custom link mappings: `"expression->url"`. |
| Unlinks | No | `unlink` (array) | Remove custom links by expression. |
| Job path | No | `jobPath` | Path to a job JSON file. |
| Dry run | No | `dryRun` (boolean) | Validate without generating. |

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

1. Discover the user's intent — what operation do they need (write, resume, plan, queue, links, export, delete, config, publications, series, articles)?
2. **Collect all required inputs** by consulting the [Inputs to collect](#inputs-to-collect-from-user) table. Ask the user for each required value before choosing an operation path.
3. Verify setup: call `ideon_config_list` and check that required secrets are present.
4. Choose operation path (see [Operations lifecycle](#operations-lifecycle)).
5. For content generation, call `ideon_write` with `dryRun: true` first.
6. Escalate to full generation only after dry run succeeds.
7. Report: tool called, structured response data, next safe step.

## Tool reference overview

29 tools organized by domain:

### Content generation

| Tool | Required params | Description |
| --- | --- | --- |
| `ideon_write` | `idea` | Generate content from an idea. |
| `ideon_write_resume` | — | Resume last failed/interrupted write. |
| `ideon_export` | `generationId`, `destinationPath` | Export article as standalone markdown. |
| `ideon_delete` | `slug` | Delete generated output by slug. |
| `ideon_links` | `slug` | Run link enrichment for an existing article. |
| `ideon_article_list` | — | List generated articles in current workspace. |

### Configuration

| Tool | Required params | Description |
| --- | --- | --- |
| `ideon_config_list` | — | List settings and secret availability. |
| `ideon_config_get` | `key` | Read a config value or secret flag. |
| `ideon_config_set` | `key`, `value` | Set a config value or secret. |
| `ideon_config_unset` | `key` | Reset a setting to default. |

### Publications

| Tool | Required params | Description |
| --- | --- | --- |
| `ideon_publication_add` | `name` | Create a publication. |
| `ideon_publication_list` | — | List all publications. |
| `ideon_publication_edit` | `slug` | Edit a publication (patch semantics). |
| `ideon_publication_remove` | `slug` | Delete a publication. |

### Series

| Tool | Required params | Description |
| --- | --- | --- |
| `ideon_series_add` | `name` | Create a series. |
| `ideon_series_list` | — | List all series (optional `publication` filter). |
| `ideon_series_edit` | `slug` | Edit a series (patch semantics). |
| `ideon_series_remove` | `slug` | Delete a series. |

### Content queue

| Tool | Required params | Description |
| --- | --- | --- |
| `ideon_queue_add` | `idea` | Add an article to the queue. |
| `ideon_queue_list` | — | List queued articles (optional filters). |
| `ideon_queue_peek` | — | Show next pending entry without consuming. |
| `ideon_queue_remove` | `id` | Delete a queue entry. |
| `ideon_queue_clear` | — | Delete all queue entries. |
| `ideon_queue_write` | — | Claim next pending entry and write it. |

### Content planning

| Tool | Required params | Description |
| --- | --- | --- |
| `ideon_plan_explore` | `idea`, `publication` | Research a new content idea with GKP data. |
| `ideon_plan_expand` | `seriesSlug` | Expand a series with new article ideas. |

### Google Keyword Planner

| Tool | Required params | Description |
| --- | --- | --- |
| `gkp_generate_ideas` | — | Generate keyword ideas from seeds/URL/site. |
| `gkp_get_historical_data` | `keywords` | Get historical search volume and competition. |
| `gkp_get_forecast_data` | `keywords` | Get projected impressions, clicks, and cost. |

### Google Ads authentication

| Tool | Required params | Description |
| --- | --- | --- |
| `gads_login` | `developerToken`, `clientId`, `clientSecret`, `customerId` | Start OAuth flow for Google Ads credentials. |
| `gads_login_status` | — | Check OAuth flow completion status. |
| `gads_test` | — | Verify Google Ads credentials with a test API call. |

See [references/tool-catalog.md](references/tool-catalog.md) for complete parameter schemas and constraints.

## Operations lifecycle

### Create content

```json
{"tool": "ideon_write", "parameters": {
  "idea": "How small teams ship docs faster",
  "primary": "article=1",
  "style": "technical",
  "intent": "tutorial",
  "length": "medium"
}}
```

With secondary outputs:

```json
{"tool": "ideon_write", "parameters": {
  "idea": "How small teams ship docs faster",
  "primary": "article=1",
  "secondary": ["x-post=1", "linkedin-post=1"],
  "style": "technical",
  "length": "medium"
}}
```

With link enrichment:

```json
{"tool": "ideon_write", "parameters": {
  "idea": "How small teams ship docs faster",
  "primary": "article=1",
  "enrichLinks": true,
  "maxLinks": 8
}}
```

With custom links:

```json
{"tool": "ideon_write", "parameters": {
  "idea": "How small teams ship docs faster",
  "primary": "article=1",
  "link": ["React->https://react.dev", "OpenRouter->https://openrouter.ai"]
}}
```

With publication, series, and audience:

```json
{"tool": "ideon_write", "parameters": {
  "idea": "How small teams ship docs faster",
  "primary": "article=1",
  "publication": "tech-blog",
  "series": "engineering-practices",
  "audience": "Senior engineers at early-stage startups",
  "style": "technical",
  "intent": "how-to-guide",
  "length": "large"
}}
```

Dry run (validate without generating):

```json
{"tool": "ideon_write", "parameters": {
  "idea": "How small teams ship docs faster",
  "primary": "article=1",
  "dryRun": true
}}
```

### Resume interrupted run

```json
{"tool": "ideon_write_resume", "parameters": {}}
```

With link enrichment:

```json
{"tool": "ideon_write_resume", "parameters": {"enrichLinks": true}}
```

### Enrich links

Run link enrichment on a previously generated article:

```json
{"tool": "ideon_links", "parameters": {"slug": "my-article-slug"}}
```

Append new links into existing sidecar:

```json
{"tool": "ideon_links", "parameters": {"slug": "my-article-slug", "mode": "append"}}
```

Add custom link:

```json
{"tool": "ideon_links", "parameters": {"slug": "my-article-slug", "link": ["OpenRouter->https://openrouter.ai"]}}
```

Remove a custom link:

```json
{"tool": "ideon_links", "parameters": {"slug": "my-article-slug", "unlink": ["OpenRouter"]}}
```

Cap generated links:

```json
{"tool": "ideon_links", "parameters": {"slug": "my-article-slug", "maxLinks": 5}}
```

### Export articles

Export by generation ID or slug:

```json
{"tool": "ideon_export", "parameters": {"generationId": "my-article-slug", "destinationPath": "./export-dir"}}
```

Export a specific variant when multiple exist:

```json
{"tool": "ideon_export", "parameters": {"generationId": "my-article-slug", "destinationPath": "./export-dir", "index": 2}}
```

Overwrite existing export:

```json
{"tool": "ideon_export", "parameters": {"generationId": "my-article-slug", "destinationPath": "./export-dir", "overwrite": true}}
```

### Delete outputs

```json
{"tool": "ideon_delete", "parameters": {"slug": "my-article-slug"}}
```

### List articles

```json
{"tool": "ideon_article_list", "parameters": {}}
```

### Configuration

List all settings:

```json
{"tool": "ideon_config_list", "parameters": {}}
```

Read a specific setting:

```json
{"tool": "ideon_config_get", "parameters": {"key": "model"}}
```

Set a secret:

```json
{"tool": "ideon_config_set", "parameters": {"key": "openRouterApiKey", "value": "sk-..."}}
```

Set a setting:

```json
{"tool": "ideon_config_set", "parameters": {"key": "model", "value": "anthropic/claude-sonnet-4"}}
```

Unset a key:

```json
{"tool": "ideon_config_unset", "parameters": {"key": "model"}}
```

## Publications and series via MCP

### Create a publication

```json
{"tool": "ideon_publication_add", "parameters": {
  "name": "Tech Blog",
  "style": "technical",
  "intent": "tutorial",
  "tone": "authoritative",
  "forbiddenTopics": ["hype", "speculation"],
  "disclosureRequirements": ["affiliate links"],
  "audienceRestrictions": ["no competitor mentions"],
  "editorialPolicy": "All claims must cite sources."
}}
```

### List publications

```json
{"tool": "ideon_publication_list", "parameters": {}}
```

### Edit a publication

```json
{"tool": "ideon_publication_edit", "parameters": {
  "slug": "tech-blog",
  "style": "professional",
  "intent": "how-to-guide"
}}
```

### Delete a publication

```json
{"tool": "ideon_publication_remove", "parameters": {"slug": "tech-blog"}}
```

### Create a series

```json
{"tool": "ideon_series_add", "parameters": {
  "name": "AI Deep Dives",
  "topic": "Exploring cutting-edge AI technologies",
  "publication": "tech-blog",
  "keywords": ["artificial intelligence", "machine learning"]
}}
```

### List series

```json
{"tool": "ideon_series_list", "parameters": {}}
```

Filtered by publication:

```json
{"tool": "ideon_series_list", "parameters": {"publication": "tech-blog"}}
```

### Edit a series

```json
{"tool": "ideon_series_edit", "parameters": {
  "slug": "ai-deep-dives",
  "topic": "New topic description"
}}
```

Remove publication association:

```json
{"tool": "ideon_series_edit", "parameters": {"slug": "ai-deep-dives", "unsetPublication": true}}
```

### Delete a series

```json
{"tool": "ideon_series_remove", "parameters": {"slug": "ai-deep-dives"}}
```

### How editorial policy is injected

When a publication or series is active, Ideon injects into all LLM prompts:

- Publication name, tone, forbidden topics, disclosure requirements, audience restrictions, and notes
- Series name, topic, and editorial policy (appended after publication policy)

## Content queue via MCP

The content queue is a global list of pending articles. Queue operations are atomic — concurrent writes claim entries safely.

### Add to queue

```json
{"tool": "ideon_queue_add", "parameters": {
  "idea": "The future of WebAssembly",
  "publication": "tech-blog",
  "series": "emerging-tech",
  "style": "technical",
  "intent": "deep-dive-analysis",
  "length": "large"
}}
```

### List queued articles

```json
{"tool": "ideon_queue_list", "parameters": {}}
```

Filtered by status:

```json
{"tool": "ideon_queue_list", "parameters": {"status": "pending"}}
```

Filtered by publication:

```json
{"tool": "ideon_queue_list", "parameters": {"publication": "tech-blog"}}
```

### Peek at next entry

```json
{"tool": "ideon_queue_peek", "parameters": {}}
```

### Write from queue

Claims the next pending entry and generates content. On success, deletes the entry. On failure, reverts to pending.

```json
{"tool": "ideon_queue_write", "parameters": {}}
```

With link enrichment:

```json
{"tool": "ideon_queue_write", "parameters": {"enrichLinks": true}}
```

With publication filter:

```json
{"tool": "ideon_queue_write", "parameters": {"publication": "tech-blog"}}
```

### Remove queue entries

```json
{"tool": "ideon_queue_remove", "parameters": {"id": "queue-entry-id"}}
```

Clear all entries:

```json
{"tool": "ideon_queue_clear", "parameters": {}}
```

### Queue entry lifecycle

1. **Enqueue** (`ideon_queue_add`): resolves all parameters and snapshots them into a self-contained entry.
2. **Claim** (`ideon_queue_write`): atomically renames the entry to in-progress. Concurrent calls skip claimed entries.
3. **Success**: deletes the entry.
4. **Failure**: reverts to pending.

## Content planning via MCP

Planning uses Google Keyword Planner research, KOB scoring, intent classification, topic clustering, and article planning. Requires both an OpenRouter API key and Google Ads credentials.

### Explore new topics

```json
{"tool": "ideon_plan_explore", "parameters": {
  "idea": "Content strategy for SaaS companies",
  "publication": "tech-blog",
  "context": "Target: early-stage B2B SaaS companies",
  "seriesCount": 3,
  "articlesPerSeries": 5
}}
```

Dry run (research only, no persistence):

```json
{"tool": "ideon_plan_explore", "parameters": {
  "idea": "Content strategy for SaaS companies",
  "publication": "tech-blog",
  "dryRun": true
}}
```

Auto-save (persists without human confirmation):

```json
{"tool": "ideon_plan_explore", "parameters": {
  "idea": "Content strategy for SaaS companies",
  "publication": "tech-blog",
  "autoSave": true
}}
```

### Expand existing series

```json
{"tool": "ideon_plan_expand", "parameters": {
  "seriesSlug": "ai-deep-dives",
  "publication": "tech-blog",
  "articleCount": 6
}}
```

### Planning pipeline

The plan pipeline runs automatically:

```
hydrate → seeds → research → score → cluster (explore only) → plan-articles → persist
```

- **hydrate**: loads publication, series, and output history to build a coverage map
- **seeds**: generates seed keywords from the content idea or existing series
- **research**: iterative GKP queries with broadening and low-volume detection
- **score**: KOB scoring, intent classification, and candidate filtering
- **cluster**: groups shortlisted keywords into thematic series (explore only)
- **plan-articles**: plans individual articles with keywords, intent, format, and priority
- **persist**: saves series, updates keywords, and queues articles (when `autoSave` is true)

The response contains the full plan as structured JSON. If `autoSave` is false, ask the user whether to re-run with `autoSave: true` before persisting.

## Google Ads login via MCP

The `gkp_*` and `ideon_plan_*` tools require Google Ads credentials. Instead of setting each credential manually with `ideon_config_set`, use `gads_login` for a guided OAuth flow.

### Login flow

**Step 1:** Call `gads_login` with all credentials. This saves the non-OAuth credentials immediately and starts a temporary local server for the OAuth callback.

```json
{"tool": "gads_login", "parameters": {
  "developerToken": "your-developer-token",
  "clientId": "your-client-id.apps.googleusercontent.com",
  "clientSecret": "your-client-secret",
  "customerId": "123-456-7890"
}}
```

With optional login customer ID for manager accounts:

```json
{"tool": "gads_login", "parameters": {
  "developerToken": "your-developer-token",
  "clientId": "your-client-id.apps.googleusercontent.com",
  "clientSecret": "your-client-secret",
  "customerId": "123-456-7890",
  "loginCustomerId": "987-654-3210"
}}
```

**Step 2:** The tool returns an auth URL. Instruct the user to open it in their browser and complete the Google authorization.

**Step 3:** After the user confirms they authorized, call `gads_login_status` to check completion.

```json
{"tool": "gads_login_status", "parameters": {}}
```

Status values:
- `pending` — OAuth flow in progress, waiting for browser authorization
- `completed` — Refresh token saved successfully
- `timed_out` — OAuth flow timed out after 120 seconds
- `not_started` — No flow has been started

**Step 4:** Verify credentials work with `gads_test`.

```json
{"tool": "gads_test", "parameters": {}}
```

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

## Google Keyword Planner via MCP

Once credentials are configured (via `gads_login` or manual `ideon_config_set` calls), use the three `gkp_*` tools to query keyword data.

### Generate keyword ideas

```json
{"tool": "gkp_generate_ideas", "parameters": {
  "seedKeywords": ["seo", "marketing"],
  "countryCodes": ["US"],
  "language": "en"
}}
```

From a URL:

```json
{"tool": "gkp_generate_ideas", "parameters": {
  "url": "https://example.com",
  "countryCodes": ["US"]
}}
```

### Historical metrics

```json
{"tool": "gkp_get_historical_data", "parameters": {
  "keywords": ["seo", "marketing"],
  "countryCodes": ["US"],
  "language": "en"
}}
```

Without CPC:

```json
{"tool": "gkp_get_historical_data", "parameters": {
  "keywords": ["seo"],
  "includeAverageCpc": false
}}
```

### Forecast data

```json
{"tool": "gkp_get_forecast_data", "parameters": {
  "keywords": ["seo"],
  "keywordMatchType": "EXACT",
  "countryCodes": ["US"],
  "startDate": "2026-07-01",
  "endDate": "2026-07-31"
}}
```

## Argument semantics and constraints

Primary/secondary target specs:

- `primary` format: `<content-type=count>`
- Primary `count` must be exactly `1`.
- Secondary `count` must be a positive integer.
- Same content type cannot be both primary and secondary.
- Duplicate secondary content types are deduped by summing counts.

Allowed content types:

- `article`, `blog-post`, `linkedin-post`, `newsletter`, `press-release`, `reddit-post`, `science-paper`, `x-post`, `x-thread`

Allowed style values:

- `academic`, `analytical`, `authoritative`, `conversational`, `empathetic`, `friendly`, `journalistic`, `minimalist`, `persuasive`, `playful`, `professional`, `storytelling`, `technical`

Allowed intent values:

- `announcement`, `case-study`, `cornerstone`, `counterargument`, `critique-review`, `deep-dive-analysis`, `how-to-guide`, `interview-q-and-a`, `listicle`, `opinion-piece`, `personal-essay`, `roundup-curation`, `tutorial`

Allowed length values:

- `small` (500 words), `medium` (900 words), `large` (1400 words), or a positive integer for a custom word count.

## Configuration precedence and discovery

Precedence (highest to lowest):

1. Tool parameters
2. Job file settings (`jobPath`)
3. Environment variables (`IDEON_*`)
4. Saved settings file
5. Schema defaults

Secrets precedence:

1. Environment secrets (`TELEPAT_OPENROUTER_KEY`, `TELEPAT_REPLICATE_TOKEN`)
2. Keychain secrets (disable with `TELEPAT_DISABLE_KEYTAR=true`)

## Tool response format

All MCP tools return a standard response:

```json
{
  "content": [{"type": "text", "text": "Human-readable message"}],
  "structuredContent": {"key": "value", "...": "..."}
}
```

The `content` field is always present. The `structuredContent` field contains machine-readable data when available.

Error responses:

```json
{
  "content": [{"type": "text", "text": "Error message"}],
  "isError": true
}
```

## Gotchas and sharp edges

- **No preview tool**: MCP has no equivalent of `ideon preview`. To preview generated content, use `ideon_export` to export markdown, then open it directly.
- **No agent registration tool**: MCP has no equivalent of `ideon agent install`. Register Ideon as an MCP server in your client's MCP configuration.
- **Delete always forces**: `ideon_delete` in MCP always deletes without confirmation. Verify the slug before calling.
- **Queue entries snapshot settings**: Publication and series defaults are frozen into queue entries at enqueue time. Changing defaults later does not affect queued entries.
- **`ideon_queue_write` is atomic**: Concurrent calls claim different entries automatically. No manual locking needed.
- **Plan tools require Google Ads credentials**: `ideon_plan_explore` and `ideon_plan_expand` call the GKP API. If credentials are missing, the tool returns a clear error message explaining which credential is needed.
- **`autoSave` persists immediately**: When `autoSave` is true on plan tools, results are saved without human review. Use `dryRun` first to validate.
- **Link enrichment is opt-in**: `ideon_write` defaults to no link enrichment. Pass `enrichLinks: true` to enable.
- **Export requires an existing generation**: `ideon_export` needs a completed generation. Run `ideon_write` first or check `ideon_article_list` for available slugs.
- **`length` accepts both aliases and integers**: `small`, `medium`, `large` are aliases for 500, 900, 1400 words. Pass an integer for a custom target.

## Failure handling

| Failure | Action |
| --- | --- |
| `isError: true` response | Read the error message — it contains the specific problem and often the fix. |
| Missing OpenRouter key | Set via `ideon_config_set` with key `openRouterApiKey`. |
| Missing Replicate token | Set via `ideon_config_set` with key `replicateApiToken`. |
| Missing Google Ads credentials | Set all required credentials via `ideon_config_set`. See [references/google-ads-setup.md](references/google-ads-setup.md). |
| No resumable session | Start a fresh `ideon_write` run. |
| No pending articles in queue | Add articles with `ideon_queue_add` or remove publication filter. |
| Generation not found for export | Run `ideon_article_list` to find available slugs/IDs. |
| Export destination exists | Pass `overwrite: true` or choose a different path. |
| Plan tool timeout | Increase `timeout` parameter (default 600 seconds). |
| Keychain unavailable in container | Set env var `TELEPAT_DISABLE_KEYTAR=true` and use `ideon_config_set` for secrets. |

## Verification prompts

Should trigger:

1. Set up the Ideon MCP server and configure credentials via `ideon_config_set`.
2. Generate content with primary and secondary targets using `ideon_write`.
3. Create a publication and series, then write content assigned to them via MCP.
4. Queue multiple articles with `ideon_queue_add`, then process with `ideon_queue_write`.
5. Run `ideon_plan_explore` and present the plan results for user confirmation.
6. Enrich links for an existing article using `ideon_links`.

Should not trigger:

1. Explain one Ideon flag quickly.
2. Build a VS Code extension UI.
3. Run Ideon CLI commands from a terminal.
4. Discuss product architecture without tool usage.

## Companion references

- See [references/tool-catalog.md](references/tool-catalog.md) for full tool parameter schemas and constraints.
- See [references/troubleshooting.md](references/troubleshooting.md) for detailed failure diagnostics.
- See [references/google-ads-setup.md](references/google-ads-setup.md) for Google Ads Keyword Planner credential setup.

Base directory for this skill: file:///Users/user/projects/Telepat/.agents/skills/ideon-mcp
Relative paths in this skill (e.g., references/) are relative to this base directory.
