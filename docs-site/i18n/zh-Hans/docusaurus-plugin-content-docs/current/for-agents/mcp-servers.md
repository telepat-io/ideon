---
title: MCP 服务器
description: Ideon 当前 MCP 服务器状态，以及未来 MCP 文档面的编写指引。
keywords: [ideon, agents, mcp, 协议, 集成]
---

# MCP 服务器

Ideon 已发布一方维护的 Model Context Protocol 服务器（stdio 传输）。

## 当前状态

- 入口命令：`ideon mcp serve`
- 传输：stdio
- 目标场景：本地进程拉起的 MCP 客户端
- 当前工具集：
	- `ideon_write`
	- `ideon_write_resume`
	- `ideon_delete`
	- `ideon_config_get`
	- `ideon_config_set`

## 契约说明

- 工具契约必须与 CLI 行为和 skill 元数据保持同步。
- 契约一致性通过 lint 中的 integration sync 校验保障。
- 工具处理器错误会以 MCP 工具错误形式返回可执行信息。

## 维护策略

强制同改规则与评审清单见：

- [Agent Maintenance and Sync](./agent-maintenance-and-sync.md)
