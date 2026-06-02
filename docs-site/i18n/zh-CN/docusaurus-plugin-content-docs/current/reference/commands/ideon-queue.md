---
title: ideon queue
description: 管理内容队列，安排未来的文章写作。
keywords: [ideon, cli, 队列, 内容, 排期, 计划]
image: /img/logo.svg
---

# ideon queue

## 命令作用

`ideon queue` 管理内容队列——一个等待撰写的文章全局列表。队列入口在入队时存储完整的写入参数快照，因此条目是自包含且可移植的。

## 子命令

- [`ideon queue add`](#ideon-queue-add) — 将文章添加到队列
- [`ideon queue list`](#ideon-queue-list) — 列出队列中的文章
- [`ideon queue peek`](#ideon-queue-peek) — 查看下一篇文章但不消费
- [`ideon queue remove`](#ideon-queue-remove) — 按 ID 删除队列条目
- [`ideon queue clear`](#ideon-queue-clear) — 删除所有队列条目

## 工作原理

当您将文章添加到队列时，Ideon 会解析所有参数（出版物默认值、系列默认值、风格、意图、长度、内容目标）并保存快照到 `~/.config/ideon/queue/<id>.json`。每个条目是一个文件。

当您运行 `ideon write --from-queue` 时，下一个待处理条目会被原子性地认领（重命名为 `.in-progress.json`），写入后成功时删除。如果写入失败或中断，条目会自动恢复为 `pending`。

## 存储

队列条目以单独的 JSON 文件存储在 `~/.config/ideon/queue/` 中。每个文件包含：

- `id` — 唯一标识符（UUID）
- `status` — `pending` 或 `in-progress`
- `idea` — 内容创意
- `settings` — 完整解析的 `AppSettings` 快照
- `publication` — 完整出版物对象（如已指定）
- `series` — 完整系列对象（如已指定）
- `job` — 内联的 job 定义（如使用了 `--job`）
- `exportPath` — 导出目标路径（如使用了 `--export`）
- `addedAt` — ISO 时间戳

## 原子保护

队列操作使用文件重命名作为原子保护。当 `ideon write --from-queue` 接收条目时，它将 `<id>.json` 重命名为 `<id>.in-progress.json`。第二个并发进程将重命名失败并跳到下一个条目。

成功时，`.in-progress` 文件被删除。失败或中断时，它会被重命名回 `.json`，状态为 `pending`。

---

## ideon queue add

将文章添加到内容队列。

### 用法

```bash
ideon queue add [idea] [--idea <idea>] [--audience <description>] [--job <path>] [--primary <type=1>] [--secondary <type=count> ...] [--style <style>] [--intent <intent>] [--length <size-or-words>] [--publication <slug>] [--series <slug>] [--no-interactive] [--export <path>]
```

### 选项

`ideon queue add` 接受与 [`ideon write`](/reference/commands/ideon-write#参数与选项) 相同的内容定义选项。向 `ideon write` 添加新选项会自动使其在 `ideon queue add` 中可用。

| 参数 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `[idea]` | 否 | string | 位置参数 idea。 |
| `--idea <idea>` | 否 | string | 显式 idea。 |
| `--audience <description>` | 否 | string | 用于 shared-plan 规划的受众提示。 |
| `--job <path>` | 否 | string | JSON job 定义文件路径。设置在入队时快照。 |
| `--primary <type=1>` | 非交互模式必填 | string | 主输出目标。 |
| `--secondary <type=count>` | 否 | 可重复 string | 次级输出目标。 |
| `--style <style>` | 否 | enum | 写作风格。 |
| `--intent <intent>` | 否 | enum | 内容意图。 |
| `--length <size-or-words>` | 否 | enum 或整数 | 目标长度。 |
| `--publication <slug>` | 否 | string | 用于获取默认值和编辑策略的出版物。 |
| `--series <slug>` | 否 | string | 用于获取默认值和主题上下文的系列。 |
| `--no-interactive` | 否 | boolean | 在缺少输入时失败而非提示。 |
| `--export <path>` | 否 | string | 写入后的导出路径。存储在队列条目中。 |

### 示例

```bash
# 队列一个简单创意
ideon queue add "AI 如何改变技术出版" --primary article=1 --style technical --intent tutorial

# 使用出版物和系列
ideon queue add "深入 RAG" --primary article=1 --publication tech-blog --series ai-deep-dives

# 使用所有选项
ideon queue add "我们的 Q3 发布" --primary article=1 --secondary x-thread=2 --style professional --intent announcement --length large --publication blog --export ./out

# 从 job 文件队列
ideon queue add --job ./planned-article.json
```

### 说明

- 所有参数在入队时解析并快照。之后更改出版物或系列默认值不会影响已队列的条目。
- `--export` 路径按原样存储。如果目录在写入前移动，导出将在写入时失败。
- 在交互模式（TTY）下，缺少的 style/intent/length/targets 会像 `ideon write` 一样提示输入。

---

## ideon queue list

列出队列中的文章。

### 用法

```bash
ideon queue list [--json] [--publication <slug>] [--status <status>]
```

### 选项

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--json` | boolean | 以 JSON 数组输出。 |
| `--publication <slug>` | string | 按出版物 slug 过滤。 |
| `--status <status>` | string | 按状态过滤：`pending` 或 `in-progress`。默认全部。 |

### 示例

```bash
# 列出所有队列文章
ideon queue list

# 按出版物过滤
ideon queue list --publication tech-blog

# JSON 输出用于脚本
ideon queue list --json

# 仅显示待处理条目
ideon queue list --status pending
```

---

## ideon queue peek

查看队列中的下一篇文章但不消费。

### 用法

```bash
ideon queue peek [--publication <slug>]
```

### 选项

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `--publication <slug>` | string | 按出版物 slug 过滤。 |

### 示例

```bash
# 查看下一篇
ideon queue peek

# 查看特定出版物的下一篇
ideon queue peek --publication tech-blog
```

---

## ideon queue remove

按 ID 删除队列条目。

### 用法

```bash
ideon queue remove <id> [--force]
```

### 选项

| 参数 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `<id>` | 是 | string | 要删除的队列条目 ID。 |
| `--force` / `-f` | 否 | boolean | 跳过确认提示。 |

### 示例

```bash
# 带确认提示
ideon queue remove 550e8400-e29b-41d4-a716-446655440000

# 强制删除
ideon queue remove 550e8400-e29b-41d4-a716-446655440000 --force
```

---

## ideon queue clear

删除所有队列条目。

### 用法

```bash
ideon queue clear [--force]
```

### 选项

| 参数 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `--force` / `-f` | 否 | boolean | 跳过确认提示。 |

### 示例

```bash
# 带确认提示
ideon queue clear

# 强制清空
ideon queue clear --force
```

---

## 将队列与 `ideon write` 配合使用

### 出队并写入

```bash
# 写入下一个待处理文章
ideon write --from-queue

# 写入特定出版物的下一个待处理文章
ideon write --from-queue --publication tech-blog

# 在写入时覆盖队列设置
ideon write --from-queue --style playful
```

### 行为

- `--from-queue` 选取最旧的 `pending` 条目，原子性认领并写入。
- 成功时，队列条目被删除。
- 失败或 `Ctrl+C` 时，条目自动恢复为 `pending`。
- 与 `--from-queue` 一起传递的任何 CLI 参数会覆盖快照设置。
- 如果队列为空（或没有条目匹配 `--publication`），命令会失败并报错。

## 相关命令

- [ideon write [idea]](./ideon-write.md)
- [ideon write resume](./ideon-write-resume.md)
- [ideon publication](./ideon-series.md)（出版物和系列管理）
