---
title: MCP Servers
description: Current MCP server status for Ideon and guidance for future MCP surface documentation.
keywords: [ideon, agents, mcp, protocol, integration]
---

# MCP Servers

Ideon publishes a first-party Model Context Protocol server over stdio transport.

## Current Status

- Entry command: `ideon mcp serve`
- Transport: stdio
- Intended usage: local process-spawned MCP clients
- Current tool set:
	- `ideon_write`
	- `ideon_write_resume`
	- `ideon_delete`
	- `ideon_config_get`
	- `ideon_config_set`

## Contract Notes

- Tool contracts must remain synchronized with CLI behavior and skill metadata.
- Contract parity is validated via the integration sync check in lint.
- Errors from tool handlers are returned as MCP tool errors with actionable messages.

## Maintenance Policy

For the mandatory same-change sync rule and validation checklist, see:

- [Agent Maintenance and Sync](./agent-maintenance-and-sync.md)
