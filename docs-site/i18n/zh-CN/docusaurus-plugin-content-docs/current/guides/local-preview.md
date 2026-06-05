---
title: 本地预览
description: 面向 Ideon 使用者与贡献者的本地预览说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 本地预览

Ideon 通过基于 React 的本地 Web 应用展示生成内容，便于你在一个界面中查看文案、资源、计划元数据与模型交互。

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

预览应用采用 Telepat 深色视觉系统（光晕背景、Poppins 字体、紫色强调色）。

### 顶栏

- 品牌标识与刷新控制
- **Info** 打开元数据抽屉（出版物、系列与生成上下文）
- **Actions** 菜单：复制 Markdown、下载 meta.json、打开源目录（复制生成路径）

### 左侧栏

- 按标题、摘要、关键词与 slug 搜索
- 出版物与系列下拉筛选（来自 Ideon 配置）
- 按日期分组的生成列表，有封面图时显示缩略图
- 每条记录可显示出版物与关键词徽章

### 主视图

当前生成提供三个标签页：

| 视图 | 用途 |
|------|------|
| **Content** | 按输出类型渲染的渠道预览框架（文章、博客、X 帖、LinkedIn 等），含格式标签、变体标签；长文类型提供章节目录 |
| **Plan & Assets** | 原始 idea、内容计划章节、图片画廊，以及 `meta.json` 中的风格/意图元数据 |
| **Logs** | 按阶段分组的 LLM 与图片交互检查器（`Prompt / Response` 与 `Full JSON`） |

出版物与系列为可选项。未关联的生成仍可正常预览，相关 UI 区块会自动隐藏。

### 内容格式预览

Content 标签页中，每种支持的 Ideon 输出类型都会映射到对应的渠道预览框架：

- 长文类型（`article`、`blog-post`、`science-paper`）会基于 `meta.json` 显示补充信息（封面、关键词、署名或摘要），并渲染真实 Markdown 正文；支持章节大纲滚动同步。
- 社交与分发类型（`x-post`、`x-thread`、`linkedin-post`、`reddit-post`、`newsletter`、`press-release`）将真实输出包裹在平台风格卡片中，并附带装饰性脚手架（头像、操作栏、静态互动占位等）。
- 作者信息优先来自已解析的出版物名称；缺失时使用中性预览标签。
- 装饰性 UI（评论、互动数、赞助区块等）为静态预览脚手架，并非流水线真实数据。
- 未知输出类型回退为通用 Markdown 排版。

## 运行时架构

`ideon preview` 由两层组成：

1. API + 静态服务（`src/server/previewServer.ts`）
2. React 客户端（`src/preview-app/`，由 Vite 构建到 `dist/preview/`）

启动时，服务端会尝试查找已构建的 React 客户端，并在 `/` 提供 `index.html`。

- 若 React 构建存在，则提供 SPA UI。
- 若构建缺失，则回退到服务端渲染外壳以保证预览可用。

## 预览 API 端点

React 应用从以下端点读取数据：

- `GET /api/bootstrap`：初始来源路径与当前生成选择
- `GET /api/articles`：生成列表（当 `meta.json` 存在时包含 `publication`、`series`、`keywords`）
- `GET /api/articles/:slug`：完整输出、类型化 `metaJson`，以及每个输出的 `markdownBody`
- `GET /api/publications`：已配置出版物（用于侧栏筛选与元数据抽屉）
- `GET /api/series`：已配置系列（用于侧栏筛选与元数据抽屉）
- `GET /api/generations/:generationId/assets/*assetPath`：按生成作用域提供资源

## 选择与回退行为

- 若省略 `markdownPath`，预览会递归选择最新 Markdown 输出。
- 若提供 `markdownPath`，在可找到时会将其对应生成作为初始选择。
- 若预览期间当前生成消失，刷新时会安全回退到最新仍存在的生成。
- 若无任何 Markdown，预览显示空状态而不会崩溃。
- 侧栏筛选会排除当前选中项时，自动改选第一个匹配生成。

## 预览指定文章

```bash
ideon preview ./output/my-article.md
```

如果你在本仓库中并希望一条命令完成预览客户端重建与启动，也可以运行：

```bash
npm run preview -- ./output/my-article.md
```

可选参数：

- `--port <port>` 使用其他端口
- `--no-open` 不自动打开浏览器

## 贡献者说明

若你在本地开发预览 UI：

1. 先构建 React 客户端：

```bash
npm run build:preview
```

2. 启动预览但不打开浏览器：

```bash
ideon preview --no-open
```

3. 修改 preview-app 代码后重新构建：

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

若出版物或系列筛选为空：

1. 使用 `ideon publication add` 创建出版物。
2. 使用 `ideon series add` 创建系列。
3. 重新生成内容，使 `meta.json` 记录所选出版物/系列 slug。
