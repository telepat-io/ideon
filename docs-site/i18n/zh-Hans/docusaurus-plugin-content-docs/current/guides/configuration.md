---
title: 配置
description: 说明 Ideon 的配置来源、优先级与字段行为。
keywords: [ideon, 配置, cli, 环境变量, 指南]
---

# 配置

Ideon 会从多个来源合并配置，并在执行前完成校验。

## 优先级规则

从低到高的优先级如下：

1. Saved settings file
2. Job file settings
3. Environment variables
4. Direct CLI arguments (`--style`, `--primary`, `--secondary`, idea input)

密钥优先级：

- 环境变量中的 `IDEON_OPENROUTER_API_KEY` 与 `IDEON_REPLICATE_API_TOKEN` 会覆盖钥匙串中的值。
- 若环境变量未设置，Ideon 会尝试读取通过 `ideon settings` 保存的钥匙串值。
- 密钥功能（`keytar`）仅在需要读写密钥时按需懒加载。
- 若钥匙串不可用（例如容器中无 D-Bus），Ideon 会回退到环境变量。
- 在容器或 CI 环境中，可设置 `IDEON_DISABLE_KEYTAR=true` 完全跳过钥匙串访问。

按字段的合并行为：

- `modelSettings` 会按键合并（`temperature`、`maxTokens`、`topP`）。
- `contentTargets` 在高优先级来源提供时会整体替换。
- 标量设置（如 `model`、`style`、`targetLength`、`markdownOutputDir`）采用最高优先级来源。

## 设置字段

核心设置包括：

- `model`: LLM model identifier
- `modelSettings.temperature`: 0..2
- `modelSettings.maxTokens`: positive integer
- `modelSettings.topP`: 0..1
- `modelRequestTimeoutMs`: positive integer request timeout in milliseconds (default `90000`)
- `t2i.modelId`: selected text-to-image model
- `t2i.inputOverrides`: model-specific user overrides
- `notifications.enabled`: toggles OS notifications for write lifecycle updates
- `markdownOutputDir`
- `assetOutputDir`
- `contentTargets`: array of output targets with per-type counts
- `style`: run-level writing style
- `targetLength`：运行级目标词数（正整数）。输入时支持别名：`small=500`、`medium=900`、`large=1400`。

`contentTargets` entries:

- `contentType`: one of `article`, `blog-post`, `x-thread`, `x-post`, `reddit-post`, `linkedin-post`, `newsletter`, `landing-page-copy`
- `role`: `primary` or `secondary`
- `count`: positive integer

Rules:

- `contentTargets` 必须且仅能有一个 `role=primary`。
- 主目标数量必须是 `1`。
- 次级目标可选，数量可大于 `1`。

风格可选值：

- `professional`
- `friendly`
- `technical`
- `academic`
- `opinionated`
- `storytelling`

默认值：

- `contentTargets`: `[ { "contentType": "article", "role": "primary", "count": 1 } ]`
- `style`: `professional`
- `targetLength`: `900`

篇幅别名：

- `small`：`500` 词
- `medium`：`900` 词（默认）
- `large`：`1400` 词

## 已保存设置位置

设置通过系统配置路径保存（使用 `env-paths`），例如：

- macOS: `~/.ideon/settings.json`

如需修改已保存设置，请再次运行 `ideon settings`。推荐通过向导更新参数与凭据。

## 环境变量覆盖示例

```bash
IDEON_MODEL=openai/gpt-4.1-mini \
IDEON_TEMPERATURE=0.6 \
IDEON_MAX_TOKENS=2400 \
IDEON_STYLE=technical \
IDEON_TARGET_LENGTH=1200 \
ideon write "An idea"
```

注意：当前不能通过环境变量配置 `contentTargets` 数组。请使用 CLI 的 `--primary/--secondary` 或 Job 文件中的 `settings.contentTargets`。

完整列表请查看 [环境变量](../reference/environment-variables.md)。
