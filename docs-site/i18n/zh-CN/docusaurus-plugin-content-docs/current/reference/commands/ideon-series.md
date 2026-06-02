---
title: ideon series
description: 管理内容系列，包括主题、默认设置和可选的发布关联。
keywords: [ideon, cli, 系列, 内容, 发布]
image: /img/logo.svg
---

# ideon series

## 功能说明

`ideon series` 管理内容系列——具名相关内容集合，包含共享默认值、编辑策略和可选的发布关联。在设置解析链中，系列默认值会覆盖发布默认值。

## 子命令

- [`ideon series add`](#ideon-series-add) — 创建新系列
- [`ideon series list`](#ideon-series-list) — 列出所有系列
- [`ideon series edit`](#ideon-series-edit) — 编辑现有系列
- [`ideon series remove`](#ideon-series-remove) — 删除系列

## 设置解析链

当系列与写入运行关联时，其默认值在发布默认值之后、CLI 标志之前应用：

```
已保存设置 → 作业文件 → 环境变量 → 发布默认值 → 系列默认值 → CLI 标志
```

系列可以覆盖发布可以覆盖的任何设置：`style`、`intent`、`targetLength`、`contentTargets`、`model`、`modelSettings` 和 `editorialPolicy`。

## Prompt 中的系列数据

当系列处于活动状态时，以下数据会注入到所有 LLM prompt 中（计划、章节、频道内容）：

- 系列名称和主题作为叙事线索指令
- 系列编辑策略（语气、禁止话题、披露要求、受众限制、备注）

示例 prompt 注入：

```
本文是"AI 深度探索"系列的一部分。
系列主题：探索前沿 AI 技术
保持主题连贯性和与此总体主题的连续性。
语气：技术性
禁止话题：炒作、推测
```

---

## ideon series add

创建新的内容系列。

### 用法

```bash
ideon series add [名称] [--topic <主题>] [--publication <slug>] [--style <风格>] [--intent <意图>] [--length <长度>] [--type <类型>] [--audience <描述>] [--tone <语气>] [--forbidden-topics <话题>] [--disclosure-requirements <要求>] [--audience-restrictions <限制>] [--editorial-policy <文本>]
```

### 选项

| 标志 | 必需 | 类型 | 说明 |
| --- | --- | --- | --- |
| `[名称]` | 是（或交互式） | string | 系列名称。slug 将根据名称自动生成。 |
| `--topic <主题>` | 否 | string | 对系列内容的自由文本描述。 |
| `--publication <slug>` | 否 | string | 将系列关联到某个发布。 |
| `--style <风格>` | 否 | enum | 默认写作风格。 |
| `--intent <意图>` | 否 | enum | 默认内容意图。 |
| `--length <长度>` | 否 | enum 或 integer | 默认目标长度。 |
| `--type <类型>` | 否 | enum | 默认主要内容类型。 |
| `--audience <描述>` | 否 | string | 默认目标受众提示。 |
| `--tone <语气>` | 否 | string | 编辑策略语气。 |
| `--forbidden-topics <话题>` | 否 | string | 逗号分隔的禁止话题。 |
| `--disclosure-requirements <要求>` | 否 | string | 逗号分隔的披露要求。 |
| `--audience-restrictions <限制>` | 否 | string | 逗号分隔的受众限制。 |
| `--editorial-policy <文本>` | 否 | string | 编辑策略备注。 |

### 示例

```bash
# 最小化系列
ideon series add "AI 深度探索"

# 带主题和发布的系列
ideon series add "AI 深度探索" --topic "探索前沿 AI 技术" --publication tech-blog

# 带完整选项的系列
ideon series add "创业故事" --topic "创始人访谈和案例分析" --publication my-blog --style storytelling --intent case-study --tone conversational
```

### 交互模式

在 TTY 中不带标志运行时，`ideon series add` 会启动交互式流程：

1. 主题（自由文本）
2. 发布选择（从现有中选择或跳过）
3. 默认风格
4. 默认意图
5. 默认目标长度
6. 默认内容类型
7. 编辑策略：语气、禁止话题、披露要求、受众限制、备注

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
| `--json` | boolean | 以 JSON 数组格式输出。 |
| `--verbose` | boolean | 显示编辑策略详情。 |
| `--publication <slug>` | string | 筛选与此发布关联的系列。 |

### 示例

```bash
# 列出所有系列
ideon series list

# 按发布筛选
ideon series list --publication tech-blog

# JSON 输出
ideon series list --json
```

---

## ideon series edit

编辑现有系列。

### 用法

```bash
ideon series edit <slug> [--name <名称>] [--topic <主题>] [--publication <slug>] [--unset-publication] [--style <风格>] [--intent <意图>] [--length <长度>] [--type <类型>] [--audience <描述>] [--tone <语气>] [--forbidden-topics <话题>] [--disclosure-requirements <要求>] [--audience-restrictions <限制>] [--editorial-policy <文本>]
```

### 选项

| 标志 | 必需 | 类型 | 说明 |
| --- | --- | --- | --- |
| `<slug>` | 是 | string | 要编辑的系列 slug。 |
| `--name <名称>` | 否 | string | 新的显示名称。 |
| `--topic <主题>` | 否 | string | 新的主题。 |
| `--publication <slug>` | 否 | string | 关联到不同的发布。 |
| `--unset-publication` | 否 | boolean | 移除发布关联。 |
| `--style <风格>` | 否 | enum | 新的默认风格。 |
| `--intent <意图>` | 否 | enum | 新的默认意图。 |
| `--length <长度>` | 否 | enum 或 integer | 新的默认目标长度。 |
| `--type <类型>` | 否 | enum | 新的默认内容类型。 |
| `--audience <描述>` | 否 | string | 新的受众提示。 |
| `--tone <语气>` | 否 | string | 新的编辑语气。 |
| `--forbidden-topics <话题>` | 否 | string | 新的逗号分隔禁止话题。 |
| `--disclosure-requirements <要求>` | 否 | string | 新的披露要求。 |
| `--audience-restrictions <限制>` | 否 | string | 新的受众限制。 |
| `--editorial-policy <文本>` | 否 | string | 新的编辑策略备注。 |

### 示例

```bash
# 更改主题
ideon series edit ai-shen-du-tan-suo --topic "新的主题描述"

# 重新关联到不同发布
ideon series edit ai-shen-du-tan-suo --publication new-pub

# 移除发布关联
ideon series edit ai-shen-du-tan-suo --unset-publication
```

---

## ideon series remove

删除系列。

### 用法

```bash
ideon series remove <slug> [--force]
```

### 选项

| 标志 | 必需 | 类型 | 说明 |
| --- | --- | --- | --- |
| `<slug>` | 是 | string | 要删除的系列 slug。 |
| `--force` / `-f` | 否 | boolean | 跳过确认提示。 |

### 示例

```bash
# 显示确认提示
ideon series remove ai-shen-du-tan-suo

# 强制删除
ideon series remove ai-shen-du-tan-suo --force
```

### 注意事项

删除系列不会影响已在其下编写的文章。其元数据将保持不变。

---

## 与 `ideon write` 一起使用系列

### CLI 标志

```bash
ideon write "我的想法" --series ai-shen-du-tan-suo --primary article=1
```

### 作业文件

```json
{
  "idea": "我的想法",
  "series": "ai-shen-du-tan-suo",
  "settings": {
    "contentTargets": [{ "contentType": "article", "role": "primary", "count": 1 }]
  }
}
```

### 交互式 TUI

在交互模式下运行 `ideon write` 且未指定 `--series` 时，系列选择步骤会在发布选择（如适用）之后显示。用户可以选择现有系列或跳过。

### 组合发布和系列

```bash
ideon write "我的想法" --publication tech-blog --series ai-shen-du-tan-suo --primary article=1
```

当两者都指定时：
- 发布提供基础编辑策略和默认值
- 系列在有其自身值的地方覆盖发布默认值
- 系列编辑策略在 prompt 中附加到发布策略之后
- CLI 标志仍然覆盖所有设置
