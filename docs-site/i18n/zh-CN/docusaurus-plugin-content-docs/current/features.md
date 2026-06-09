---
slug: /features
title: "一个创意。无限格式。"
description: Ideon 能为营销人员、创始人和内容团队做什么。
keywords: [ideon, 功能, 内容生成, AI 写作, 多渠道]
sidebar_label: 功能
sidebar_position: 1
---

# 一个创意。无限格式。

Ideon 将单一创意转化为完整的内容营销活动——在所有渠道上生成可直接发布的草稿，共享同一种声音、同一种风格和同一种策略。

专为营销人员、创始人和精简团队打造，帮助他们在不聘请完整编辑部门的情况下，大规模发布高质量内容。

---

## 写一次，处处发布

将单一创意转化为文章、博客文章、新闻通讯、X 话题串、X 帖子、LinkedIn 帖子和 Reddit 帖子——全部在一次运行中完成。您的文章是核心，其他所有内容都是对它的推广。

```bash
ideon write "我们的新 AI 功能" \
  --primary article=1 \
  --secondary x-thread=2 \
  --secondary linkedin-post=1 \
  --secondary reddit-post=1
```

无需再以七种不同方式手动重写同一公告。Ideon 为每个渠道调整结构、长度和语气，同时保持核心信息不变。

---

## 听起来像您自己写的

选择一种风格和一个意图。每次运行中的所有输出都共享同一种声音——因此您的 X 话题串听起来就像出自您的文章的同一位作者之手。

| 风格 | 意图 | 效果 |
|---|---|---|
| `technical` | `tutorial` | 开发者真正会阅读的教育性深度文章 |
| `professional` | `case-study` | 建立信誉的创始人内容 |
| `storytelling` | `announcement` | 从第一行就抓住眼球的产品发布 |
| `persuasive` | `opinion-piece` | 有锋芒的思想领导力内容 |
| `friendly` | `how-to-guide` | 平易近人、易于分享的教程 |

**13 种风格。** **13 种意图。** 在所有渠道上保持一致的声音。

---

## 出版物与系列

使用**出版物**和**系列**组织您的内容策略。

**出版物**让您可以为每个出版物定义编辑策略、默认风格、意图和受众提示。设置一次，该出版物下的每次写作运行都会继承正确的声音。

**系列**将相关文章归组到共享主题和编辑线索下。系列可以覆盖出版物默认值，其下撰写的每篇文章都会获得上下文提示注入——LLM 知道这是更大叙事的一部分，并保持主题连贯性。

```bash
# 创建出版物
ideon publication add "技术博客" --style technical --intent tutorial --tone authoritative

# 在其下创建系列
ideon series add "AI 深度探索" --topic "探索前沿 AI 技术" --publication tech-blog

# 使用系列上下文写作
ideon write "RAG 系统的工作原理" --series ai-深度探索 --primary article=1
```

- **分层默认值** — 已保存设置 → 任务 → 环境 → 出版物 → 系列 → CLI 参数
- **覆盖任何设置** — 系列可覆盖风格、意图、长度、内容目标、模型设置和编辑策略
- **独立或关联** — 系列可与出版物配合使用，也可独立使用
- **主题注入** — 系列名称和主题注入每个提示，确保多篇文章的叙事连贯性

---

## 作者与编辑清单

为每篇草稿赋予真实的声音。**作者**是一等公民档案——名称、slug 和自由格式的 `profile`（经验、资历、写作风格）。运行解析到作者时，作者上下文会注入所有写作 prompt（计划、章节、频道内容）。

```bash
ideon author add "Alex Chen" --profile "Staff SRE，撰写 Kubernetes 与事故响应。"
ideon publication edit tech-blog --author alex-chen
ideon series edit ai-深度探索 --author alex-chen --experience "本系列的常驻轶事"
ideon write "我们如何修复生产问题" --author alex-chen --experience "Q2 的 readiness probe 误报" --primary article=1
```

- **解析链** — 运行 `--author` → 系列 `defaultAuthor` → 出版物 `defaultAuthor`
- **经验备注** — 系列常驻备注 + 每次运行的 `--experience`，两者同时存在时拼接
- **有则编织** — 提供的轶事可用第一人称；否则用第三人称专家语气或 `[AUTHOR: …]` 占位符
- **草稿优先发布** — 草稿正文不含署名或 AI 披露；发布时由人工添加 Who/How
- **编辑清单** — 动态发布前检查项写入 `meta.json` 并在每次运行后打印

---

## 内容队列

使用**内容队列**提前规划您的内容管道。将文章添加到全局队列并保存完整参数快照，准备好后逐一写入。

```bash
# 将文章排队以供稍后写入
ideon queue add "RAG 系统的工作原理" --primary article=1 --publication tech-blog --style technical
ideon queue add "我们的 Q3 产品发布" --primary article=1 --secondary x-thread=2 --intent announcement

# 查看队列内容
ideon queue list

# 写入下一篇
ideon write --from-queue

# 写入特定出版物的下一篇
ideon write --from-queue --publication tech-blog
```

- **自包含快照** — 出版物和系列默认值在入队时解析
- **原子出队** — 并发写入不会重复选取同一条目
- **自动恢复** — 失败或中断的写入会将条目恢复到队列
- **写入时覆盖** — CLI 参数覆盖队列设置

---

## 数据支持的内容规划

不再猜测该写什么。Ideon 的 `plan` 命令会根据真实的 Google Keyword Planner 数据研究您的内容创意，对关键词机会进行评分，将其分组为主题系列，并规划单独的文章 — 全部通过交互式终端 UI 进行审查，然后再进入您的队列。

```bash
# 探索新主题
ideon plan explore "B2B SaaS 内容策略" \
  --publication tech-blog \
  --series-count 3 \
  --articles-per-series 5

# 扩展现有系列
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --article-count 6
```

- **双模式** — `explore` 用于新主题，`expand` 用于扩展现有系列
- **GKP 驱动** — 真实的搜索量、竞争度和 CPC 数据支持每个决策
- **KOB 评分** — 关键词机会基准综合权重搜索量、意图和竞争度，优先处理最重要的内容
- **主题聚类** — LLM 将入围关键词分组为具有支柱关键词和漏斗阶段的连贯系列
- **覆盖感知** — 跳过已发布的关键词；标记过时内容以供刷新
- **交互式审查** — 在终端中导航系列和文章；在保存前批准或拒绝
- **代理就绪** — `--non-interactive` 和 `--auto-save` 适用于 CI 和自动化工作流

[了解更多 →](./guides/content-planning.md)

---

## 有研究支撑的草稿

Ideon 会浏览网络并像人类作者一样插入与上下文相关的外部链接——无需手动研究，没有通用占位符链接。只有可信、相关的链接，为您的草稿增添深度和权威性。

---

## 从一开始就为 SEO 优化

Ideon 的写作流水线在内容生成的每个阶段都强制执行页面 SEO 最佳实践——不是事后才想起，而是作为写作过程的内置层。

**在规划阶段**，标题被限制在搜索安全的长度内，元描述经过优化以提升点击率，规划器会分配 `primaryKeyword` 以及每节的 `targetKeywords`（每节 0–2 个），用户提供的与 LLM 生成的关键词适用相同的布局规则。**在写作阶段**，分层指南包（引言 / 正文 / 结尾）与关键词整合指南塑造布局——主关键词出现在标题和引言中，节级目标关键词出现在 BLUF 开篇段落中。**在章节写作之后**，默认开启的 `seo-check` 阶段运行确定性 lint，并在需要时通过五工具手术式编辑器智能体（默认 `errors-only` 通过模式；可选 `strict`）修复正文与元数据，而不重组文章结构。

**在写作阶段**，四个专门的 SEO 指南塑造每个长文章节：

- **页面要素** — 标题层级、BLUF 段落、关键要点模块和段落结构，针对人类读者和搜索爬虫双重优化
- **E-E-A-T 信号** — 仅编织提供的作者经验；竞争性观点与一手来源；不编造第一人称从业者故事
- **事实密度** — 超越显而易见的有实质价值；事实与引用仅在真正支撑章节时使用（软性长度目标，非硬性配额）
- **AI 搜索可提取性** — 信息类章节优先使用问句形标题、自洽段落、多选项对比表格，以及面向生成式答案可见性的反作弊规则

**可选 FAQ 区块** — 对于长文主输出上的信息类意图（`tutorial`、`how-to-guide`、`cornerstone`、`deep-dive-analysis`、`case-study`、`roundup-curation`），Ideon 可在结论后通过独立的 `sections:faq` LLM 调用追加 `## FAQ` 章节。可通过设置中的 `faqSection` 或 CLI 的 `--faq-section` / `--no-faq-section` 控制。试运行模式会生成占位 FAQ 内容，不调用 API。

没有关键词堆砌。没有 SEO 黑帽技巧。只有严谨的写作，恰好能在传统搜索结果和生成式 AI 摘要中表现出色。

---

## 您的模型，您做主

通过 OpenRouter 接入任何 LLM。无需更改工作流程即可切换模型。需要细腻表达时用 Claude，需要速度时用 GPT-4，或者使用 OpenRouter 支持的任何模型——Ideon 的工作方式始终一致。

---

## 基于久经考验的写作原则

Ideon 的写作引擎基于一种以指南为先的提示词组合系统，该系统汇编了大量真实写作建议和最佳实践。每次生成都遵循具体的规则：

- 结构和清晰度
- 具体而非模糊
- 节奏和可读性
- 主动语态和具体主语
- 渠道原生表达

没有通用的 AI 套话。没有过度润色的过渡句。只有严谨、听起来像人写的文字。

---

## 比技能更聪明，比原始提示更便宜

大多数 AI 内容工具把 LLM 当作一个万能黑箱，什么都往里塞。Ideon 不这么做。它用确定性的代码驱动整个流程——规划、编排、格式化、文件管理和状态跟踪——只在真正需要语言生成时才调用模型。

您只在关键时刻为 token 付费（起草正文、规划结构、扩展创意），而代码能更好完成的工作（解析参数、路由输出、管理运行、渲染 Markdown）绝不浪费 token。与那些把上下文窗口消耗在编排对话上的智能体技能或通用 LLM 工作流相比，Ideon 更精简、更快，而且在规模化使用时成本显著更低。

---

## 视觉叙事，自动化

以文章为主导的运行会通过 Replicate 自动生成封面和内嵌图片。您的内容看起来和读起来一样出色，直接从 CLI 输出。

---

## 为智能体和自动化而设计

Ideon 旨在融入现代智能体和 CI 工作流：

- **MCP 服务器** — 将 Ideon 工具暴露给 Claude Code、ChatGPT、Gemini 或任何 MCP 主机
- **智能体运行时注册** — `ideon agent install` 为支持的平台注册集成配置文件
- **非交互模式** — `ideon write --no-interactive` 移除所有提示，适用于 CI 和自动化
- **机器可读配置** — `ideon config list --json` 供智能体检查和编排
- **可恢复的运行** — 使用 `ideon write resume` 从上次中断处继续

---

## Google 关键词规划师集成

直接从 CLI 或通过 MCP 工具查询 Google Ads 中的真实关键词数据：

- **关键词建议** — 从种子关键词、URL 或网站生成相关关键词
- **历史指标** — 获取任何关键词的搜索量、竞争度和 CPC 数据
- **预测数据** — 预测关键词广告系列的展示量、点击量和费用

```bash
ideon gkp ideas --keywords seo,marketing --country US
ideon gkp historical --keywords seo --json
ideon gkp forecast --keywords seo --match-type EXACT --country US
```

使用 `ideon gads login` 一次性设置凭据，然后从 CLI 查询关键词数据或将其暴露给任何兼容 MCP 的智能体。

---

## 准备好发布更多内容了吗？

[开始使用 →](./getting-started/installation.md)

或者直接跳转到 [CLI 参考](./reference/cli-reference.md) 和 [写作指南](/writing-guide)。
