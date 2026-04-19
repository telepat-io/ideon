---
title: 内容类型
description: 面向 Ideon 使用者与贡献者的内容类型参考文档。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 内容类型

Ideon 支持以下生成目标：

## `article`

- 最适合：长篇主内容。
- 常见结构：标题、导语、分节、结论、图片嵌入。
- 常见输出：具备可复用叙事上下文的长文草稿，可用于渠道分发。

## `blog-post`

- 最适合：知识型发布与 SEO 导向的解释性内容。
- 常见结构：清晰开篇、小标题、可执行结论。

## `x-thread`

- 最适合：在 X 上发布多条串联的解释型内容。
- 常见结构：先钩子后展开、编号线程、叙事推进清晰。
- 常见输出：线程形态内容，每一条都推进同一叙事主线。

## `x-post`

- 最适合：短内容分发。
- 常见结构：先钩子、短句式表达。
- 常见输出：单条精炼内容，保留本次生成风格并优先保证钩子密度与节奏。

## `reddit-post`

- 最适合：社区讨论与一线实践反馈。
- 常见结构：直白、真诚，包含实操细节。

## `linkedin-post`

- 最适合：专业观点传播与分发。
- 常见结构：两行钩子、短段落分隔、聚焦收束。

## `newsletter`

- 最适合：面向订阅者的周期性沟通。
- 常见结构：强开场、紧凑分节、过渡清晰。
- 常见输出：适配周期更新节奏的编辑型内容。

## `press-release`

- 最适合：正式公告与面向多方干系人的信息发布。
- 常见结构：标题、导语、公告细节、可引用语句、时间与背景说明。

## `science-paper`

- 最适合：研究密集型或证据优先的长内容。
- 常见结构：研究背景、方法说明、结果、局限性与影响讨论。

## 多输出行为

- 每次运行都必须有且仅有一个主输出，可附带多个次输出。
- 次输出可以使用主输出生成内容作为锚定上下文。
- 当主输出为 `article` 时，Ideon 使用结构化文章规划与写作流程。
- 当主输出为非文章类型时，Ideon 使用通用主输出生成流程，并仍会渲染主封面图。

## 选择建议

- 当你需要一份主叙事并派生多个分发版本时，使用 `article` 主输出 + 若干次输出。
- 当你想做轻量活动创意与快速迭代时，使用纯渠道目标。
- 解释型系列建议使用 `x-thread`，快速单条分发建议使用 `x-post`。

## 风格（Styles）

Ideon 支持以下运行级风格：

- `academic`
- `analytical`
- `authoritative`
- `conversational`
- `empathetic`
- `friendly`
- `journalistic`
- `minimalist`
- `persuasive`
- `playful`
- `professional`
- `storytelling`
- `technical`

## 意图（Intents）

Ideon 支持以下运行级意图：

- `announcement`
- `case-study`
- `cornerstone`
- `counterargument`
- `critique-review`
- `deep-dive-analysis`
- `how-to-guide`
- `interview-q-and-a`
- `listicle`
- `opinion-piece`
- `personal-essay`
- `roundup-curation`
- `tutorial`

## 多目标示例

```bash
ideon write "AI workflow launch" \
  --primary article=1 \
  --secondary x-thread=2 \
  --secondary x-post=1 \
  --secondary linkedin-post=1 \
  --style technical \
  --intent tutorial
```