---
title: ideon mcp serve
description: Start the first-party Ideon Model Context Protocol server over stdio transport.
keywords: [ideon, cli, mcp, stdio, agents]
---

# ideon mcp serve

## What This Command Does

`ideon mcp serve` starts Ideon's MCP server over stdio so an MCP client can call Ideon tools.

## Usage

```bash
ideon mcp serve
```

## Transport and Scope

- Transport: stdio
- Intended use: local process-spawned MCP clients
- Integration scope: CLI/MCP runtimes
- Not supported: Cursor or VS Code integration profiles in Ideon runtime management

## Available Tools

- `ideon_write`
- `ideon_write_resume`
- `ideon_delete`
- `ideon_config_get`
- `ideon_config_set`

## Output and Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | Server exited cleanly. |
| `1` | Server failed to start or encountered a runtime error. |
| `130` | Command interrupted by `Ctrl+C`. |

## Related Commands

- [ideon agent](./ideon-agent.md)
- [ideon config](./ideon-config.md)
- [MCP Servers (For Agents)](../../for-agents/mcp-servers.md)

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- Tool contracts are validated by the integration sync check.
