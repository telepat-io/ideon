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

- `ideon_write` — Generate content from an idea using the Ideon pipeline
- `ideon_write_resume` — Resume the last failed or interrupted write session
- `ideon_delete` — Delete generated output and assets by slug
- `ideon_links` — Run link enrichment for a previously generated article
- `ideon_export` — Export a generated article as a standalone markdown file

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
- `ideon_queue_write` — Claim the next pending entry and write it; deletes on success, reverts on failure

### Research & Planning

- `ideon_plan_explore` — Research a content idea using keyword planner and generate series/article plans
- `ideon_plan_expand` — Expand an existing series with new article ideas using keyword research

### Articles

- `ideon_article_list` — List generated articles in the current workspace

### Google Keyword Planner

- `gkp_generate_ideas` — Generate keyword ideas from seed keywords, a URL, or a site
- `gkp_get_historical_data` — Get historical search volume and competition metrics
- `gkp_get_forecast_data` — Get projected impressions, clicks, and cost for keywords

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
