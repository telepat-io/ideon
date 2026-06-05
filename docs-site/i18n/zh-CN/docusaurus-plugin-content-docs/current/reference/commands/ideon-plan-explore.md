---
title: ideon plan explore
description: 研究新的内容创意，生成基于关键词的系列和文章计划。
keywords: [ideon, plan, explore, 内容规划, 关键词研究, 主题聚类]
---

# ideon plan explore

使用 Google Keyword Planner 数据研究新的内容创意，生成系列和文章提案。计划通过交互式审查流程呈现，然后保存到队列中。

## 语法

```bash
ideon plan explore [idea] [选项]
```

## 参数

| 参数 | 描述 | 必需 |
|----------|-------------|----------|
| `idea` | 要研究的内容创意 | 否（可交互输入） |

如果省略 `idea` 且未通过 `--non-interactive` 提供，Ideon 会交互式提示输入。

## 选项

| 选项 | 别名 | 描述 | 默认值 |
|--------|-------|-------------|---------|
| `--publication` | `-p` | 出版物 slug | **必需** |
| `--context` | | 业务上下文或 ICP 描述 | — |
| `--country` | | 逗号分隔的 ISO 国家代码 | 出版物默认值或 `US` |
| `--language` | | ISO 639-1 语言代码 | 出版物默认值或 `en` |
| `--series-count` | | 目标系列数量 | `3` |
| `--articles-per-series` | | 每个系列的目标文章数 | `5` |
| `--seed-keywords` | | 逗号分隔的始终包含的种子关键词 | — |
| `--exclude-series` | | 逗号分隔的要避免重复的系列 slug | — |
| `--content-type` | | 队列条目的内容类型 | `article` |
| `--model` | | 强推理调用的模型 | `deepseek/deepseek-v4-pro` |
| `--intent-model` | | 意图分类的模型 | `deepseek/deepseek-v4-flash` |
| `--auto-save` | | 跳过审批门并自动保存 | `false` |
| `--non-interactive` | | 代理模式：纯文本输出到 stdout | `false` |
| `--dry-run` | | 运行研究但跳过所有写入 | `false` |

## 示例

### 基本探索

```bash
ideon plan explore "B2B SaaS 内容策略" --publication tech-blog
```

这会为任何缺失的必需输入打开交互式提示，运行所有七个规划阶段，并在审查 TUI 中呈现结果。

### 带业务上下文和种子关键词

```bash
ideon plan explore "云成本优化" \
  --publication tech-blog \
  --context "我们面向每月云支出超过 $50k 的工程领导层" \
  --seed-keywords "FinOps,AWS 成本节省,云浪费减少" \
  --series-count 4 \
  --articles-per-series 6
```

### 非交互式代理模式

```bash
ideon plan explore "DevOps 自动化趋势" \
  --publication tech-blog \
  --non-interactive \
  --auto-save \
  --context "我们的 ICP：中型公司的平台工程团队"
```

输出到 stdout。计划自动持久化。如果没有找到结果，退出码为 2。

### 避免现有系列

```bash
ideon plan explore "Kubernetes 最佳实践" \
  --publication tech-blog \
  --exclude-series kubernetes-101,k8s-security
```

被排除的系列及其关键词不会包含在聚类形成中。

### 预览但不保存的试运行

```bash
ideon plan explore "医疗 AI" \
  --publication health-tech \
  --dry-run
```

所有研究正常运行但不持久化 — 不创建系列，不添加队列条目。适用于在提交前验证创意。

### 使用自定义模型

```bash
ideon plan explore "增长营销策略" \
  --publication growth-blog \
  --model anthropic/claude-opus-4 \
  --intent-model openai/gpt-4.1-mini
```

使用强模型进行规划 LLM 调用，使用更快/更便宜的模型进行意图分类。

## 流水线阶段

探索模式按顺序运行这七个阶段：

1. **水合（Hydrate）** — 加载出版物、系列、输出历史和 GKP 缓存
2. **种子（Seeds）** — 从内容创意生成种子关键词
3. **研究（Research）** — 带有扩展和低量检测的迭代 GKP 查询
4. **评分（Score）** — KOB 评分、意图分类和候选过滤
5. **聚类（Cluster）** — 将入围关键词分组为主题系列
6. **规划文章（Plan Articles）** — 为每个系列规划单独的文章
7. **持久化（Persist）** — 保存系列、更新关键词和排队文章

## 交互流程

当未设置 `--non-interactive` 且未启用 `--auto-save` 时：

1. **输入提示**（如果未提供 `idea`）— 输入您的内容创意
2. **计划审查** — 系列摘要、导航系列、审查文章
3. **审批门** — 确认或拒绝计划

随时按 `Ctrl+C` 取消而不保存。

## 退出码

| 码 | 含义 |
|------|---------|
| `0` | 计划成功完成 |
| `1` | 流水线失败（API 错误、缺少凭据等） |
| `2` | 未找到结果（主题耗尽、低需求） |

## 输出格式（非交互式）

当设置 `--non-interactive` 时，输出为以下格式的纯文本：

```
# 计划：探索
模式：new-idea
出版物：tech-blog
系列：AI 战略

## 研究
轮次：3
评估候选：87
通过候选：23
缓存命中：42
API 调用：9

## 系列：AI 战略
支柱关键词：企业 AI 战略
漏斗：顶部
理由：具有强信息意图的基础关键词聚类
覆盖缺口：此聚类中没有现有内容

### 文章：如何构建企业 AI 战略
主要关键词：企业 AI 战略
次要关键词：AI 采用框架、企业 AI 路线图
意图：信息性
漏斗：顶部
格式：指南
优先级：高
支柱：是
类型：新

ideon queue add "如何构建企业 AI 战略" --publication tech-blog --series ai-strategy --keywords "企业 AI 战略, AI 采用框架, 企业 AI 路线图" --intent guide --type article
```

如果没有找到结果，输出显示：

```
# 计划：探索
模式：new-idea
出版物：tech-blog

## 无结果
找到候选：12
状态：已耗尽

未找到此主题的足够需求信号。

## 转向建议
- 尝试更广泛的种子关键词
- 缩小目标市场
- 检查现有内容是否已覆盖此主题
```

## 相关命令

- [`ideon plan expand`](./ideon-plan-expand.md) — 扩展现有系列
- [`ideon gkp ideas`](./ideon-gkp.md) — 生成 GKP 关键词创意
- [`ideon series add`](./ideon-series.md) — 手动创建系列
- [`ideon queue add`](./ideon-queue-add.md) — 将文章添加到队列
