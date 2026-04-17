---
title: ideon config
description: 为自动化与单次执行 agent 工作流非交互管理 Ideon settings 与 secret。
keywords: [ideon, cli, config, 自动化, 非交互]
---

# ideon config

## 命令作用

`ideon config` 提供面向脚本、CI 与 agent 的非交互配置接口。

它与 `ideon settings` 互补：后者保持交互式。

## 用法

```bash
ideon config list [--json]
ideon config get <key> [--json]
ideon config set <key> <value>
ideon config unset <key>
```

## 子命令

### ideon config list

列出当前持久化 settings 与 secret 可用性状态。

```bash
ideon config list
ideon config list --json
```

### ideon config get

读取单个 setting key 或 secret 可用性 key。

```bash
ideon config get style
ideon config get openRouterApiKey --json
```

### ideon config set

设置单个 setting 或 secret 值。

```bash
ideon config set style technical
ideon config set openRouterApiKey "$IDEON_OPENROUTER_API_KEY"
```

### ideon config unset

将 setting 恢复默认值，或移除已存储 secret。

```bash
ideon config unset style
ideon config unset openRouterApiKey
```

## 支持的 Key

Settings keys:

- `model`
- `modelSettings.temperature`
- `modelSettings.maxTokens`
- `modelSettings.topP`
- `modelRequestTimeoutMs`
- `notifications.enabled`
- `markdownOutputDir`
- `assetOutputDir`
- `style`
- `targetLength`

Secret keys:

- `openRouterApiKey`
- `replicateApiToken`

## 输出与退出码

| 退出码 | 含义 |
| --- | --- |
| `0` | 命令执行成功。 |
| `1` | 出现校验、key 或存储错误。 |
| `130` | 命令被 `Ctrl+C` 中断。 |

## 相关命令

- [ideon settings](./ideon-settings.md)
- [ideon write [idea]](./ideon-write.md)
- [环境变量](../environment-variables.md)

## 版本与弃用说明

- 当前行为适用于 Ideon `0.1.6`。
- 此命令组面向非交互 one-shot 工作流。
