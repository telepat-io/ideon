---
title: 环境变量
description: 面向 Ideon 使用者与贡献者的环境变量参考文档。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 环境变量

## 密钥

- `IDEON_OPENROUTER_API_KEY`
- `IDEON_REPLICATE_API_TOKEN`
- `IDEON_DISABLE_KEYTAR`（`true` 或 `false`）- 为 `true` 时，Ideon 不会尝试访问系统钥匙串，仅通过环境变量解析密钥

## 模型设置

- `IDEON_MODEL`
- `IDEON_TEMPERATURE`
- `IDEON_MAX_TOKENS`
- `IDEON_TOP_P`
- `IDEON_MODEL_REQUEST_TIMEOUT_MS`

## 输出路径

- `IDEON_MARKDOWN_OUTPUT_DIR`
- `IDEON_ASSET_OUTPUT_DIR`

## 生成风格

- `IDEON_STYLE`
- `IDEON_TARGET_LENGTH`（`small`、`medium`、`large` 或正整数词数）

## 通知

- `IDEON_NOTIFICATIONS_ENABLED`（`true` 或 `false`）

## 示例

```bash
IDEON_OPENROUTER_API_KEY=... \
IDEON_REPLICATE_API_TOKEN=... \
IDEON_DISABLE_KEYTAR=true \
IDEON_MODEL=moonshotai/kimi-k2.5 \
IDEON_TEMPERATURE=0.7 \
IDEON_MAX_TOKENS=2000 \
IDEON_TOP_P=1 \
IDEON_MODEL_REQUEST_TIMEOUT_MS=90000 \
IDEON_NOTIFICATIONS_ENABLED=false \
IDEON_MARKDOWN_OUTPUT_DIR=/output \
IDEON_ASSET_OUTPUT_DIR=/output/assets \
IDEON_STYLE=professional \
IDEON_TARGET_LENGTH=1200 \
ideon write "How teams scale editorial pipelines"
```

## 说明

- 数值型变量会被解析为数字并进行校验。
- `IDEON_TARGET_LENGTH` 支持别名（`small=500`、`medium=900`、`large=1400`）或显式正整数词数。
- 非法数值会在解析阶段被忽略，最终是否接受由 schema 校验决定。
- 在可覆盖的场景中，环境变量优先于已保存设置与作业文件设置。
- 若运行环境无法使用钥匙串服务（例如许多容器环境），请设置 `IDEON_DISABLE_KEYTAR=true`。
- 内容目标（`contentTargets`）不能通过环境变量配置；请使用 CLI `--primary/--secondary` 或作业文件。
