---
title: ideon gads
description: 管理 Google Ads 集成凭据、OAuth 授权和连接验证。
keywords: [ideon, cli, gads, google ads, oauth, credentials, keyword planner]
---

# ideon gads

## 功能说明

`ideon gads` 管理 Google Ads 集成凭据、OAuth 授权流程和 Keyword Planner API 工具的连接验证。

## 用法

```bash
ideon gads login [options]
ideon gads logout [options]
ideon gads status [options]
ideon gads test
```

## 子命令

### ideon gads login

启动交互式 OAuth 流程，获取 Google Ads 令牌并保存所有必需凭据。

```bash
ideon gads login
ideon gads login --force
ideon gads login --developer-token <token> --client-id <id> --client-secret <secret> --customer-id <id>
```

收集以下凭据（交互式或通过标志）：

| 标志 | 必需 | 说明 |
| --- | --- | --- |
| `--developer-token <token>` | 是 | Google Ads API 开发者令牌 |
| `--client-id <id>` | 是 | GCP 中的 OAuth2 客户端 ID |
| `--client-secret <secret>` | 是 | GCP 中的 OAuth2 客户端密钥 |
| `--customer-id <id>` | 是 | Google Ads 客户 ID（10 位数字，可省略连字符） |
| `--login-customer-id <id>` | 否 | 管理员帐户客户 ID（仅限 MCC，仅限标志，不提示输入） |
| `--force` | 否 | 即使已存在刷新令牌也重新授权 |

凭据在输入时逐步保存。如果 OAuth 流程中途失败，之前输入的凭据会被保留。

OAuth 流程会打开浏览器窗口进行 Google 同意。如果浏览器无法打开，则会打印授权 URL 供手动使用。

### ideon gads logout

清除存储的 Google Ads 凭据。

```bash
ideon gads logout
ideon gads logout --all
```

| 标志 | 说明 |
| --- | --- |
| `--all` | 清除所有 6 个 Google Ads 凭据，而不仅仅是刷新令牌 |

不使用 `--all` 时，仅清除刷新令牌，允许通过 `gads login` 重新授权而无需重新输入其他凭据。

### ideon gads status

显示已配置的 Google Ads 凭据及其来源。

```bash
ideon gads status
ideon gads status --json
```

| 标志 | 说明 |
| --- | --- |
| `--json` | 输出机器可读的 JSON 格式 |

### ideon gads test

通过发出测试 API 调用来验证 Google Ads 凭据。

```bash
ideon gads test
```

使用单个关键词进行轻量级 `generateKeywordIdeas` 调用，以验证完整的凭据链是否正常工作（令牌刷新、API 头信息、客户 ID）。

## 退出码

| 退出码 | 含义 |
| --- | --- |
| `0` | 命令成功完成。 |
| `1` | 验证失败、凭据无效或发生运行时错误。 |
| `130` | 命令被 `Ctrl+C` 中断。 |

## 环境变量

所有 Google Ads 凭据也可以通过环境变量设置：

| 变量 | 说明 |
| --- | --- |
| `TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN` | 开发者令牌 |
| `TELEPAT_GOOGLE_ADS_CLIENT_ID` | OAuth2 客户端 ID |
| `TELEPAT_GOOGLE_ADS_CLIENT_SECRET` | OAuth2 客户端密钥 |
| `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` | OAuth2 刷新令牌 |
| `TELEPAT_GOOGLE_ADS_CUSTOMER_ID` | 客户 ID |
| `TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID` | 管理员帐户 ID（可选） |

环境变量优先于系统钥匙串中存储的值。在 CI/CD 或无 keytar 的无头环境中，请使用环境变量——它们完全绕过钥匙串。

## 存储行为

`gads login` 和 `ideon config set` 将凭据存储在**系统钥匙串**中，通过 `keytar` 模块（macOS 钥匙串、Linux Secret Service、Windows 凭据管理器）。这不是环境变量存储。

| 环境 | `gads login` | `config set` | 环境变量 |
| --- | --- | --- | --- |
| 交互式 + keytar | 钥匙串 | 钥匙串 | 不适用 |
| 交互式，无 keytar | 失败 | 失败 | 正常工作 |
| CI/CD（无 TTY） | 失败 | 正常工作 | 正常工作 |

对于无头环境，请在 CI 配置中直接设置 `TELEPAT_GOOGLE_ADS_*` 变量。

## 相关命令

- [ideon config](./ideon-config.md) — 非交互式设置单个凭据
- [Google Ads Keyword Planner 设置](../../guides/google-ads-keyword-planner.md) — 完整设置指南

## 版本和弃用说明

- 当前行为适用于 Ideon `0.1.6`。
- `gads login` 命令需要交互式终端（TTY）。对于 CI/CD 环境，请使用环境变量或 `ideon config set`。
- OAuth 令牌存储在系统钥匙串中（macOS 钥匙串、Linux Secret Service、Windows 凭据管理器），通过 `keytar` 模块。
