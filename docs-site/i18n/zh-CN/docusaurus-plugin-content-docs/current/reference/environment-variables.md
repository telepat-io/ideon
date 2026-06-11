---
title: 环境变量
description: 面向 Ideon 使用者与贡献者的环境变量参考文档。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 环境变量

## 密钥

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN`
- `TELEPAT_DISABLE_KEYTAR`（`true` 或 `false`）- 为 `true` 时，Ideon 不会尝试访问系统钥匙串，仅通过环境变量解析密钥

### Google Ads 关键词规划师密钥

- `TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN` — 来自 Google Ads API Center
- `TELEPAT_GOOGLE_ADS_CLIENT_ID` — 来自 GCP 控制台的 OAuth2 客户端 ID
- `TELEPAT_GOOGLE_ADS_CLIENT_SECRET` — 来自 GCP 控制台的 OAuth2 客户端密钥
- `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` — 来自一次性 OAuth2 授权流程
- `TELEPAT_GOOGLE_ADS_CUSTOMER_ID` — Google Ads 账号编号（需配置账单）
- `TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID` — 管理员 (MCC) 账号编号（仅通过管理员账号访问时需要）
- `TELEPAT_IDEON_GADS_REDIRECT_URL` — 完整的公开 OAuth 回调 URL（例如 `http://ideon.localhost:8080/callback` 或 `https://ideon.telepat.dev/callback`）。必须与 GCP **已授权的重定向 URI** 完全一致。未设置时，Ideon 回退到桌面 OAuth：`http://localhost:9876/callback`。

详细 Google Ads 设置说明请参阅 [Google Ads 关键词规划师设置](../guides/google-ads-keyword-planner.md)。

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
- `IDEON_INTENT`
- `IDEON_TARGET_LENGTH`（`small`、`medium`、`large` 或正整数词数）

## 通知

- `IDEON_NOTIFICATIONS_ENABLED`（`true` 或 `false`）

## 示例

```bash
TELEPAT_OPENROUTER_KEY=... \
TELEPAT_REPLICATE_TOKEN=... \
TELEPAT_DISABLE_KEYTAR=true \
IDEON_MODEL=deepseek/deepseek-v4-pro \
IDEON_TEMPERATURE=0.7 \
IDEON_MAX_TOKENS=2000 \
IDEON_TOP_P=1 \
IDEON_MODEL_REQUEST_TIMEOUT_MS=90000 \
IDEON_NOTIFICATIONS_ENABLED=false \
IDEON_MARKDOWN_OUTPUT_DIR=/output \
IDEON_ASSET_OUTPUT_DIR=/output/assets \
IDEON_STYLE=professional \
IDEON_INTENT=tutorial \
IDEON_TARGET_LENGTH=1200 \
ideon write "How teams scale editorial pipelines"
```

## 说明

- 数值型变量会被解析为数字并进行校验。
- `IDEON_TARGET_LENGTH` 支持别名（`small=500`、`medium=900`、`large=1400`）或显式正整数词数。
- 非法数值会在解析阶段被忽略，最终是否接受由 schema 校验决定。
- 在可覆盖的场景中，环境变量优先于已保存设置与作业文件设置。
- 若运行环境无法使用钥匙串服务（例如许多容器环境），请设置 `TELEPAT_DISABLE_KEYTAR=true`。
- 内容目标（`contentTargets`）不能通过环境变量配置；请使用 CLI `--primary/--secondary` 或作业文件。
