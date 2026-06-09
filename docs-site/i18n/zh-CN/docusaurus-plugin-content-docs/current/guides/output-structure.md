---
title: 输出结构
description: 面向 Ideon 使用者与贡献者的输出结构说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 输出结构

Ideon 每次运行都会写入一个生成目录。每个生成目录包含一个或多个 Markdown 输出、运行定义 `job.json`、单次运行 analytics 文件、运行级模型交互文件、结构化元数据 sidecar（`meta.json`）以及共享图像资源。

Ideon 还会在 `.ideon/write/`（已加入 gitignore）保存本地写作会话产物，用于 resume。

## 默认路径

- Markdown directory: `/output`
- Asset directory: `/output/assets`
- Analytics file: `generation.analytics.json` inside each generation directory
- Model interactions file: `model.interactions.json` inside each generation directory
- Metadata sidecar: `meta.json` inside each generation directory
- Article plan file: `plan.md` inside each generation directory (for article-primary runs)

以 `/output` 开头的路径会相对于当前工作目录解析。

## 生成目录布局

示例：

```text
output/
  20260327-practical-ai-workflows/
    article-1.md
    x-thread-1.md
    x-post-1.md
    linkedin-1.md
    job.json
    plan.md
    meta.json
    generation.analytics.json
    model.interactions.json
    practical-ai-workflows-cover.webp
    practical-ai-workflows-inline-1.webp
```

Markdown 文件按内容类型前缀编号：

- `article-1.md`
- `blog-1.md`
- `x-thread-1.md`
- `x-post-1.md`
- `reddit-1.md`
- `linkedin-1.md`
- `newsletter-1.md`
- `landing-1.md`

## 文章 Markdown 内容

生成的 Markdown 包含：

- YAML frontmatter：
  - `title`
  - `subtitle`
  - `slug`
  - `description`
  - `keywords`
- H1 标题与副标题行
- 封面图嵌入（若存在）
- 导语正文
- 各章节正文（H2 标题）
- 按章节位置锚定的内嵌图片
- 结论部分

## Slug 行为

文章 slug 会在规划阶段标准化。生成目录名带时间戳，并在每次运行中保持唯一。

## 资源链接

Markdown 嵌入使用从 Markdown 文件位置到资源文件的相对路径。

## Analytics 文件

每次生成都会在生成目录输出 `generation.analytics.json`。

JSON 包含：

- 运行摘要：总耗时、总重试次数、总成本（可用时）
- 阶段指标：各阶段耗时、重试与阶段成本
- 图像提示调用：每个图像提示扩展的耗时/成本与 token 使用（可用时）
- 图像渲染调用：每次渲染的耗时/成本与输出字节大小
- SEO 检查调用：每个编辑器智能体循环轮次一条记录，含操作 ID（`seo-check:editor-agent:turn-N`）、耗时/成本、token 使用量及该轮请求的工具名称

要在浏览器中查看生成的 Markdown 与图片嵌入，可运行 `ideon preview`。

## 模型交互文件

每次生成还会在目录中输出 `model.interactions.json`。

JSON 包含：

- 运行封装：`runId`、`runMode`、`dryRun`、`startedAt`、`endedAt`
- `llmCalls`：每次 OpenRouter 尝试一条记录，含阶段/操作 ID、请求类型、原始序列化请求体、原始响应体、耗时、尝试/重试与最终状态
- `editorToolCalls`：每次本地 SEO 编辑器工具执行一条记录，含轮次索引、工具名、参数、JSON 结果与耗时（无 LLM 成本）
- `t2iCalls`：每次图像渲染尝试一条记录，含阶段/操作 ID、原始提示词、解析后的 T2I 输入、耗时、重试与最终状态

该文件用于提示工程与故障分析，因此会有意保留原始 payload。

## 作业定义文件

每次运行也会在生成目录输出 `job.json`，记录最终解析后的运行定义：

- 本次运行使用的 `idea` 与 `prompt`
- 可选 `targetAudience` 种子（显式提供或继承自作业文件）
- 解析后的 `contentTargets` 与 `style`
- 完整解析后的 `settings` 对象（含当前与未来字段）
- 源作业 payload（若提供，字段为 `sourceJob`）
- 运行元数据（`generatedAt`、`dryRun`、`runMode`）

示例结构：

```json
{
  "idea": "How teams can operationalize content systems",
  "prompt": "How teams can operationalize content systems",
  "targetAudience": "Content operators building repeatable publishing systems",
  "settings": {
    "model": "deepseek/deepseek-v4-pro",
    "modelSettings": { "temperature": 0.7, "maxTokens": 4000, "topP": 1 },
    "modelRequestTimeoutMs": 90000,
    "t2i": { "modelId": "black-forest-labs/flux-schnell", "inputOverrides": {} },
    "markdownOutputDir": "/output",
    "assetOutputDir": "/output/assets",
    "contentTargets": [{ "contentType": "article", "role": "primary", "count": 1 }],
    "style": "professional"
  },
  "sourceJob": null,
  "generatedAt": "2026-03-27T10:20:00.000Z",
  "dryRun": false,
  "runMode": "fresh"
}
```

## 元数据 Sidecar（`meta.json`）

每次生成都会在生成目录输出结构化 `meta.json` sidecar，将内容级元数据整合为单一机器可读文件。

JSON 包含：

- `version`：模式版本（当前为 `1`）
- `title`、`slug`、`idea`、`description`：核心内容元数据
- `subtitle`、`keywords`、`angle`：长文元数据（缺失时为 null）
- `contentType`、`style`、`intent`、`targetLength`：生成设置
- `cover`：封面图元数据（`path`、`relativePath`、`description`）或 `null`
- `sections`：章节标题与描述数组（短文为空）
- `images`：所有渲染图片（封面与内嵌）的路径、描述与锚点位置
- `outputs`：所有 Markdown 输出文件的内容类型与路径
- `seoCheck`（若存在）：lint 结果（`passed` 遵循 `seoCheckMode`）、`seoCheckMode`、`warningsRemaining`、完整 `issues[]`、编辑器轮次与编辑器 pass 成本摘要
- `author`（若存在）：本次运行解析到的作者 slug
- `editorialChecklist`：动态发布前清单（署名、AI 披露、作者分配、占位符、数据核验、有用内容自评）
- `generatedAt`：ISO 时间戳
- `generationDir`：生成目录的绝对路径

`ideon export` 导出时会连同 Markdown 与图片一并复制 `meta.json`。

## 本地会话产物

- 会话状态文件：`~/.ideon/sessions/<project-hash>/state.json`（OS 特定配置目录）
- 包含已保存阶段输出（plan、章节草稿、图像元数据、最终产物摘要）
- fresh 运行会覆盖之前的会话产物
- `ideon write resume` 依赖该状态在失败或中断后继续
- 会话状态存储在用户 home 配置目录，按项目路径哈希索引

目录隔离示例：

- 在 `~/project-a` 运行时，会创建并从同一会话恢复，无需关心当前目录
- 在 `~/project-b` 运行时，会使用独立会话，按其自身项目路径索引
- 旧版 `.ideon/write/state.json` 文件会在首次恢复时自动迁移

关键状态字段：

- `status`：`running`、`failed` 或 `completed`
- `lastCompletedStage`：最近一次检查点阶段 ID
- `failedStage` 与 `errorMessage`：最近失败元数据
- `plan`、`text`、`imagePrompts`、`imageArtifacts`：resume 使用的阶段缓存产物
- `artifact`：最终输出摘要（`markdownPaths`、`generationDir`、`analyticsPath`、`interactionsPath` 及数量）
