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
	- `ideon_links`
	- `ideon_config_get`
	- `ideon_config_set`
	- `ideon_config_list`
	- `ideon_config_unset`
	- `gkp_generate_ideas`
	- `gkp_get_historical_data`
	- `gkp_get_forecast_data`
	- `ideon_preview`
	- `ideon_author_add`、`ideon_author_list`、`ideon_author_edit`、`ideon_author_remove`
	- （以及出版物、系列、队列、规划、导出等工具 — 见英文版 [MCP Servers](/ideon/for-agents/mcp-servers)）

SEO 检查作为流水线第 4 阶段在 `ideon_write` / `ideon_write_resume` 中运行——没有独立的 SEO MCP 工具。`ideon_write` 可选参数：`author`（作者 slug）、`experienceNotes`（运行轶事）、`noSeoCheck`、`seoCheckMode`（`errors-only` | `strict`）、`seoCheckMaxTurns`（1–20）；`ideon_write_resume` 可选参数：`seoCheck`（强制重跑）、`seoCheckMode`、`seoCheckMaxTurns`。结果写入 `meta.json`（`seoCheck`、`author`、`editorialChecklist`）。成功运行后工具响应包含编辑清单摘要。

### 预览

- `ideon_preview` — 启动、停止或查询本地预览服务器状态

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `action` | 枚举 | 是 | — | `start`、`stop` 或 `status` |
| `port` | 整数 | 否 | `4173` | 预览服务器端口（仅 start） |
| `markdownPath` | 字符串 | 否 | 最新生成的 markdown | 要预览的 markdown 文件（仅 start） |

状态仅反映当前 MCP 进程启动的预览服务器。通过 `ideon preview` 单独启动的服务器不会被跟踪。

## Google 关键词规划师工具

三个 `gkp_*` 工具提供来自 Google Ads 关键词规划师的真实关键词数据。使用前需要配置六个 Google Ads 凭据。

设置说明请参阅 [Google Ads 关键词规划师设置](../guides/google-ads-keyword-planner.md)。

## 契约说明

- 工具契约必须与 CLI 行为和 skill 元数据保持同步。
- 契约一致性通过 lint 中的 integration sync 校验保障。
- 工具处理器错误会以 MCP 工具错误形式返回可执行信息。

## 维护策略

强制同改规则与评审清单见：

- [Agent Maintenance and Sync](./agent-maintenance-and-sync.md)
