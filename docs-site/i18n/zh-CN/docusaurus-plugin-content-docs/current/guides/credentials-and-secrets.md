---
title: 凭据与密钥
description: 面向 Ideon 使用者与贡献者的凭据与密钥说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 凭据与密钥

实时生成需要两个提供方凭据。Google Ads 关键词规划师工具需要额外六个凭据。

## 必需密钥

### 核心提供方密钥

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN`

### Google Ads 关键词规划师密钥

以下六个密钥是 `gkp_*` MCP 工具所必需的：

- `googleAdsDeveloperToken` — 来自 Google Ads API Center
- `googleAdsClientId` — 来自 GCP Console 的 OAuth2 客户端 ID
- `googleAdsClientSecret` — 来自 GCP Console 的 OAuth2 客户端密钥
- `googleAdsRefreshToken` — 来自一次性 OAuth2 授权流程
- `googleAdsCustomerId` — Google Ads 账号编号（需配置账单）
- `googleAdsLoginCustomerId` — 管理器（MCC）账号编号（仅当通过管理器账号访问时需要）

详细设置说明请参阅 [Google Ads 关键词规划师设置](./google-ads-keyword-planner.md)。

## 推荐配置方式

使用设置流程将密钥保存到系统钥匙串：

```bash
ideon settings
```

CLI 通过钥匙串集成持久化密钥，而不是明文配置。

对于 Google Ads 密钥，使用 `ideon config set`：

```bash
ideon config set googleAdsDeveloperToken "your-token"
ideon config set googleAdsClientId "your-client-id"
ideon config set googleAdsClientSecret "your-secret"
ideon config set googleAdsRefreshToken "your-refresh-token"
ideon config set googleAdsCustomerId "123-456-7890"
ideon config set googleAdsLoginCustomerId "123-456-7890"  # 仅当需要时
```

## 环境变量替代方案

Bash/zsh:

```bash
export TELEPAT_OPENROUTER_KEY=your_openrouter_key
export TELEPAT_REPLICATE_TOKEN=your_replicate_token
export TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
export TELEPAT_GOOGLE_ADS_CLIENT_ID=your-client-id.apps.googleusercontent.com
export TELEPAT_GOOGLE_ADS_CLIENT_SECRET=your-client-secret
export TELEPAT_GOOGLE_ADS_REFRESH_TOKEN=your-refresh-token
export TELEPAT_GOOGLE_ADS_CUSTOMER_ID=123-456-7890
export TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID=123-456-7890  # 仅当需要时
```

Fish:

```fish
set -x TELEPAT_OPENROUTER_KEY your_openrouter_key
set -x TELEPAT_REPLICATE_TOKEN your_replicate_token
set -x TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN your-developer-token
set -x TELEPAT_GOOGLE_ADS_CLIENT_ID your-client-id.apps.googleusercontent.com
set -x TELEPAT_GOOGLE_ADS_CLIENT_SECRET your-client-secret
set -x TELEPAT_GOOGLE_ADS_REFRESH_TOKEN your-refresh-token
set -x TELEPAT_GOOGLE_ADS_CUSTOMER_ID 123-456-7890
set -x TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID 123-456-7890  # 仅当需要时
```

## 校验行为

在实时模式下若缺少必需密钥，流水线会提前失败并给出明确的阶段级错误。

Google Ads 工具在凭据缺失或无效时会返回包含设置说明的可执行错误消息。

## 安全实践

- 不要在作业文件或仓库配置中提交密钥
- 本地开发优先使用钥匙串存储
- 定期轮换提供方密钥
- OAuth2 刷新令牌无法再次获取 — 请安全保存
