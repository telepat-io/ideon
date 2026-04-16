---
sidebar_position: 1
title: 文档导览
description: 面向 Ideon 使用者与贡献者的文档导览页面。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 文档导览

本套文档涵盖如何运行、配置并扩展 Ideon 这一多输出内容生成 CLI。

## 从这里开始

- 新用户配置：[快速开始](./getting-started/installation.md)
- 首次运行指引：[快速上手](./getting-started/quickstart.md)
- CLI 参数与选项：[CLI 参考](./reference/cli-reference.md)

## 核心概念

- 内容目标：每次运行必须且仅能选择一个主输出类型，并可附带多个次输出类型
- 风格叠加：同一次运行中的所有输出共享同一个运行级风格
- 生成目录：每次运行会写入 Markdown 输出、共享资源、`job.json` 与 `generation.analytics.json`
- 条件阶段：主输出为 article 时走结构化文章流程；主输出为非 article 时走通用主输出流程并生成一张封面图

## 推荐阅读顺序

1. [Installation](./getting-started/installation.md)
2. [Quickstart](./getting-started/quickstart.md)
3. [Configuration](./guides/configuration.md)
4. [Pipeline Stages](./guides/pipeline-stages.md)
5. [CLI Reference](./reference/cli-reference.md)

## 常见工作流

- 配置设置与凭据：`ideon settings`
- 生成内容：`ideon write "your idea" --primary article=1 --secondary x-thread=1 --secondary x-post=1 --style technical`
- 预览输出：`ideon preview`
- 恢复失败/中断的运行：`ideon write resume`

有关模型与运行成本，请参阅 [性能与成本](./guides/performance-and-costs.md)。
