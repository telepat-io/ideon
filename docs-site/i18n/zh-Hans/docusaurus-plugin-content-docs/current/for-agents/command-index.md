---
title: 命令索引
description: 面向机器检索的 Ideon CLI 命令索引及其权威文档页面。
keywords: [ideon, agents, 命令索引, cli, 参考]
---

# 命令索引

## ideon settings

- Path: `/reference/commands/ideon-settings`
- Purpose: 配置运行参数与凭据。
- Key flags: 无。

## ideon write [idea]

- Path: `/reference/commands/ideon-write`
- Purpose: 基于想法或作业文件生成主输出与可选次输出。
- Key flags: `--primary`, `--secondary`, `--job`, `--style`, `--length`, `--dry-run`, `--no-enrich-links`.

## ideon write resume

- Path: `/reference/commands/ideon-write-resume`
- Purpose: 从检查点恢复上一次失败或中断的写作会话。
- Key flags: 无。

## `ideon delete <slug>`

- Path: `/reference/commands/ideon-delete`
- Purpose: 删除已生成的 Markdown 输出及关联 analytics 侧车文件。
- Key flags: `--force`.

## ideon preview [markdownPath]

- Path: `/reference/commands/ideon-preview`
- Purpose: 启动本地预览 UI 与 API 以查看生成输出。
- Key flags: `--port`, `--no-open`, `--watch`.
