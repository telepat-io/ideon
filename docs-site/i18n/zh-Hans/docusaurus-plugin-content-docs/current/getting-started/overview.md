---
sidebar_position: 1
title: 概览
description: 面向 Ideon 使用者与贡献者的文档概览。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# Ideon 文档

Ideon 可帮助你将一个原始想法转化为一次完整的生成任务，产出适配不同渠道的内容，并可选生成配图。

## Ideon 能做什么

- 当请求文章输出时，规划文章结构与编辑角度
- 为文章输出生成导语、章节与结论草稿
- 使用渠道原生提示生成非文章输出（X/LinkedIn/Reddit/newsletter/landing/blog）
- 在同一次生成任务中为所有输出统一叠加写作风格
- 为启用文章的生成任务扩展图像描述，并渲染封面图/内嵌图
- 写出生成产物（Markdown 文件、`job.json`、`generation.analytics.json`、共享资源）

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
