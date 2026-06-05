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

- `ideon_write`
- `ideon_write_resume`
- `ideon_delete`
- `ideon_links`
- `ideon_export`
- `ideon_config_get`
- `ideon_config_set`
- `ideon_config_list`
- `ideon_config_unset`
- `gkp_generate_ideas`
- `gkp_get_historical_data`
- `gkp_get_forecast_data`

## Google Keyword Planner Tools

The three `gkp_*` tools provide access to Google Ads Keyword Planner data. They require six Google Ads credentials to be configured before use.

For setup instructions, see [Google Ads Keyword Planner Setup](../guides/google-ads-keyword-planner.md).

## Contract Notes

- Tool contracts must remain synchronized with CLI behavior and skill metadata.
- Contract parity is validated via the integration sync check in lint.
- Errors from tool handlers are returned as MCP tool errors with actionable messages.

## Maintenance Policy

For the mandatory same-change sync rule and validation checklist, see:

- [Agent Maintenance and Sync](./agent-maintenance-and-sync.md)
