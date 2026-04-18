---
title: ideon write resume
description: 从本地检查点恢复最近一次失败或中断的写作会话。
keywords: [ideon, cli, resume, 检查点, 写作]
---

# ideon write resume

## 命令作用

`ideon write resume` 会从 `.ideon/write/state.json` 恢复最近一次失败或中断的写作运行。

## 用法

```bash
ideon write resume [--no-interactive] [--enrich-links]
```

## 参数与选项

| 参数/选项 | 简写 | 必填 | 类型 | 默认值 | 允许值 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `--no-interactive` | 无 | 否 | boolean | `false` | `true` 或省略 | 即使在 TTY 中也强制使用纯非交互输出。 |
| `--enrich-links` | 无 | 否 | boolean | `false` | `true` 或省略 | 在 resume 执行期间启用链接增强阶段。 |

## 示例

```bash title="最小可用示例"
ideon write resume
```

```bash title="常见生产示例"
ideon write "Long-form article about API docs" --primary article=1 && ideon write resume
```

```bash title="排障验证示例"
ideon write resume && ideon preview --no-open
```

```bash title="单次执行 agent 安全示例"
ideon write resume --no-interactive
```

## 链接增强

- 链接增强是面向符合条件的长内容 markdown 输出的后处理链接建议流程。
- 它会选取短语、解析来源 URL，并写入 `*.links.json` sidecar 文件，而不会改写 markdown。
- 在 `ideon write resume` 中，只有显式传入 `--enrich-links` 时才会执行链接增强。
- 短内容渠道（如 `x-post`、`x-thread`）会被跳过。

## 输出与退出码

成功时，Ideon 会从最近检查点阶段继续执行，并将最终输出写入对应运行目录。

| 退出码 | 含义 |
| --- | --- |
| `0` | 恢复执行成功。 |
| `1` | 没有可恢复会话，或恢复过程中发生运行时错误。 |
| `130` | 命令被 `Ctrl+C` 中断。 |

## 相关命令

- [ideon write [idea]](./ideon-write.md)
- [ideon preview [markdownPath]](./ideon-preview.md)

## 版本与弃用说明

- 当前行为对应 Ideon `0.1.6`。
- 此命令无已弃用参数。
