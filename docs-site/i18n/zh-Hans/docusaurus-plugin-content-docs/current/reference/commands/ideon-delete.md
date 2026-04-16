---
title: ideon delete <slug>
description: 通过 slug 删除已生成的 Markdown 输出，并安全处理共享资源。
keywords: [ideon, cli, 删除, 清理, 输出]
---

# `ideon delete <slug>`

## 命令作用

`ideon delete <slug>` 会删除一个已生成的 Markdown 输出及其 analytics 侧车文件；仅当不存在同级 Markdown 输出时，才会删除对应生成资源目录。

## 用法

```bash
ideon delete <slug> [--force]
```

## 参数与选项

| 参数/选项 | 简写 | 必填 | 类型 | 默认值 | 允许值 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `<slug>` | 无 | 是 | string | n/a | 不带 `.md` 的已生成文章 slug | 要删除的已生成输出 slug。 |
| `--force` | `-f` | 否 | boolean | `false` | `true` 或省略 | 跳过交互式删除确认。 |

## 示例

```bash title="最小可用示例"
ideon delete my-article-slug
```

```bash title="常见生产示例"
ideon delete my-article-slug --force
```

```bash title="安全与排障示例"
ideon delete my-article-slug --force && ideon preview --no-open
```

## 输出与退出码

成功时，Ideon 会输出已删除路径与清理详情。

| 退出码 | 含义 |
| --- | --- |
| `0` | 删除成功完成。 |
| `1` | 因 slug 不存在、权限问题或运行时错误导致删除失败。 |
| `130` | 命令被 `Ctrl+C` 中断。 |

## 相关命令

- [ideon write [idea]](./ideon-write.md)
- [ideon preview [markdownPath]](./ideon-preview.md)

## 版本与弃用说明

- 当前行为适用于 Ideon `0.1.6`。
- 此命令没有已弃用参数。
