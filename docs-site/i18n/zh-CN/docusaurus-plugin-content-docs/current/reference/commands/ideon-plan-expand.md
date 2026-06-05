---
title: ideon plan expand
description: 使用 Google Keyword Planner 数据扩展现有系列，添加新的关键词支持的文章创意。
keywords: [ideon, plan, expand, 内容规划, 系列扩展, 关键词研究]
---

# ideon plan expand

使用 Google Keyword Planner 研究扩展现有系列，添加新的文章创意。计划通过交互式审查流程呈现，然后保存到队列中。

## 语法

```bash
ideon plan expand [series-slug] [选项]
```

## 参数

| 参数 | 描述 | 必需 |
|----------|-------------|----------|
| `series-slug` | 要扩展的系列 slug | 否（可交互选择） |

如果省略 `series-slug` 且未通过 `--non-interactive` 提供，Ideon 会列出可用系列并交互式提示选择。

## 选项

| 选项 | 别名 | 描述 | 默认值 |
|--------|-------|-------------|---------|
| `--publication` | `-p` | 出版物 slug | **必需** |
| `--country` | | 逗号分隔的 ISO 国家代码 | 出版物默认值或 `US` |
| `--language` | | ISO 639-1 语言代码 | 出版物默认值或 `en` |
| `--article-count` | | 目标新文章数量 | `5` |
| `--seed-keywords` | | 逗号分隔的额外种子关键词 | — |
| `--content-type` | | 队列条目的内容类型 | `article` |
| `--model` | | 强推理调用的模型 | `deepseek/deepseek-v4-pro` |
| `--intent-model` | | 意图分类的模型 | `deepseek/deepseek-v4-flash` |
| `--auto-save` | | 跳过审批门并自动保存 | `false` |
| `--non-interactive` | | 代理模式：纯文本输出到 stdout | `false` |
| `--dry-run` | | 运行研究但跳过所有写入 | `false` |

## 示例

### 基本扩展

```bash
ideon plan expand ai-deep-dives --publication tech-blog
```

如果省略系列 slug，会显示交互式提示供您从可用系列中选择。

### 自定义文章数量

```bash
ideon plan expand kubernetes-series \
  --publication tech-blog \
  --article-count 8
```

### 添加种子关键词

```bash
ideon plan expand cloud-cost \
  --publication finops-blog \
  --seed-keywords "云回迁,AWS 节省计划,预留实例定价" \
  --article-count 4
```

这些额外的关键词补充了系列现有的关键词用于 GKP 研究。

### 非交互式代理模式

```bash
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --non-interactive \
  --auto-save
```

输出到 stdout。计划自动持久化。

### 预览的试运行

```bash
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --dry-run
```

运行研究但不持久化任何内容。适用于在提交前评估扩展范围。

## 扩展与探索的区别

| 方面 | 探索 (`new-idea`) | 扩展 (`expand-series`) |
|--------|----------------------|--------------------------|
| 起点 | 从头开始的内容创意 | 现有系列 |
| 种子关键词 | LLM 生成 + 用户提供 | 系列关键词 + 用户提供 |
| 系列输出 | 创建新的系列聚类 | 为一个现有系列规划文章 |
| 聚类形成 | 将候选关键词分组为新系列 | 使用目标系列的结构 |
| 覆盖检查 | 对现有内容全面去重 | 在系列范围内去重 |
| 队列条目 | 文章排入新系列下 | 文章排入现有系列下 |

## 流水线阶段

扩展模式跳过聚类（因为您正在扩展已知系列）并运行：

1. **水合（Hydrate）** — 加载出版物、系列、输出历史和 GKP 缓存
2. **种子（Seeds）** — 从目标系列提取关键词；应用种子关键词
3. **研究（Research）** — 迭代 GKP 查询
4. **评分（Score）** — KOB 评分、意图分类、候选过滤
5. **规划文章（Plan Articles）** — 为现有系列规划新文章
6. **持久化（Persist）** — 更新系列关键词并排队新文章

## 交互流程

当未设置 `--non-interactive` 且未启用 `--auto-save` 时：

1. **系列选择**（如果未提供 `series-slug`）— 从可用系列中选择
2. **计划审查** — 文章详情，包含关键词、意图和格式
3. **审批门** — 确认或拒绝计划

## 退出码

| 码 | 含义 |
|------|---------|
| `0` | 计划成功完成 |
| `1` | 流水线失败（API 错误、缺少凭据、系列未找到） |
| `2` | 未找到结果 |

## 输出格式（非交互式）

当设置 `--non-interactive` 时，输出显示：

```
# 计划：扩展
模式：expand-series
出版物：tech-blog
系列：AI 深度探索

## 研究
轮次：2
评估候选：45
通过候选：18
缓存命中：28
API 调用：5

## 文章

### 文章：Transformer 模型如何革新 NLP
主要关键词：transformer 模型解释
次要关键词：注意力机制、自注意力教程
意图：信息性
漏斗：顶部
格式：教程
优先级：高
类型：新

### 文章：Transformer 与 RNN：实用对比
主要关键词：transformers vs RNNs
次要关键词：序列模型对比、LSTM 替代方案
意图：商业性
漏斗：中部
格式：对比
优先级：中
类型：新
```

## 相关命令

- [`ideon plan explore`](./ideon-plan-explore.md) — 研究新的内容创意
- [`ideon series add`](./ideon-series.md) — 手动创建系列
- [`ideon gkp ideas`](./ideon-gkp.md) — 生成 GKP 关键词创意
- [`ideon queue add`](./ideon-queue-add.md) — 将文章添加到队列
