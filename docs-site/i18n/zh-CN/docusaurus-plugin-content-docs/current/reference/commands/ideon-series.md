---
title: ideon series
description: 管理内容系列，包括主题、默认值和可选的出版物关联。
keywords: [ideon, cli, 系列, 内容, 出版物]
image: /img/logo.svg
---

# ideon series

## 功能说明

`ideon series` 管理内容系列——具有共享默认值、编辑策略和可选出版物关联的命名内容集合。系列默认值在设置解析链中覆盖出版物默认值。

## 子命令

- [`ideon series add`](#ideon-series-add) — 创建新系列
- [`ideon series list`](#ideon-series-list) — 列出所有系列
- [`ideon series edit`](#ideon-series-edit) — 编辑现有系列
- [`ideon series remove`](#ideon-series-remove) — 删除系列

## 设置解析链

当系列与写作运行关联时，其默认值在出版物默认值之后、CLI 参数之前应用：

```
已保存设置 → 任务文件 → 环境变量 → 出版物默认值 → 系列默认值 → CLI 参数
```

## 提示中的系列数据

当系列处于活动状态时，以下数据会注入所有 LLM 提示中：

- 系列名称和主题作为叙事线索
- 系列编辑策略（语气、禁止话题、披露要求、受众限制、备注）

---

## ideon series add

创建新的内容系列。

### 用法

```bash
ideon series add [name] [--topic <主题>] [--publication <slug>] [--style <风格>] [--intent <意图>] [--length <长度>] [--type <类型>] [--audience <受众描述>] [--tone <语气>] [--forbidden-topics <话题>] [--disclosure-requirements <要求>] [--audience-restrictions <限制>] [--editorial-policy <文本>]
```

### 选项

| 标志 | 必需 | 类型 | 说明 |
| --- | --- | --- | --- |
| `[name]` | 是（或交互式） | string | 系列名称。slug 从名称自动生成。 |
| `--topic <主题>` | 否 | string | 系列主题的自由文本描述。 |
| `--publication <slug>` | 否 | string | 将系列关联到出版物。 |

### 示例

```bash
# 最简系列
ideon series add "AI 深度探索"

# 带主题和出版物的系列
ideon series add "AI 深度探索" --topic "探索前沿 AI 技术" --publication tech-blog
```

---

## ideon series list

列出所有系列。

### 用法

```bash
ideon series list [--json] [--verbose] [--publication <slug>]
```

### 选项

| 标志 | 类型 | 说明 |
| --- | --- | --- |
| `--json` | boolean | 以 JSON 数组输出。 |
| `--verbose` | boolean | 显示编辑策略详情。 |
| `--publication <slug>` | string | 按出版物过滤系列。 |

---

## ideon series edit

编辑现有系列。

### 用法

```bash
ideon series edit <slug> [--name <名称>] [--topic <主题>] [--publication <slug>] [--unset-publication] [--style <风格>] [--intent <意图>] [--length <长度>] [--type <类型>]
```

### 选项

| 标志 | 必需 | 类型 | 说明 |
| --- | --- | --- | --- |
| `<slug>` | 是 | string | 要编辑的系列 slug。 |
| `--topic <主题>` | 否 | string | 新主题。 |
| `--publication <slug>` | 否 | string | 关联到其他出版物。 |
| `--unset-publication` | 否 | boolean | 移除出版物关联。 |

---

## ideon series remove

删除系列。

### 用法

```bash
ideon series remove <slug> [--force]
```

### 说明

删除系列不会影响在其下撰写的文章。文章元数据保持不变。

---

## 在 `ideon write` 中使用系列

### CLI 标志

```bash
ideon write "我的想法" --series ai-深度探索 --primary article=1
```

### 组合出版物和系列

```bash
ideon write "我的想法" --publication tech-blog --series ai-深度探索 --primary article=1
```

当两者都指定时：
- 出版物提供基础编辑策略和默认值
- 系列在有自己值的地方覆盖出版物默认值
- CLI 参数仍然覆盖一切
