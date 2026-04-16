---
title: CLI 参考
description: Ideon 命令行完整参考，包括命令页、参数示例与退出码说明。
keywords: [cli, ideon, 命令, 参考, 自动化]
---

# CLI 参考

本页是 Ideon 命令文档索引。

## 全局命令

```bash
ideon --help
ideon --version
```

## 命令页

- [ideon settings](./commands/ideon-settings.md)
- [ideon write [idea]](./commands/ideon-write.md)
- [ideon write resume](./commands/ideon-write-resume.md)
- [`ideon delete <slug>`](./commands/ideon-delete.md)
- [ideon preview [markdownPath]](./commands/ideon-preview.md)

## 常见退出码

| 退出码 | 含义 |
| --- | --- |
| `0` | 命令执行成功。 |
| `1` | 命令执行失败（参数校验、运行时或依赖错误）。 |
| `130` | 命令被 `Ctrl+C`（SIGINT）中断。 |

## 相关参考

- [环境变量](./environment-variables.md)
- [内容类型](./content-types.md)
- [T2I 模型](./t2i-models.md)
- [配置指南](../guides/configuration.md)

## 版本说明

- 本文档对应 Ideon CLI 版本 `0.1.6`。
- 已弃用的 `--target` 语法已替换为 `--primary` 与可重复的 `--secondary`。
