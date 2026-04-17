---
title: ideon agent
description: 为 Ideon agent 工作流安装、卸载并查看本地运行时集成注册状态。
keywords: [ideon, cli, agent, 运行时集成, mcp]
---

# ideon agent

## 命令作用

`ideon agent` 用于管理本地运行时集成注册与就绪检查。

## 用法

```bash
ideon agent install <runtime> [--dry-run]
ideon agent uninstall <runtime> [--dry-run]
ideon agent status [--json]
```

## 支持与不支持的 Runtime

支持的 runtime id：

- `claude`
- `chatgpt`
- `gemini`
- `generic-mcp`

明确不支持的 runtime id：

- `cursor`
- `vscode`

## 子命令

### ideon agent install

注册一个 runtime 集成配置。

```bash
ideon agent install claude
ideon agent install generic-mcp --dry-run
```

### ideon agent uninstall

移除一个 runtime 集成配置。

```bash
ideon agent uninstall claude
ideon agent uninstall chatgpt --dry-run
```

### ideon agent status

输出已安装 runtime 与就绪检查信息。

```bash
ideon agent status
ideon agent status --json
```

状态信息包含：

- 已安装 runtime 列表
- integration sync-check 状态
- MCP tool 契约数量
- skill 契约数量
- config surface 就绪状态

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

- 当前行为适用于 Ideon `0.1.6`。
- Runtime 注册具备幂等性，并持久化到本地集成存储文件。
