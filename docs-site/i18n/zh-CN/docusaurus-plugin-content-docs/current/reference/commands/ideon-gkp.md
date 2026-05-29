---
title: ideon gkp
description: 查询 Google Ads Keyword Planner 数据 — 关键词建议、历史指标和预测。
keywords: [ideon, cli, gkp, keyword planner, google ads, keywords, forecast, historical]
---

# ideon gkp

## 功能说明

`ideon gkp` 直接从 CLI 查询 Google Ads Keyword Planner 数据。提供三个子命令，对应 GKP MCP 工具：关键词建议、历史指标和预测数据。

需要通过 `ideon gads login` 或环境变量配置 Google Ads 凭据。

## 用法

```bash
ideon gkp ideas [options]
ideon gkp historical [options]
ideon gkp forecast [options]
```

## 子命令

### ideon gkp ideas

从种子关键词、URL 或网站生成关键词建议。

```bash
ideon gkp ideas --keywords seo,marketing
ideon gkp ideas --keywords seo --country US,GB --language en
ideon gkp ideas --url https://example.com
ideon gkp ideas --keywords seo --url https://example.com --page-size 20
```

| 标志 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--keywords <keywords>` | * | — | 逗号分隔的种子关键词 |
| `--url <url>` | * | — | 用于生成关键词建议的种子 URL |
| `--site <site>` | ** | — | 种子网站域名（与 keywords/url 互斥） |
| `--country <codes>` | 否 | *所有国家* | 逗号分隔的 ISO 3166-1 alpha-2 国家代码 |
| `--language <code>` | 否 | `en` | ISO 639-1 语言代码 |
| `--page-size <n>` | 否 | — | 每页结果数 |
| `--json` | 否 | `false` | 输出机器可读的 JSON 格式 |

\* `--keywords` 和 `--url` 至少需要一个。
\*\* `--site` 不能与 `--keywords` 或 `--url` 组合使用。

### ideon gkp historical

获取一组关键词的历史搜索量和竞争指标。

```bash
ideon gkp historical --keywords seo,marketing
ideon gkp historical --keywords seo --country US --language en
ideon gkp historical --keywords seo --no-include-cpc
```

| 标志 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--keywords <keywords>` | **是** | — | 逗号分隔的查询关键词 |
| `--country <codes>` | 否 | *所有国家* | 逗号分隔的 ISO 国家代码 |
| `--language <code>` | 否 | `en` | ISO 639-1 语言代码 |
| `--include-cpc` / `--no-include-cpc` | 否 | `true` | 在结果中包含平均 CPC |
| `--json` | 否 | `false` | 输出机器可读的 JSON 格式 |

### ideon gkp forecast

获取一组关键词的预测展示次数、点击次数和费用。

```bash
ideon gkp forecast --keywords seo,marketing
ideon gkp forecast --keywords seo --match-type EXACT --country US
ideon gkp forecast --keywords seo --max-cpc-bid 5000000 --start-date 2025-01-01 --end-date 2025-01-31
```

| 标志 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--keywords <keywords>` | **是** | — | 逗号分隔的预测关键词 |
| `--match-type <type>` | 否 | `BROAD` | 关键词匹配类型：`BROAD`、`EXACT` 或 `PHRASE` |
| `--max-cpc-bid <micros>` | 否 | — | 最大 CPC 出价（微元，1 美元 = 1,000,000 微元） |
| `--country <codes>` | 否 | `US` | 逗号分隔的 ISO 国家代码（默认为 US） |
| `--language <code>` | 否 | `en` | ISO 639-1 语言代码 |
| `--start-date <date>` | 否 | 今天 | 预测开始日期（`YYYY-MM-DD`） |
| `--end-date <date>` | 否 | 今天+30 | 预测结束日期（`YYYY-MM-DD`） |
| `--json` | 否 | `false` | 输出机器可读的 JSON 格式 |

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

环境变量优先于系统钥匙串中存储的值。

## 相关命令

- [ideon gads](./ideon-gads.md) — 管理 Google Ads 凭据和 OAuth
- [ideon config](./ideon-config.md) — 非交互式设置单个凭据
- [Google Ads Keyword Planner 设置](../../guides/google-ads-keyword-planner.md) — 完整设置指南

## 版本和弃用说明

- 当前行为适用于 Ideon `0.1.6`。
- `gkp` 命令需要先配置 Google Ads 凭据。使用前请运行 `ideon gads login` 或设置环境变量。
- TTY 输出以美元显示出价；JSON 输出保留原始微元。
