---
slug: /
title: Ideon 文档
description: 面向 Ideon 用户与贡献者的文档主页。
keywords: [ideon, 文档, cli, 指南, 参考]
sidebar_label: 欢迎
sidebar_position: 0
---

> 面向多渠道发布的 AI 内容写作工具

Ideon 可以将一个想法转化为多份可发布内容，并保持一致风格，还可选生成配图与相关链接增强。

它适合需要跨渠道持续产出内容的团队，减少为不同平台反复改写同一主题的时间成本。

## 为什么选择 Ideon

- 一次想法，生成多种格式：article、blog、newsletter、Reddit、LinkedIn、X thread、X post、landing-page copy。
- 在同一次运行中保持统一写作风格。
- 通过规划 brief、链接增强与文章配图提升内容完整度。
- 借助断点恢复、job 文件与本地预览实现高效迭代。

## 快速开始

```bash
npm i -g @telepat/ideon
ideon write "Why async Rust is worth learning" --primary article=1 --secondary x-thread=2 --secondary x-post=1 --style technical
```

完整安装与凭据配置请查看 [安装](./getting-started/installation.md) 和 [快速开始](./getting-started/quickstart.md)。

## Ideon 会生成什么

- 每次运行一个生成目录（时间戳 + slug）
- 一个或多个 Markdown 输出（`article-1.md`、`x-thread-1.md`、`x-post-1.md` 等）
- 用于复现运行定义的 `job.json`
- 包含阶段与全局指标的 `generation.analytics.json`
- 通过 Replicate T2I 模型渲染的共享图片资源（主目标为 article 时包含文内配图）

## 文档导航

| 模块 | 内容 |
|---|---|
| [快速开始](./getting-started/installation.md) | 安装、配置凭据、完成首次多输出生成 |
| [指南](./guides/configuration.md) | 配置、写作框架、Job 文件、流水线阶段、输出结构 |
| [参考](./reference/cli-reference.md) | CLI 参数、内容目标、风格、环境变量、支持的 T2I 模型 |
| [技术](./technical/architecture.md) | 架构、LLM/图像流水线、测试 |
| [参与贡献](./contributing/development.md) | 开发环境、新增模型/阶段/配置、发布流程 |

## 必需凭据

- **OpenRouter API key**：用于 LLM 调用（规划、文章写作、渠道输出）
- **Replicate API token**：用于图像渲染

可通过 `ideon settings` 交互式保存，或通过环境变量 `IDEON_OPENROUTER_API_KEY` / `IDEON_REPLICATE_API_TOKEN` 提供。

可使用 `--dry-run` 在不触发外部 API 的情况下验证流水线编排。
