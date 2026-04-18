---
title: "ideon links <slug>"
description: 仅对已生成文章执行链接增强阶段。
keywords: [ideon, cli, links, 链接增强, sidecar]
---

# `ideon links <slug>`

## 命令作用

`ideon links <slug>` 仅执行链接增强阶段，针对已生成 markdown 文章写入或更新其 `.links.json` sidecar 文件。

这里的“链接增强”指：Ideon 从 markdown 中选取可链接短语，使用模型 + web search 解析相关来源 URL，并将链接建议写入 sidecar 元数据。

该步骤不会改写原始 markdown 文件；预览时会在渲染阶段应用 sidecar 链接。

## 用法

```bash
ideon links <slug> [--mode <fresh|append>]
```

## 参数与选项

| 参数/选项 | 简写 | 必填 | 类型 | 默认值 | 允许值 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `<slug>` | 无 | 是 | string | n/a | 已生成文章 slug | 通过 frontmatter slug 定位目标文章。 |
| `--mode <mode>` | 无 | 否 | enum | `fresh` | `fresh`、`append` | `fresh` 覆盖已有 sidecar；`append` 将新链接合并到已有 sidecar（不存在则创建）。 |

说明：

- 该命令作用于符合条件的长内容输出；短内容渠道（如 `x-post`、`x-thread`）会被链接增强逻辑跳过。

## 模式语义

- `fresh`:
  - 生成一组新的链接。
  - 覆盖已有 `.links.json` 内容。
- `append`:
  - 生成一组新的链接。
  - 合并到已有 sidecar 条目，并按 `expression + url` 去重。
  - 若 sidecar 不存在则创建。

## 示例

```bash title="默认模式（fresh）"
ideon links ai-content-ops-playbook
```

```bash title="显式 fresh 模式"
ideon links ai-content-ops-playbook --mode fresh
```

```bash title="向现有 sidecar 追加"
ideon links ai-content-ops-playbook --mode append
```

## 输出与退出码

成功时，Ideon 会在匹配到的 markdown 文件旁写入 sidecar（例如 `article-1.links.json`）。

| 退出码 | 含义 |
| --- | --- |
| `0` | 链接增强执行成功。 |
| `1` | 发生参数校验、定位、凭据或运行时错误。 |

## 相关命令

- [ideon write [idea]](./ideon-write.md)
- [ideon write resume](./ideon-write-resume.md)
- [ideon preview [markdownPath]](./ideon-preview.md)
