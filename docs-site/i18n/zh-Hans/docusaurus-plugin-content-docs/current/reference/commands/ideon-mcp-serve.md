---
title: ideon mcp serve
description: 通过 stdio 传输启动一方维护的 Ideon Model Context Protocol 服务器。
keywords: [ideon, cli, mcp, stdio, agents]
---

# ideon mcp serve

## 命令作用

`ideon mcp serve` 会通过 stdio 启动 Ideon MCP 服务器，供 MCP 客户端调用 Ideon 工具。

## 用法

```bash
ideon mcp serve
```

## 传输与范围

- 传输：stdio
- 目标场景：本地进程拉起的 MCP 客户端
- 集成范围：CLI/MCP 运行时
- 不支持：Cursor 或 VS Code 集成配置

## 可用工具

- `ideon_write`
- `ideon_write_resume`
- `ideon_delete`
- `ideon_config_get`
- `ideon_config_set`

## 输出与退出码

| 退出码 | 含义 |
| --- | --- |
| `0` | 服务器正常退出。 |
| `1` | 启动失败或运行时错误。 |
| `130` | 命令被 `Ctrl+C` 中断。 |

## 相关命令

- [ideon agent](./ideon-agent.md)
- [ideon config](./ideon-config.md)
- [MCP Servers (For Agents)](../../for-agents/mcp-servers.md)

## 版本与弃用说明

- 当前行为适用于 Ideon `0.1.6`。
- 工具契约由集成同步检查进行验证。
