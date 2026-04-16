---
title: ideon preview [markdownPath]
description: 启动本地预览服务与 React 预览应用，用于查看 Ideon 生成内容。
keywords: [ideon, cli, 预览, 本地服务, react]
image: /img/logo.svg
---

# ideon preview [markdownPath]

## 命令作用

`ideon preview [markdownPath]` 会启动本地预览 API 并提供 React 预览界面，方便你在浏览器中查看生成输出与资源文件。

## 用法

```bash
ideon preview [markdownPath] [--port <port>] [--no-open] [--watch]
```

## 参数与选项

| 参数/选项 | 简写 | 必填 | 类型 | 默认值 | 允许值 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `[markdownPath]` | 无 | 否 | string（路径） | 输出目录中最新生成的 Markdown | 有效的 Markdown 文件路径 | 指定要预览的 Markdown 输出文件。 |
| `--port <port>` | `-p` | 否 | integer | `4173` | 有效 TCP 端口 | 预览服务端口。 |
| `--no-open` | 无 | 否 | boolean | `false` | `true` 或省略 | 启动服务但不自动打开浏览器。 |
| `--watch` | 无 | 否 | boolean | `false` | `true` 或省略 | 监听源码变更，重建预览 UI 并自动刷新浏览器。 |

## 示例

```bash title="最小可用示例"
ideon preview
```

```bash title="常见生产示例"
ideon preview ./output/my-article.md --port 4173 --no-open
```

```bash title="调试开发示例"
ideon preview --watch --no-open
```

## 输出与退出码

成功时，Ideon 会输出预览 URL、选中文章路径与资源目录路径。

| 退出码 | 含义 |
| --- | --- |
| `0` | 预览服务启动成功。 |
| `1` | 因路径无效、端口无效或运行时错误导致预览失败。 |
| `130` | 命令被 `Ctrl+C` 中断。 |

## 相关命令

- [ideon write [idea]](./ideon-write.md)
- [`ideon delete <slug>`](./ideon-delete.md)
- [Local Preview Guide](../../guides/local-preview.md)

## 版本与弃用说明

- 当前行为适用于 Ideon `0.1.6`。
- 此命令没有已弃用参数。
