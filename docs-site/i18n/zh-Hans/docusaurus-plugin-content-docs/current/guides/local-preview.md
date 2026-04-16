---
title: 本地预览
description: 面向 Ideon 使用者与贡献者的本地预览说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 本地预览

Ideon 通过基于 React 的本地 Web 应用展示生成内容，便于你在一个界面中查看文案、资源和模型交互。

## 快速开始

从输出目录提供最近一次生成批次：

```bash
ideon preview
```

该命令会：

- 在 `http://localhost:4173` 启动本地服务
- 提供已构建的 React 预览客户端（`dist/preview`）
- 通过预览 API 端点加载生成元数据
- 从已配置的资源输出目录提供本次生成资源
- 自动打开默认浏览器

## UI 中可见内容

### 左侧栏

- 每个生成目录对应一条记录
- 显示标题、时间戳和摘要预览
- 提供快速刷新按钮

### 主内容区

- 紧凑摘要行（来源路径、生成数、输出数、交互数）
- 当前生成的标题与 slug
- 顶层渠道标签（`article`、`x-post`、`linkedin-post` 等）
- 每个渠道内的变体标签（`Article 1`、`X Post 2` 等）
- 当前选中输出的 Markdown 渲染正文

### 日志视图

- 按阶段分组的交互列表（`shared-brief`、`planning`、`sections`、`image-prompts`、`images`、`output`、`links`）
- 单次调用检查器，显示元数据（模型、状态、耗时）
- `Prompt / Response` 与 `Full JSON` 模式切换

## 运行时架构

`ideon preview` 由两层组成：

1. API + static server (`src/server/previewServer.ts`)
2. React client app (`src/preview-app/`, built by Vite into `dist/preview/`)

启动时，服务端会尝试查找已构建的 React 客户端，并在 `/` 提供 `index.html`。

- 若 React 构建存在，则提供 SPA UI。
- 若构建缺失，则回退到服务端渲染外壳以保证预览可用。

## 预览 API 端点

React 应用从以下端点读取数据：

- `GET /api/bootstrap`: initial source-path and active-generation selection
- `GET /api/articles`: generation list for the left rail
- `GET /api/articles/:slug`: full output + interaction payload for one generation
- `GET /api/generations/:generationId/assets/*assetPath`: generation-scoped asset serving

## 选择与回退行为

- 若省略 `markdownPath`，预览会递归选择最新 Markdown 输出。
- 若提供 `markdownPath`，在可找到时会将其对应生成作为初始选择。
- 若预览期间当前生成消失，刷新时会安全回退到最新仍存在的生成。
- 若无任何 Markdown，预览显示空状态而不会崩溃。

## 主题行为

- 首次加载遵循系统颜色方案（`prefers-color-scheme`）。
- 明暗主题切换会持久化到 local storage。
- 应用使用 Ant Design 主题 token 与自定义 CSS 呈现渠道特定输出卡片。

## 预览指定文章

```bash
ideon preview ./output/my-article.md
```

如果你在本仓库中并希望一条命令完成预览客户端重建与启动，也可以运行：

```bash
npm run preview -- ./output/my-article.md
```

可选参数：

- `--port <port>` to use a different port
- `--no-open` to skip automatic browser launch

## 贡献者说明

若你在本地开发预览 UI：

1. Build the React client once:

```bash
npm run build:preview
```

2. Start preview without opening a browser:

```bash
ideon preview --no-open
```

3. Rebuild the client when preview-app code changes:

```bash
npm run build:preview
```

`npm run preview` 是仓库提供的可选便捷脚本，可同时执行预览构建与服务启动。

## 故障排查

若 Ideon 报告未找到已生成内容：

1. 先执行生成命令（`ideon write "your idea"`）。
2. 在 `ideon settings` 中确认输出目录配置。
3. 若 Markdown 位于其他目录，请为 `ideon preview` 传入显式路径。

若默认端口启动失败：

1. 使用其他端口启动：`ideon preview --port 8080 --no-open`
2. 检查本地 `4173` 端口冲突。

若 UI 变更未生效：

1. 重新执行 `npm run build:preview`。
2. 浏览器强制刷新。
3. 确认 `dist/preview/index.html` 时间戳为最新。

若图片未加载：

1. 确认预览指向与生成相同的工作区输出根目录。
2. 确认 Markdown 使用相对生成目录的资源路径。
3. 打开浏览器开发者工具，确认 `/api/generations/:id/assets/...` 返回 `200`。
