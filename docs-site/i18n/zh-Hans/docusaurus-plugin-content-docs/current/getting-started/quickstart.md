---
sidebar_position: 3
title: 快速开始
description: 从零开始完成第一次 Ideon 多输出生成运行。
keywords: [ideon, 快速开始, cli, 内容生成, markdown]
---

# 快速开始

本指南将带你从零完成第一次多输出生成。

## 1. 配置设置与凭据

```bash
ideon settings
```

在设置向导中请配置：

- LLM 模型与模型参数
- T2I 模型与可选输入覆盖项
- 输出目录
- OpenRouter API key
- Replicate API token

## 2. 生成内容输出

```bash
ideon write "How small editorial teams can productionize AI writing" --primary article=1 --secondary x-thread=1 --secondary x-post=1 --style professional
```

当主目标为 article 时，预期阶段如下：

1. Planning Shared Brief
2. Planning Primary Article
3. Writing Sections
4. Expanding Image Prompts
5. Rendering Images
6. Generating Channel Content
7. Enriching Links

如果主目标不是 `article`，Ideon 会改用 `Planning Primary Content` 与 `Generating Primary Content`，渲染一张主封面图后再生成次级输出。

## 3. 检查输出结果

默认情况下（相对于当前工作目录）：

- 生成目录：`output/<timestamp>-<slug>/`
- Markdown 文件：`article-1.md`、`x-thread-1.md`、`x-post-1.md` 等
- 运行元数据：`job.json`
- 运行分析数据：`generation.analytics.json`
- 共享资源：同一生成目录中的图片文件

你可以通过浏览器预览最新生成结果：

```bash
ideon preview
```

预览界面包含生成批次浏览、内容类型标签与变体子标签。

## 4. 先做一次安全 Dry Run

```bash
ideon write --dry-run "How AI changes developer docs workflows"
```

Dry run 会走完整流水线，但跳过 OpenRouter 与 Replicate 调用，同时仍会生成流程产物。

## 5. 使用 Job 文件运行

```bash
ideon write --job ./job.json
```

完整 schema 与示例请查看 [Job 文件](../guides/job-files.md)。

## 下一步

- 查看 [流水线阶段](../guides/pipeline-stages.md) 了解断点与恢复行为。
- 查看 [本地预览](../guides/local-preview.md) 了解结果浏览细节。
- 查看 [故障排查](../guides/troubleshooting.md) 获取恢复路径。
