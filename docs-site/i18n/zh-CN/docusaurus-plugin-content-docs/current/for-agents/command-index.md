---
title: 命令索引
description: 面向机器检索的 Ideon CLI 命令索引及其权威文档页面。
keywords: [ideon, agents, 命令索引, cli, 参考]
---

# 命令索引

## ideon settings

- Path: `/reference/commands/ideon-settings`
- Purpose: 通过交互式流程配置运行参数与凭据。
- Key flags: 无。

## ideon config

- Path: `/reference/commands/ideon-config`
- Purpose: 为自动化与 agent 场景非交互管理 settings 和 secret。
- Key flags: `list --json`, `get --json`, `set`, `unset`.

## ideon write [idea]

- Path: `/reference/commands/ideon-write`
- Purpose: 基于想法或作业文件生成主输出与可选次输出。
- Key flags: `--primary`, `--secondary`, `--job`, `--style`, `--intent`, `--length`, `--no-interactive`, `--dry-run`, `--no-seo-check`, `--seo-check-mode`, `--seo-check-max-turns`, `--enrich-links`, `--link`, `--unlink`, `--max-links`, `--from-queue`.

## ideon queue

- Path: `/reference/commands/ideon-queue`
- Purpose: 管理内容队列，安排未来的文章写作。
- Key flags: `add`, `list --json`, `peek`, `remove --force`, `clear --force`.

## ideon write resume

- Path: `/reference/commands/ideon-write-resume`
- Purpose: 从检查点恢复上一次失败或中断的写作会话。
- Key flags: `--no-interactive`, `--seo-check`, `--seo-check-mode`, `--seo-check-max-turns`, `--enrich-links`, `--link`, `--unlink`, `--max-links`.

## `ideon links <slug>`

- Path: `/reference/commands/ideon-links`
- Purpose: 为已生成的文章按 slug 运行链接增强。
- Key flags: `--mode`, `--link`, `--unlink`, `--max-links`.

## `ideon delete <slug>`

- Path: `/reference/commands/ideon-delete`
- Purpose: 删除已生成的 Markdown 输出及关联 analytics 侧车文件。
- Key flags: `--force`.

## ideon preview [markdownPath]

- Path: `/reference/commands/ideon-preview`
- Purpose: 启动本地预览 UI 与 API 以查看生成输出。
- Key flags: `--port`, `--no-open`, `--watch`.

## ideon mcp serve

- Path: `/reference/commands/ideon-mcp-serve`
- Purpose: 通过 stdio 启动一方维护的 Ideon MCP 服务器。
- Key flags: 无。

## ideon agent

- Path: `/reference/commands/ideon-agent`
- Purpose: 管理本地运行时集成注册与就绪状态检查。
- Key flags: `install --dry-run`, `uninstall --dry-run`, `status --json`.
