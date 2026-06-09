---
title: 流水线阶段
description: 面向 Ideon 使用者与贡献者的流水线阶段说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 流水线阶段

Ideon 运行一个八阶段流水线，提供实时状态更新与阶段级 analytics。

阶段执行取决于主内容类型：

- Article 主输出：完整结构化文章流程（plan -> sections -> image prompts -> image rendering），随后生成次输出。
- 非 article 主输出：通用主输出流程（`Planning Primary Content` 与 `Generating Primary Content`），渲染一张主封面图后再生成次输出。

## 阶段流程

1. Planning Primary Article or Planning Primary Content
2. Writing Sections or Generating Primary Content
3. SEO Check（确定性 lint + 可选五工具手术式编辑器智能体；默认 `errors-only` 通过模式）
4. Expanding Image Prompts
5. Rendering Images
6. Generating Channel Content
7. Enriching Links

在主内容规划前始终执行：

1. Planning Shared Plan

非 article 主路径：

- `shared-plan`：执行
- `planning`：确定非文章主类型的主方向
- `sections`：执行通用主输出生成
- `image-prompts`、`images`：准备并渲染一张主封面图
- `output`：仅基于主输出锚定上下文生成次输出
- `links`：仅在启用 `--enrich-links` 时执行，并对符合条件的输出写入 sidecar 链接元数据

## 阶段 UI 信号

- `pending`: not started
- `running`: currently executing
- `succeeded`: completed successfully
- `failed`: errored with detail

实时 TTY UI 为保持紧凑会隐藏 pending 行。它显示：

- currently running stage and item
- completed history
- failed rows
- 当阶段因瞬时错误进入重试时，会在阶段详情中显示重试上下文（`retried Nx` 与最近一次重试错误）

条目历史使用终端自适应窗口渲染，使长任务在小终端中仍保持可读，并保留最近进度。

## 执行期间更新

- Section 阶段报告当前章节索引/标题
- Image-prompt 阶段报告当前提示扩展进度
- Image-render 阶段报告当前渲染进度
- Output 阶段报告次输出逐项生成进度与最终生成目录
- Links 阶段报告逐项链接增强与 sidecar 元数据写入
- 阶段进入 `succeeded` 时，CLI 会输出该阶段 analytics（耗时与可用成本）
- 非 TTY/plain 输出同样会输出 running 阶段详情变化，因此在非交互模式下也能看到重试/错误进度

对于会产生多个工作单元的阶段，Ideon 会输出条目级状态行，状态模型同样为（`pending`、`running`、`succeeded`、`failed`）。

示例：

- 章节写作条目更新（`Introduction`、`Section 2/N`、`Conclusion`）
- 次输出条目更新（`x post 1/10`、`linkedin post 2/3`）
- 链接增强条目更新（`article-1`、`linkedin-1`）

每个条目运行中显示 spinner，成功后立即输出该条目 analytics。

## Analytics 采集内容

每次生成运行，Ideon 记录：

- 全部七个阶段的耗时（ms）
- 外部 API 调用的阶段重试次数
- 可用定价数据下的阶段总成本
- 图像提示扩展调用指标（耗时、重试、token 使用、成本）
- 图像渲染调用指标（耗时、重试、输出字节、成本）
- 输出条目调用指标（耗时、重试、成本）
- 链接增强条目调用指标（耗时、重试、成本、短语数量）

Analytics 会写入每个生成目录下的 `generation.analytics.json`。

流水线结束时，CLI 还会显示运行总耗时、总重试与总成本汇总。
同时还会给出按阶段拆分的成本明细，便于定位本次运行的成本主要来自哪些阶段。

## 失败语义

当某阶段失败时：

- 当前运行阶段会被标记为 failed 并附带详情
- 已完成阶段保持 succeeded
- 其余阶段保持 pending
- 错误会冒泡到 CLI，并以清晰用户提示呈现

## Resume 语义

- 每个已完成阶段的检查点都会持久化到会话状态文件。
- 检查点存储在用户配置目录，按项目路径索引。
- `ideon write resume` 会加载已保存产物，并跳过已完成阶段。
- resume 可从任意目录执行——会话状态不再绑定工作目录。
- 当前 resume 在阶段边界做检查点，因此阶段内未完成工作会从该阶段重试。
- 即使会话已完成，也可通过 resume 从缓存状态重建下游缺失产物。

## 中断行为

- 当存在写作会话时，`Ctrl+C`（SIGINT）与 SIGTERM 会被记录为失败会话。
- Ideon 会将中断信息写入会话状态，使 `ideon write resume` 可从最近完成阶段继续。

## Dry-Run 行为

- 阶段编排仍会执行并产出 analytics。
- 会跳过外部 OpenRouter 与 Replicate 调用。
- 仍会写出输出产物，便于在不消耗提供方成本下验证目录结构与编排。

## SEO Check 阶段行为

- 默认在长文主内容的章节写作之后运行。
- **确定性 lint** 检查标题/描述长度、主关键词布局、关键词覆盖、BLUF 开篇（首段或 `**Key takeaway:**` 块 ≥40 词）与事实密度启发式。
- **通过模式**（`seoCheckMode`，默认 `errors-only`）：
  - `errors-only`：无 `severity: error` 的 lint 问题时阶段通过；警告会记录但不触发智能体。
  - `strict`：仅当零 lint 问题时通过；任何警告都会触发编辑器智能体。
- **智能体触发：** `errors-only` 仅在存在错误时运行；`strict` 在任何问题存在时运行；`force`（`--seo-check` / `ideon_run_seo_check`）始终运行智能体路径。
- 触发且 OpenRouter 可用时，**手术式 SEO 编辑器智能体**使用五个正文/元数据工具，上下文包含完整草稿、关键词整合指南与内联问题手册。
- **CLI / 配置：** `--seo-check-mode <errors-only|strict>`、`--seo-check-max-turns <n>`（1–20，默认 10）；设置文件中的 `seoCheckMode` 与 `seoCheckMaxTurns`。MCP `ideon_write`、`ideon_write_resume`、`ideon_run_seo_check` 接受相同可选参数。
- **工具反馈：** 每次工具调用返回 `remainingErrors`、`remainingWarnings`、`remainingIssues`。
- **跳过：** `ideon write` 使用 `--no-seo-check`。
- **重新运行：** `ideon write resume --seo-check` 或 MCP `ideon_run_seo_check`。

## Output 阶段行为

- 主输出始终最先生成，并写为 `<primary-prefix>-1.md`。
- 次输出会按内容类型展开为编号文件（`x-thread-1.md`、`x-post-1.md` 等）。
- article 主输出使用章节生成产物；非 article 主输出使用单次主内容生成。
- 次输出会锚定到主输出上下文。
- Output 阶段还会写入包含解析后运行定义的 `job.json`。
- 输出进度会在 CLI 中按条目显示，并在 analytics 的 `outputItemCalls` 中持久化。

## Links 阶段行为

- 链接增强使用已配置模型，并启用 OpenRouter web search 插件。
- 链接增强是面向符合条件的长内容 markdown 输出的后处理链接建议流程。
- Ideon 会先选出可链接表达，再结合段落上下文为每个表达解析最匹配 URL。
- 链接数据写入 Markdown 输出旁的 sidecar 文件（例如 `article-1.links.json`），格式为 v2：`{ version: 2, customLinks: [...], links: [...] }`。
- 原始 Markdown 文件保持不变；预览服务在渲染时应用 sidecar 链接。
- 在 `ideon write` 与 `ideon write resume` 中，该阶段默认关闭，需通过 `--enrich-links` 显式启用。
- 默认跳过短内容渠道（`x-post`、`x-thread`）的链接增强。
- **自定义链接**（`--link "expression->url"`）单独存储，无论 `--mode fresh` 与否始终保留。使用 `--unlink <expression>` 删除自定义链接。
- 自定义链接具有优先级：若 LLM 选取的 expression 已有自定义链接，该生成条目将被忽略。
- **最大链接数**（`--max-links <n>`）限制生成链接数量，默认根据目标字数决定：≤700 词→5，≤1150 词→8，>1150 词→12。
