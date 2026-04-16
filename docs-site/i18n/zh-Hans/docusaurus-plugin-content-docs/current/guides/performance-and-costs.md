---
title: 性能与成本
description: 面向 Ideon 使用者与贡献者的性能与成本说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 性能与成本

使用本指南在输出质量、运行时长与提供方成本之间取得平衡。

## 成本驱动因素

主要因素：

- Number of requested outputs (`contentTargets` counts)
- Model choice for text and image generation
- Retries caused by transient provider failures
- Higher token budgets (`maxTokens`) for long outputs

你可以在 `generation.analytics.json` 中查看每次运行总量。

## 运行时驱动因素

主要因素：

- Total output count and mix of content types
- Primary content type (`article` primary uses structured flow; non-article primary uses generic flow)
- Image model speed and retry behavior
- Network latency and provider backoff windows

主输出为 article 时执行结构化文章阶段；主输出为非 article 时执行通用主输出阶段，并仍渲染一张主封面图。

## 成本控制模式

1. 先用 dry-run 验证：

```bash
ideon write --dry-run "Your idea" --primary article=1 --secondary x-thread=1 --secondary x-post=1
```

2. 先少量变体，再逐步扩展：

```bash
ideon write "Your idea" --primary article=1 --secondary x-post=1
```

3. 使用作业文件进行可复现实验，一次只调整一个变量。

4. 探索阶段优先更快模型，最终阶段再切换到高质量模型。

## 运行时控制模式

1. 在早期迭代中控制 `contentTargets` 数量。
2. 仅在确实需要线程结构时使用 `x-thread`。
3. 中断后优先 resume，而不是从头开始：

```bash
ideon write resume
```

4. 若某一阶段反复失败，先参考 [故障排查](./troubleshooting.md) 诊断，再增加目标数量。

## 实操流程

1. 先执行 dry-run，确认编排与输出。
2. 执行低数量实时生成。
3. 检查 Markdown 质量与 `generation.analytics.json`。
4. 增加数量或切换模型。
5. 保存解析后的 `job.json`，用于后续可复现实验。

## 相关指南

- [Configuration](./configuration.md)
- [Job Files](./job-files.md)
- [Pipeline Stages](./pipeline-stages.md)
- [T2I Models](../reference/t2i-models.md)
