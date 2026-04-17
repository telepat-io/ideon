---
title: ideon settings
description: 通过交互式设置流程配置并查看 Ideon 参数与凭据。
keywords: [ideon, cli, 设置, keychain, 配置]
---

# ideon settings

## 命令作用

`ideon settings` 会打开交互式设置流程，帮助你查看并更新运行默认值与凭据存储。

对于非交互自动化与 agent 工作流，请使用 [ideon config](./ideon-config.md)。

## 用法

```bash
ideon settings
```

## 参数与选项

| 参数/选项 | 简写 | 必填 | 类型 | 默认值 | 允许值 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 无 | 无 | 否 | n/a | n/a | n/a | 此命令没有参数和选项。 |

## 示例

```bash title="最小可用示例"
ideon settings
```

```bash title="常见生产示例"
IDEON_DISABLE_KEYTAR=true ideon settings
```

```bash title="排障验证示例"
ideon settings && ideon --version
```

## 输出与退出码

设置保存成功后，Ideon 会打印设置文件路径并返回成功退出码。

| 退出码 | 含义 |
| --- | --- |
| `0` | 设置流程执行成功。 |
| `1` | 命令因运行时或校验错误失败。 |
| `130` | 命令被 `Ctrl+C` 中断。 |

## 相关命令

- [ideon config](./ideon-config.md)
- [ideon write [idea]](./ideon-write.md)
- [ideon preview [markdownPath]](./ideon-preview.md)

## 版本与弃用说明

- 当前行为对应 Ideon `0.1.6`。
- 此命令无已弃用参数。
