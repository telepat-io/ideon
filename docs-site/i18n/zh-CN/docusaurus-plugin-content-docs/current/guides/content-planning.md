---
title: 内容规划
description: 使用 Google Keyword Planner 支持的研究、主题聚类和交互式审查，在 Ideon 中规划内容系列和文章。
keywords: [ideon, 内容规划, 关键词研究, 主题聚类, 系列规划, SEO 策略]
---

# 内容规划

Ideon 的内容规划功能将您的主题创意转化为数据支持、可直接发布的内容策略。无需猜测写什么 — 您将获得经过关键词验证的系列和文章提案，通过交互式终端 UI 进行审查 — 所有内容均由真实的 Google Ads Keyword Planner 数据支持。

## 概述

内容规划有两种模式，通过 `ideon plan` 命令访问：

| 模式 | 命令 | 使用场景 |
|------|---------|-------------|
| **探索** | `ideon plan explore` | 研究新的内容创意并生成全新的系列和文章计划 |
| **扩展** | `ideon plan expand` | 为现有系列添加新文章创意 |

两种模式都需要一个出版物、Google Ads 凭据和 OpenRouter API 密钥。输出是一组系列提案和文章创意，您可以在审查和批准后将其持久化到队列中。

## 快速示例

```bash
# 探索一个新主题
ideon plan explore "B2B SaaS 内容策略" \
  --publication tech-blog \
  --series-count 3 \
  --articles-per-series 5 \
  --context "我们帮助早期 B2B SaaS 公司建立内容引擎"

# 扩展现有系列
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --article-count 6
```

## 工作原理

Ideon 运行一个七阶段规划流水线：

### 阶段 1：水合（Hydrate）

加载您的出版物、系列和输出历史，构建**覆盖地图** — 您已覆盖的每个关键词以及每篇文章发布多久的完整画像。这可以防止重复建议并显示可刷新的候选内容。

### 阶段 2：种子（Seeds）

从您的内容创意生成种子关键词。在探索模式下，LLM 会提出带理由的关键词主题；用户提供的种子关键词始终会被包含。在扩展模式下，目标系列的现有关键词作为研究种子。

### 阶段 3：研究（Research）

迭代查询 Google Keyword Planner (GKP)。每轮：
- 向 GKP 查询新的种子关键词
- 缓存结果并复用最近的快照
- 追踪候选关键词的搜索量、竞争度和 CPC 数据
- 当回报递减时扩展关键词
- 当搜索量稀疏时进入低量模式

### 阶段 4：评分（Score）

使用 **KOB 分数**（关键词机会基准）对每个候选关键词进行评分和筛选，权重包括：
- 搜索量
- CPC 信号（高出价表明商业意图）
- 竞争度
- 意图分类（信息性、商业性、交易性）

低于评分阈值的候选关键词将被丢弃并附上理由。

### 阶段 5：聚类（Cluster）

将入围关键词分组为主题**系列**。每个聚类获得：
- 一个支柱关键词
- 支持关键词列表
- 漏斗阶段（顶部、中部、底部）
- 理由和覆盖缺口说明

聚类会避开标记为排除的现有系列。

### 阶段 6：规划文章（Plan Articles）

为每个系列聚类规划单独的文章，包含：
- 标题和内容角度
- 主要和次要关键词
- 意图类型（信息性、商业性、交易性）
- 格式（指南、清单、对比、案例研究、教程、观点）
- 优先级（高、中、低）
- 置信度说明

### 阶段 7：持久化（Persist）

在您批准后，计划将被保存：
- 创建新系列
- 更新现有系列关键词
- 文章创意被排入 `ideon queue` 条目
- 写入规划会话记录

## 交互式审查流程

在交互模式（默认）下运行时，Ideon 在流水线完成后呈现终端 UI 审查：

1. **摘要视图** — 系列数量、文章数量、研究统计
2. **系列审查** — 导航并展开每个系列以查看支柱关键词和文章列表
3. **文章审查** — 浏览单篇文章，查看关键词、意图和格式详情
4. **审批门** — 确认或拒绝整个计划

使用方向键导航，Enter 键展开/折叠系列，`Y`/`N` 键确认。

## 非交互模式

对于 CI、自动化和代理工作流，使用 `--non-interactive` 完全跳过 TUI，将计划输出写入 stdout：

```bash
ideon plan explore "SaaS 内容策略" \
  --publication tech-blog \
  --non-interactive \
  --auto-save
```

| 标志 | 效果 |
|------|--------|
| `--non-interactive` | 跳过 TUI；将计划以纯文本写入 stdout |
| `--auto-save` | 跳过审批门；立即持久化计划 |
| `--dry-run` | 运行研究但不写入磁盘 |

## 覆盖地图与去重

在提议任何关键词之前，Ideon 会检查您的**覆盖地图** — 您在当前出版物下发布的每个关键词的记录。已覆盖的关键词会显示：
- 现有文章标题
- 文章发布多少个月
- 如果超过 6 个月，显示**刷新候选**标志

这确保您的计划永远不会建议写同一主题两次，并帮助您发现需要更新的内容。

## KOB 评分与意图分类

**关键词机会基准（KOB）** 分数结合了：

| 因素 | 权重 | 来源 |
|--------|--------|--------|
| 月搜索量 | 高 | GKP 历史数据 |
| CPC 信号 | 中 | 高出价顶端 |
| 竞争度 | 中 | GKP 竞争指数 |
| 意图清晰度 | 低 | LLM 分类 |

**意图分类**使用单独的 LLM 调用来将每个关键词分类为信息性、商业性或交易性，置信度为 1–5。这在聚类过程中用于漏斗阶段分配。

## 低量模式

当研究在低搜索量主题中耗尽可用关键词时，Ideon 切换到**低量模式**。这放宽了评分阈值，使您仍能获得有用的计划而不是空结果。输出会标记此情况，让您知道该主题的需求信号有限。

如果没有候选关键词能通过低量模式评分，将显示一个**转向建议**部分，提供替代角度。

## 与出版物和系列的协作

内容规划与 Ideon 的出版物和系列系统深度集成：

```bash
# 首先创建出版物
ideon publication add "技术博客" --style technical --intent tutorial

# 手动创建系列（可选 — 计划会自动创建系列）
ideon series add "AI 深度探索" --topic "探索 AI 技术" --publication tech-blog

# 根据您的出版物进行规划
ideon plan explore "机器学习趋势" --publication tech-blog

# 避免与现有系列重复
ideon plan explore "ML 趋势" \
  --publication tech-blog \
  --exclude-series ai-deep-dives
```

出版物默认值（风格、意图、国家、语言）会输入到规划流水线中。国家代码和语言传递给每个 GKP 查询，使搜索量数据具有市场特定性。

## CLI 参考

各命令的完整详情：

- [`ideon plan explore`](../reference/commands/ideon-plan-explore.md) — 研究新创意
- [`ideon plan expand`](../reference/commands/ideon-plan-expand.md) — 扩展现有系列

## 代理和自动化工作流

内容规划支持与写作相同的自动化界面：

- **非交互模式** — `ideon plan explore ... --non-interactive --auto-save`
- **退出码** — 0 成功，1 失败，2 无结果
- **MCP 集成** — 规划兼容 MCP 服务器（`ideon mcp serve`）以用于代理编排的工作流
- **技能包** — `ideon-plan` 技能包为规划工作流提供代理级指导

## 相关文档

- [Google Keyword Planner 集成](./google-ads-keyword-planner.md)
- [配置](./configuration.md)
- [流水线阶段](./pipeline-stages.md)
- [作业文件](./job-files.md)
- [输出结构](./output-structure.md)
