---
title: ideon agent
description: Install, uninstall, and inspect local agent runtime integrations — skills, MCP registration, and readiness checks for supported hosts.
keywords: [ideon, cli, agent, runtime integration, mcp, skills, pi]
---

# ideon agent

## What This Command Does

`ideon agent` configures supported coding-agent hosts with Ideon skills and MCP server entries. Install is **idempotent**: re-running without changes is a no-op. Conflicting Ideon-managed entries are skipped with a warning unless `--force` is passed.

Each install also records metadata in the local integration store (`agent-integrations.json` under the Ideon config directory).

## Usage

```bash
ideon agent install <runtime> [--cli-skill] [--mcp-skill] [--force] [--project] [--dry-run]
ideon agent uninstall <runtime> [--project] [--dry-run]
ideon agent status [--json]
```

### Install flags

| Flag | Default | Meaning |
| --- | --- | --- |
| *(none)* | CLI skill mode | Same as `--cli-skill` — installs the `ideon-cli` skill package |
| `--cli-skill` | on (implicit) | Symlink or copy `skill/ideon-cli/` into the host skill directory |
| `--mcp-skill` | off | Register stdio MCP (`ideon mcp serve`) and install `skill/ideon-mcp/` |
| `--force` | off | Replace conflicting **Ideon-managed** entries only |
| `--project` | off | Write project-scoped paths (current working directory) instead of user-global paths |
| `--dry-run` | off | Print planned mutations without writing files |

`--cli-skill` and `--mcp-skill` are mutually exclusive. Passing both returns an error.

**Exception:** `generic-mcp` ignores skill flags and only merges MCP config into `~/.config/mcp/mcp.json`.

## Supported Runtimes

| Runtime | CLI skill (default) | MCP skill (`--mcp-skill`) | Notes |
| --- | --- | --- | --- |
| `pi` | Adds `ideon-cli` path to Pi `settings.skills` | Installs `pi-mcp-adapter`, merges `mcpServers.ideon`, adds `ideon-mcp` skill | Requires `pi` on PATH for MCP adapter install |
| `claude` | Symlink `ideon-cli` → `~/.claude/skills/` (or project `.claude/skills/`) | MCP in `~/.mcp.json` + `ideon-mcp` skill | Optional bounded marker in `CLAUDE.md` |
| `claude-desktop` | Export `ideon-cli` + setup steps | MCPB bundle at `~/.ideon/mcpb/ideon.mcpb` + Desktop install steps | No automatic Desktop config write |
| `chatgpt` | Export `ideon-cli` to `~/.ideon/exports/chatgpt/` | Export `ideon-mcp` + in-app MCP setup steps | No automatable host config file |
| `gemini` | Symlink `ideon-cli` → `~/.agents/skills/` + optional `GEMINI.md` marker | MCP in `~/.gemini/mcp.json` + `ideon-mcp` skill | |
| `codex` | Symlink `ideon-cli` → `~/.agents/skills/` | TOML section `[mcp_servers.ideon]` in `~/.codex/config.toml` + `ideon-mcp` skill | |
| `cursor` | Symlink `ideon-cli` → `~/.cursor/skills/` (or project `.cursor/skills/`) | MCP in `~/.cursor/mcp.json` + `ideon-mcp` skill | |
| `vscode` | Symlink `ideon-cli` → `~/.copilot/skills/` (or project `.github/skills/`) | MCP in `.vscode/mcp.json` under `servers.ideon` + `ideon-mcp` skill | VS Code uses `servers` key |
| `opencode` | Symlink `ideon-cli` → OpenCode skills dir | MCP under `mcp.ideon` in `opencode.json` + `ideon-mcp` skill | |
| `hermes` | Symlink `ideon-cli` → `$HERMES_HOME/skills/` | MCP in `$HERMES_HOME/config.yaml` under `mcp_servers.ideon` + `ideon-mcp` skill | Global only; respects `HERMES_HOME`; run `/reload-mcp` after MCP install |
| `generic-mcp` | *(none)* | Merge `ideon` into `~/.config/mcp/mcp.json` | Host-agnostic MCP fallback |

### MCP server entry (stdio)

All MCP registrations use:

```json
{
  "command": "ideon",
  "args": ["mcp", "serve"]
}
```

Host-specific wrapper keys differ (`mcpServers`, `servers`, `mcp`, TOML section, etc.).

### Pi MCP bridge

For `--mcp-skill` on `pi`, Ideon runs `pi install npm:pi-mcp-adapter` and registers the stdio MCP entry. Use **proxy mode** via pi-mcp-adapter (not direct tool injection). The adapter remains installed on uninstall.

## Subcommands

### ideon agent install

Configures the host and records the integration profile.

```bash
ideon agent install pi
ideon agent install cursor --mcp-skill
ideon agent install claude --project
ideon agent install generic-mcp --mcp-skill --dry-run
```

### ideon agent uninstall

Removes Ideon-managed skill links and MCP entries recorded in the integration profile. Does not remove unrelated host content.

```bash
ideon agent uninstall pi
ideon agent uninstall cursor --project --dry-run
```

### ideon agent status

Prints installed runtimes, sync-check metadata, and per-runtime artifact verification.

```bash
ideon agent status
ideon agent status --json
```

`--json` output includes:

- `installed` — entries from the integration store
- `runtimeReports[]` — per-runtime `artifacts`, `issues[]`, and `readiness` (for example `piBinaryOnPath`, `cliSkillLinked`, `mcpConfigured`)
- contract counts and config surface readiness

## Output and Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | Command completed successfully. |
| `1` | Runtime id or state validation failed, or a runtime error occurred. |
| `130` | Command interrupted by `Ctrl+C`. |

## Related Commands

- [ideon mcp serve](./ideon-mcp-serve.md)
- [ideon config](./ideon-config.md)
- [Agent Maintenance and Sync](../../for-agents/agent-maintenance-and-sync.md)

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.41+`.
- Prior releases only wrote the integration store registry; host configuration is performed starting in `0.1.41`.
- Lifecycle hooks (PreToolUse, etc.) are not installed by this command — skills and MCP only.
