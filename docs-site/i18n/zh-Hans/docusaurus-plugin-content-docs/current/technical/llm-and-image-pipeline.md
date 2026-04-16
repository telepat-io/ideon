---
title: LLM 与图像流水线
description: 面向 Ideon 使用者与贡献者的 LLM 与图像流水线说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# LLM 与图像流水线内部机制

## OpenRouter 客户端行为

OpenRouter 请求策略包括：

- timeout: 45s per attempt
- retries: up to 3 attempts
- retryable status codes: 408, 409, 429, 5xx
- transient network retry handling

结构化请求支持 parse 回调进行运行时校验。

## 计划与提示词校验

Ideon 会校验：

- article plans (`articleSchema` constraints)
- image prompt payloads (`prompt` required)
- run configuration via Zod schema defaults and constraints

提供方返回无效输出时会快速失败，并返回可执行的错误信息。

## 章节规范化

生成文本会进行以下规范化：

- trimming whitespace
- removing markdown fences when present
- rejecting empty output sections

## 提示系统组合

提示词组合采用分层指令：

- shared writing framework (structure, information density, specificity, rhythm, scannability, active voice, storytelling discipline, authenticity filter)
- style overlay (`professional`, `friendly`, `technical`, `academic`, `opinionated`, `storytelling`)
- content-type/channel directives (`article`, `x-thread`, `x-post`, `linkedin-post`, etc.)

文章规划提示还包含自适应说服指引，使规划器可基于受众与目标匹配选择 AIDA、PAS 或 BAB。

在多目标运行中，文章输出可作为社交/渠道输出的锚定上下文。

## 非文章输出路径

- 非文章内容类型通过单次提示生成。
- 该路径在 output 阶段执行，不依赖章节式生成。
- 对于无文章运行，会跳过 planning/sections/image 阶段。

## 图像渲染路径

1. Build image slots from plan (cover + inline)
2. Expand each slot description to final prompt
3. Build Replicate input from model registry and sanitized overrides
4. Execute model and normalize output bytes
5. Write image files and compute markdown-relative paths

## Dry-Run 行为

Dry-run 会绕过提供方调用，但仍覆盖编排逻辑：

- deterministic synthetic plan and sections
- placeholder asset files
- normal markdown assembly
