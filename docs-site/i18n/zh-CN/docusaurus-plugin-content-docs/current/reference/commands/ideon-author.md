---
title: ideon author
description: 管理作者档案，用于向写作 prompt 注入声音、经验与专业背景。
keywords: [ideon, cli, 作者, profile, eeat, 专业背景]
image: /img/logo.svg
---

# ideon author

## 功能说明

`ideon author` 管理一等公民作者档案。每位作者包含名称、自动生成的 slug，以及自由格式的 **profile**（经验、声音、风格、资历）。当运行解析到作者时，作者上下文会注入所有内容写作 prompt。

## 作者解析链

写入运行开始时，Ideon 按以下顺序解析活跃作者：

```
CLI --author / job.author → series.defaults.defaultAuthor → publication.defaults.defaultAuthor
```

每次运行的 **experience notes**（`--experience` 或 `job.experienceNotes`）会补充系列的常驻经验（`series.defaults.experienceNotes`）。两者同时存在时会拼接。

## 子命令

- [`ideon author add`](#ideon-author-add) — 创建新作者
- [`ideon author list`](#ideon-author-list) — 列出所有作者
- [`ideon author edit`](#ideon-author-edit) — 编辑现有作者
- [`ideon author remove`](#ideon-author-remove) — 删除作者

---

## ideon author add

```bash
ideon author add [名称] [--profile <文本>]
```

| 标志 | 必填 | 说明 |
| --- | --- | --- |
| `[名称]` | 是（或交互式） | 作者显示名称，slug 自动生成。 |
| `--profile <文本>` | 建议 | 自由格式档案：经验、声音、资历、模型可编织的轶事。 |

### 示例

```bash
ideon author add "Alex Chen" --profile "金融科技初创公司的 Staff SRE，撰写 Kubernetes、事故响应与平台工程。"
```

---

## ideon author list

```bash
ideon author list [--json] [--verbose]
```

---

## ideon author edit

```bash
ideon author edit <slug> [--name <名称>] [--profile <文本>]
```

---

## ideon author remove

```bash
ideon author remove <slug> [-f|--force]
```

---

## 相关命令

- 在出版物上设置默认作者：`ideon publication edit <slug> --author <author-slug>`
- 在系列上设置默认作者与常驻经验：`ideon series edit <slug> --author <author-slug> --experience <文本>`
- 单次运行覆盖：`ideon write "..." --author <author-slug> --experience "文章相关轶事"`

参见：[ideon write](./ideon-write.md)、[ideon series](./ideon-series.md)。
