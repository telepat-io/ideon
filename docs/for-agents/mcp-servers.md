---
title: MCP Servers
description: MCP server status for Ideon, covering both stdio and Streamable HTTP transports.
keywords: [ideon, agents, mcp, protocol, integration]
---

# MCP Servers

Ideon publishes a first-party Model Context Protocol server over two transports: stdio and Streamable HTTP.

## Transports

### stdio (local)

- Entry command: `ideon mcp serve`
- Transport: stdio
- Intended usage: local process-spawned MCP clients
- No authentication required

### Streamable HTTP (remote)

- Entry command: `ideon mcp serve-http`
- Transport: Streamable HTTP (MCP specification 2025-11-25)
- Intended usage: remote or network-accessible MCP clients
- Bearer token authentication required

```bash
ideon mcp serve-http --api-key <key> [--port <port>] [--host <host>] [--endpoint <path>]
```

Options:

| Flag | Default | Description |
|---|---|---|
| `--api-key` | (required) | Bearer token for authentication. Also reads `IDEON_MCP_API_KEY` env var. |
| `--port` | `3001` | Port to listen on. |
| `--host` | `127.0.0.1` | Host to bind to. Use `0.0.0.0` for network access. |
| `--endpoint` | `/mcp` | HTTP endpoint path for MCP requests. |

Session behavior:

- Stateful sessions with `Mcp-Session-Id` header
- `POST /mcp` — initialize new session or send requests to existing session
- `GET /mcp` — SSE stream for existing session
- `DELETE /mcp` — terminate session

Security:

- Bearer token authentication on all routes (returns 401/403 on failure)
- Origin validation against allowed localhost patterns
- Default bind to `127.0.0.1` (localhost only)
- CORS enabled with `Mcp-Session-Id` exposed header

## Tool Set

Both transports expose the same tools:

### Content Generation

- `ideon_write` — Generate content from an idea using the Ideon pipeline. Optional context params: `publication`, `series`, `keywords` (comma-separated), `faqSection`. Optional author params: `author` (slug), `experienceNotes` (per-run anecdotes). Optional SEO check params: `noSeoCheck`, `seoCheckMode` (`errors-only` | `strict`), `seoCheckMaxTurns` (1–20). Successful runs include an editorial checklist summary in the tool response.
- `ideon_write_resume` — Resume the last failed or interrupted write session. Optional SEO check params: `seoCheck` (force re-run), `seoCheckMode`, `seoCheckMaxTurns`. Optional `exportPath` to export after completion.
- `ideon_delete` — Delete generated output and assets by slug
- `ideon_links` — Run link enrichment for a previously generated article
- `ideon_export` — Export a generated article as a standalone markdown file

SEO check runs as pipeline stage 4 during `ideon_write` / `ideon_write_resume` — there is no standalone SEO MCP tool. Lint results and editor pass metadata are written to `meta.json` (`seoCheck`). Resolved author slug and dynamic `editorialChecklist` items are also written to `meta.json`.

### Authors

- `ideon_author_add` — Create an author profile (`name`, optional `profile`)
- `ideon_author_list` — List all author profiles
- `ideon_author_edit` — Update author `name` or `profile` (patch semantics)
- `ideon_author_remove` — Delete an author by slug

Publication and series tools accept `defaultAuthor`; series tools also accept `experienceNotes`.

### Configuration

- `ideon_config_get` — Read a configuration value or secret availability flag
- `ideon_config_set` — Set a configuration value or secret token
- `ideon_config_list` — List current settings and secret availability flags
- `ideon_config_unset` — Reset a setting to its default or delete a stored secret

### Publications

- `ideon_publication_add` — Create a new publication with editorial policy and defaults
- `ideon_publication_list` — List all publications
- `ideon_publication_edit` — Update fields on an existing publication (patch semantics)
- `ideon_publication_remove` — Delete a publication by slug

### Series

- `ideon_series_add` — Create a new content series with editorial policy and defaults
- `ideon_series_list` — List all content series, optionally filtered by publication
- `ideon_series_edit` — Update fields on an existing series (patch semantics)
- `ideon_series_remove` — Delete a series by slug

### Queue

- `ideon_queue_add` — Add an article idea to the content queue
- `ideon_queue_list` — List queued articles, optionally filtered by status and publication
- `ideon_queue_peek` — Show the next pending queue entry without claiming it
- `ideon_queue_remove` — Delete a queue entry by ID
- `ideon_queue_clear` — Delete all queue entries
- `ideon_queue_write` — Claim the next pending entry and write it; deletes on success, reverts on failure. Supports `noSeoCheck`, `seoCheckMode`, `seoCheckMaxTurns`. Auto-exports when the queue entry has `exportPath`.

### Research & Planning

- `ideon_plan_explore` — Research a content idea using keyword planner and generate series/article plans
- `ideon_plan_expand` — Expand an existing series with new article ideas using keyword research

### Articles

- `ideon_article_list` — List generated articles in the current workspace. Optional filters: `search`, `publication`, `series`, `contentType`, `limit`, `verbose`

### Preview

- `ideon_preview` — Start, stop, or check status of the local preview server

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `action` | enum | Yes | — | `start`, `stop`, or `status` |
| `port` | integer | No | `4173` | TCP port for the preview server (start only) |
| `markdownPath` | string | No | Newest generated markdown | Specific markdown file to preview (start only) |

Example calls:

```json
{"tool": "ideon_preview", "parameters": {"action": "start"}}
{"tool": "ideon_preview", "parameters": {"action": "start", "port": 4173}}
{"tool": "ideon_preview", "parameters": {"action": "status"}}
{"tool": "ideon_preview", "parameters": {"action": "stop"}}
```

Status reflects preview servers started by the current MCP process only. Servers started separately via `ideon preview` are not tracked.

### Google Keyword Planner

- `gkp_generate_ideas` — Generate keyword ideas from seed keywords, a URL, or a site. Optional cache context: `publication`, `series`, `refresh`
- `gkp_get_historical_data` — Get historical search volume and competition metrics. Optional cache context: `publication`, `series`, `refresh`
- `gkp_get_forecast_data` — Get projected impressions, clicks, and cost for keywords. Optional cache context: `publication`, `series`, `refresh`
- `gkp_list` — List cached GKP query history with optional filters
- `gads_logout` — Clear Google Ads credentials (`all` to clear everything)

## Google Keyword Planner Tools

The three `gkp_*` tools and the two `ideon_plan_*` tools provide access to Google Ads Keyword Planner data. They require six Google Ads credentials to be configured before use.

For setup instructions, see [Google Ads Keyword Planner Setup](../guides/google-ads-keyword-planner.md).

## Contract Notes

- Tool contracts must remain synchronized with CLI behavior and skill metadata.
- Contract parity is validated via the integration sync check in lint.
- Errors from tool handlers are returned as MCP tool errors with actionable messages.

## Maintenance Policy

For the mandatory same-change sync rule and validation checklist, see:

- [Agent Maintenance and Sync](./agent-maintenance-and-sync.md)
