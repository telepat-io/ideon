---
sidebar_position: 1
title: 概览
description: 面向 Ideon 使用者与贡献者的文档概览。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# Ideon 文档

Ideon 是一款 AI 内容写作工具，可将一个原始想法转化为适配多渠道、可发布的内容。

当你需要在多个平台持续产出内容，并保持语气与质量一致时，Ideon 能提供可复用的生产流程。

## Ideon 能做什么

- 基于一个想法生成多种内容类型（article、blog、newsletter、Reddit、LinkedIn、X thread/X post、landing copy）
- 按渠道表达习惯生成内容，并在同一次运行中保持统一写作风格
- 在文章型任务中完成规划、结构化写作与配图生成
- 在启用时对内容进行相关链接增强
- 输出可复用产物（`*.md`、`job.json`、`generation.analytics.json` 与共享资源）

## 为什么有价值

- 降低为不同平台重复改写同一主题的成本
- 提升内容语气和结构的一致性
- 用标准化流程更快从想法走到可发布草稿
- 通过 dry-run、断点恢复和预览机制支持持续优化

## 适用人群

- 希望快速上手 Ideon 的运营与写作者
- 需要将 Ideon 集成到脚本或 CI 流程中的工程师
- 扩展流水线阶段、模型与文档的贡献者

## 快速链接

- [Installation](./installation.md)
- [Quickstart](./quickstart.md)
- [Configuration Guide](../guides/configuration.md)
- [CLI Reference](../reference/cli-reference.md)
- [Technical Architecture](../technical/architecture.md)
- [Contributing](../contributing/development.md)

## 实时运行所需服务

- OpenRouter API key
- Replicate API token

如果你只想测试端到端编排流程，可使用 `--dry-run` 以避免外部 API 调用。
