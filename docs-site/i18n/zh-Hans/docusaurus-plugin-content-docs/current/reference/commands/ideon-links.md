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
ideon links <slug> [--mode <fresh|append>] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]
```

## 参数与选项

| 参数/选项 | 简写 | 必填 | 类型 | 默认值 | 允许值 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `<slug>` | 无 | 是 | string | n/a | 已生成文章 slug | 通过 frontmatter slug 定位目标文章。 |
| `--mode <mode>` | 无 | 否 | enum | `fresh` | `fresh`、`append` | `fresh` 覆盖已生成链接；`append` 合并新链接。自定义链接不受 `--mode` 影响。 |
| `--link <expression->url>` | 无 | 否 | 可重复 string | 无 | `"文字->https://..."` | 添加或更新自定义链接。格式：`expression->url`。可重复。自定义链接优先于生成链接。 |
| `--unlink <expression>` | 无 | 否 | 可重复 string | 无 | 任意 expression 字符串 | 按 expression 文字删除自定义链接。可重复，不区分大小写。 |
| `--max-links <n>` | 无 | 否 | 正整数 | 由文章长度决定 | 任意正整数 | 限制生成链接的最大数量，不影响自定义链接。 |

说明：

- 该命令作用于符合条件的长内容输出；短内容渠道（如 `x-post`、`x-thread`）会被链接增强逻辑跳过。

## 模式语义

- `fresh`:
  - 生成一组新的链接。
  - 覆盖已有**生成链接**。
  - **自定义链接（通过 `--link` 添加）始终保留**，不受 `--mode` 影响。
- `append`:
  - 生成一组新的链接。
  - 合并到已有 sidecar 条目，并按 `expression + url` 去重。
  - 若 sidecar 不存在则创建。

## 自定义链接

自定义链接是用户指定的 `expression → url` 映射，具有以下特性：

- 与 LLM 生成链接分开存储。
- 无论 `--mode` 如何，始终包含在预览渲染中。
- 优先级高于生成链接：若 LLM 选取的 expression 已有自定义链接，该生成条目将被忽略。
- 跨 `--mode fresh` 运行时保留——只有 `--unlink` 才会删除。

添加自定义链接：

```bash
ideon links my-article --link "React->https://react.dev"
```

删除自定义链接：

```bash
ideon links my-article --unlink "React"
```

## Sidecar 格式（v2）

该命令生成以下结构的 sidecar 文件：

```json
{
  "version": 2,
  "customLinks": [
    { "expression": "React", "url": "https://react.dev", "title": null }
  ],
  "links": [
    { "expression": "OpenRouter", "url": "https://openrouter.ai", "title": "OpenRouter" }
  ]
}
```

v1 sidecar 可透明读取，`customLinks` 默认视为空数组。

## 最大链接数默认值

未指定 `--max-links` 时，根据文章目标字数自动决定上限：

| 字数范围 | 默认最大链接数 |
| --- | --- |
| ≤ 700 字 | 5 |
| 701 – 1150 字 | 8 |
| > 1150 字 | 12 |

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

```bash title="添加自定义链接"
ideon links ai-content-ops-playbook --link "OpenRouter->https://openrouter.ai"
```

```bash title="添加多个自定义链接"
ideon links ai-content-ops-playbook --link "React->https://react.dev" --link "Node.js->https://nodejs.org"
```

```bash title="删除自定义链接"
ideon links ai-content-ops-playbook --unlink "React"
```

```bash title="将生成链接数限制为 5"
ideon links ai-content-ops-playbook --max-links 5
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
