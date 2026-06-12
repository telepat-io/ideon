---
title: ideon agent
description: 为 Ideon agent 工作流安装、卸载并检查本地运行时集成（技能、MCP 注册与就绪状态）。
keywords: [ideon, cli, agent, 运行时集成, mcp, 技能, pi]
---

# ideon agent

## 命令作用

`ideon agent` 为支持的 coding-agent 宿主配置 Ideon 技能包与 MCP 服务器条目。安装具有**幂等性**：无变更时重复执行不会改写文件。与 Ideon 托管条目冲突时默认跳过并警告；使用 `--force` 可仅覆盖 Ideon 托管条目。

每次安装还会在本地集成存储（Ideon 配置目录下的 `agent-integrations.json`）中记录元数据。

## 用法

```bash
ideon agent install <runtime> [--cli-skill] [--mcp-skill] [--force] [--project] [--dry-run]
ideon agent uninstall <runtime> [--project] [--dry-run]
ideon agent status [--json]
```

### 安装标志

| 标志 | 默认 | 含义 |
| --- | --- | --- |
| *(无)* | CLI 技能模式 | 等同于 `--cli-skill`，安装 `ideon-cli` 技能包 |
| `--cli-skill` | 开启（隐式） | 将 `skill/ideon-cli/` 符号链接或复制到宿主技能目录 |
| `--mcp-skill` | 关闭 | 注册 stdio MCP（`ideon mcp serve`）并安装 `skill/ideon-mcp/` |
| `--force` | 关闭 | 仅替换冲突的 **Ideon 托管** 条目 |
| `--project` | 关闭 | 写入项目作用域路径（当前工作目录）而非用户全局路径 |
| `--dry-run` | 关闭 | 打印计划变更，不写入文件 |

`--cli-skill` 与 `--mcp-skill` 互斥，同时指定会报错。

**例外：** `generic-mcp` 忽略技能标志，仅合并 MCP 配置到 `~/.config/mcp/mcp.json`。

## 支持的 Runtime

| Runtime | CLI 技能（默认） | MCP 技能（`--mcp-skill`） | 说明 |
| --- | --- | --- | --- |
| `pi` | 将 `ideon-cli` 路径写入 Pi `settings.skills` | 安装 `pi-mcp-adapter`、合并 `mcpServers.ideon`、添加 `ideon-mcp` 技能 | MCP 适配器安装需要 `pi` 在 PATH 中 |
| `claude` | 符号链接 `ideon-cli` → `~/.claude/skills/`（或项目 `.claude/skills/`） | `~/.mcp.json` 中的 MCP + `ideon-mcp` 技能 | 可选在 `CLAUDE.md` 中添加有界标记段 |
| `claude-desktop` | 导出 `ideon-cli` 并打印设置步骤 | MCPB 包 `~/.ideon/mcpb/ideon.mcpb` + Desktop 安装步骤 | 不自动写入 Desktop 配置 |
| `chatgpt` | 导出 `ideon-cli` 到 `~/.ideon/exports/chatgpt/` | 导出 `ideon-mcp` + 应用内 MCP 设置步骤 | 无自动化宿主配置文件 |
| `gemini` | 符号链接 `ideon-cli` → `~/.agents/skills/` + 可选 `GEMINI.md` 标记 | `~/.gemini/mcp.json` 中的 MCP + `ideon-mcp` 技能 | |
| `codex` | 符号链接 `ideon-cli` → `~/.agents/skills/` | `~/.codex/config.toml` 中 `[mcp_servers.ideon]` + `ideon-mcp` 技能 | |
| `cursor` | 符号链接 `ideon-cli` → `~/.cursor/skills/`（或项目 `.cursor/skills/`） | `~/.cursor/mcp.json` 中的 MCP + `ideon-mcp` 技能 | |
| `vscode` | 符号链接 `ideon-cli` → `~/.copilot/skills/`（或项目 `.github/skills/`） | `.vscode/mcp.json` 中 `servers.ideon` + `ideon-mcp` 技能 | VS Code 使用 `servers` 键 |
| `opencode` | 符号链接 `ideon-cli` → OpenCode 技能目录 | `opencode.json` 中 `mcp.ideon` + `ideon-mcp` 技能 | |
| `hermes` | 符号链接 `ideon-cli` → `$HERMES_HOME/skills/` | `$HERMES_HOME/config.yaml` 中 `mcp_servers.ideon` + `ideon-mcp` 技能 | 仅全局；遵循 `HERMES_HOME`；MCP 安装后运行 `/reload-mcp` |
| `generic-mcp` | *(无)* | 合并 `ideon` 到 `~/.config/mcp/mcp.json` | 通用 MCP 回退 |

### MCP 服务器条目（stdio）

所有 MCP 注册均使用：

```json
{
  "command": "ideon",
  "args": ["mcp", "serve"]
}
```

宿主特定的包装键不同（`mcpServers`、`servers`、`mcp`、TOML 段等）。

### Pi MCP 桥接

对 `pi` 使用 `--mcp-skill` 时，Ideon 会运行 `pi install npm:pi-mcp-adapter` 并注册 stdio MCP 条目。通过 pi-mcp-adapter 使用**代理模式**（非直接工具注入）。卸载时不会移除适配器。

## 子命令

### ideon agent install

配置宿主并记录集成配置文件。

```bash
ideon agent install pi
ideon agent install cursor --mcp-skill
ideon agent install claude --project
ideon agent install generic-mcp --mcp-skill --dry-run
```

### ideon agent uninstall

移除集成配置文件中记录的 Ideon 托管技能链接与 MCP 条目。不会删除无关的宿主内容。

```bash
ideon agent uninstall pi
ideon agent uninstall cursor --project --dry-run
```

### ideon agent status

输出已安装 runtime、同步检查元数据及按 runtime 的工件验证。

```bash
ideon agent status
ideon agent status --json
```

`--json` 输出包含：

- `installed` — 集成存储中的条目
- `runtimeReports[]` — 每个 runtime 的 `artifacts`、`issues[]` 与 `readiness`（例如 `piBinaryOnPath`、`cliSkillLinked`、`mcpConfigured`）
- 契约数量与配置面就绪状态

## 输出与退出码

| 退出码 | 含义 |
| --- | --- |
| `0` | 命令执行成功。 |
| `1` | 运行时 id 或状态校验失败，或发生运行时错误。 |
| `130` | 命令被 `Ctrl+C` 中断。 |

## 相关命令

- [ideon mcp serve](./ideon-mcp-serve.md)
- [ideon config](./ideon-config.md)
- [Agent Maintenance and Sync](../../for-agents/agent-maintenance-and-sync.md)

## 版本与弃用说明

- 当前行为适用于 Ideon `0.1.41+`。
- 早期版本仅写入集成存储注册表；从 `0.1.41` 起才会实际配置宿主。
- 本命令不安装生命周期钩子（PreToolUse 等）——仅技能与 MCP。
