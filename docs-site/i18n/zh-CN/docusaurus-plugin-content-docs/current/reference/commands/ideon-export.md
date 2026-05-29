---
title: "ideon export <generationId> <path>"
description: 将已生成的文章导出为带内联链接和已复制图片的独立 Markdown 文件。
keywords: [ideon, cli, export, 内联链接, 图片]
---

# `ideon export <generationId> <path>`

## 命令作用

`ideon export` 将已生成的文章组装为**独立、可移植的 Markdown 文件**，具体步骤如下：

1. 从生成目录读取源 Markdown。
2. 加载其 `.links.json` sidecar（包括 `customLinks` 和 `links`），并将链接内联注入正文。
3. 将所有本地引用的图片复制到目标目录，保留其相对子路径结构。
4. 将增强后的 Markdown 写入 `<path>/<slug>.md`。

原始生成目录和 sidecar 文件保持不变。

## 用法

```bash
ideon export <generationId> <path> [--index <n>] [--overwrite]
```

## 参数与选项

| 参数/选项 | 必填 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `<generationId>` | 是 | string | n/a | 生成目录 ID（如 `20260418-185448-my-article`）或文章 frontmatter 中的 `slug`。 |
| `<path>` | 是 | string | n/a | 导出文件和图片的目标**目录**，不存在时自动创建。 |
| `--index <n>` | 否 | 正整数 | `1` | 当一次生成产生多个文章变体时，指定导出第几个。 |
| `--overwrite` | 否 | 布尔标志 | `false` | 若目标文件已存在，则覆盖写入。不加此标志时，文件已存在将报错退出。 |

## 输出文件命名

导出文件以文章 YAML frontmatter 中的 `slug` 字段命名：

```
<path>/<slug>.md
```

## 图片处理

所有 `![alt](relative/path)` 形式的 Markdown 图片引用都会被检测并复制到目标目录，保持相同的相对子路径结构。绝对 URL 和 data URI 将被忽略。

若源生成目录中缺少某个引用图片，命令将立即报错并说明缺失文件。

## 链接注入

链接从 sidecar 文件 `<article>.links.json` 中加载，`customLinks` 和 `links` 数组合并后应用。若不存在 sidecar，则直接导出 Markdown，不进行链接注入。

YAML frontmatter 块原样保留；链接注入仅作用于正文。

## 覆盖保护

不加 `--overwrite` 时，若 `<path>/<slug>.md` 已存在，命令将在写入前**报错退出**，防止意外覆盖。

## 示例

将最近生成的文章导出到 `~/exports/`：

```bash
ideon export 20260418-185448-metabolic-stability ~/exports/
```

通过 slug 导出（slug 唯一时的简写）：

```bash
ideon export metabolic-stability-protocol ~/exports/
```

导出多变体生成中的第二个变体：

```bash
ideon export 20260418-185448-my-article ~/exports/ --index 2
```

即使文件已存在也强制导出：

```bash
ideon export my-article ~/exports/ --overwrite
```

## 相关命令

- [`ideon links <slug>`](./ideon-links.md) — 在导出前更新 `.links.json` sidecar。
- [`ideon preview`](./ideon-preview.md) — 在本地以实时链接渲染预览文章，无需导出。
