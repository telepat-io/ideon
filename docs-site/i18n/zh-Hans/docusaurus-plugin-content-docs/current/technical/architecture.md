---
title: 架构
description: 面向 Ideon 使用者与贡献者的架构说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 架构

Ideon 采用模块化 CLI 流水线架构，支持生成目录输出与阶段产物可恢复。

## 高层执行流程

1. Resolve config and secrets
2. Build generation directory and run metadata (`job.json`)
3. Conditionally run article planning + section writing
4. Conditionally expand image prompts + render assets
5. Write one or more output markdown files + analytics

## 模块边界

- `src/bin`: executable entrypoint
- `src/cli`: command layer and rendering
- `src/config`: schema, env parsing, merging, persistence
- `src/pipeline`: orchestration and stage state
- `src/generation`: article planning/writing + non-article single-shot generation
- `src/llm`: OpenRouter client and prompt builders
- `src/images`: Replicate client + image pipeline
- `src/models/t2i`: model registry + override coercion
- `src/output`: markdown and filesystem utilities
- `src/server`: local preview server, generation discovery helpers, API routes
- `src/preview-app`: React + Ant Design preview client (Vite-built static app)
- `src/types`: domain and validation schemas

## 阶段契约

每个阶段都包含：

- `id`
- `title`
- `status`
- `detail`
- optional `summary`

该契约同时驱动 Ink UI 与纯文本渲染输出。

## 输出模型

每次运行会写入一个生成目录：

- numbered markdown outputs (`article-1.md`, `x-thread-1.md`, `x-post-1.md`, etc.)
- `job.json` with resolved run definition metadata
- `generation.analytics.json`
- shared assets for that generation

预览与删除操作都基于该生成结构执行。

## 预览子系统

预览由两层协作组成：

1. `src/server/previewServer.ts` (Express server)
2. `src/preview-app/*` (React SPA)

服务端负责：

- generation discovery and initial selection
- API endpoints for bootstrap, list, and article detail payloads
- generation-scoped asset serving
- serving static client files from `dist/preview`
- graceful fallback HTML shell when client build is unavailable

React 应用负责：

- generation navigation and output variant switching
- channel-specific markdown presentation
- interaction inspection (`Prompt / Response` and `Full JSON` modes)
- light/dark theme UX and persisted theme preference

构建路径：

- Vite builds `src/preview-app` into `dist/preview`
- `npm run build` includes `npm run build:preview`
- `ideon preview` launches the preview server and app
- `npm run preview` (repo convenience script) builds preview client first, then launches `ideon preview`

## 错误边界策略

- 阶段失败会被局部化并清晰展示
- 已处理的 CLI 错误避免重复堆栈输出
- 未知失败仍返回非零退出码
