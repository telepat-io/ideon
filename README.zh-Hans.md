# Ideon

Ideon 是一款 AI 内容写作工具，可将一个想法转化为多格式、多风格、可发布的内容。

[🇺🇸 English](./README.md) | [🇨🇳 简体中文](./README.zh-Hans.md)

[![CI](https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/telepat-io/ideon/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/telepat-io/ideon/graph/badge.svg)](https://codecov.io/gh/telepat-io/ideon)
[![npm version](https://img.shields.io/npm/v/%40telepat%2Fideon)](https://www.npmjs.com/package/@telepat/ideon)
[![Docs](https://img.shields.io/badge/docs-live-1f6feb)](https://docs.telepat.io/ideon)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/telepat-io/ideon/blob/main/LICENSE)

## 为什么团队使用 Ideon

Ideon 帮助团队更快地从想法走到可发布内容，减少跨渠道重复改写的工作量。

一次运行，Ideon 可以：

- 基于同一核心想法生成多种输出类型：article、blog、newsletter、Reddit、LinkedIn、X thread、X post 等。
- 在所有输出中统一应用写作风格（`professional`、`friendly`、`technical`、`academic`、`opinionated`、`storytelling`）。
- 生成研究导向的内容 brief，补充相关链接，并在文章型任务中生成配图。
- 通过作业文件、可配置参数与断点恢复能力支持持续迭代。

这使 Ideon 适用于内容团队、开发者关系、产品营销、创始人以及需要按节奏进行多渠道写作的个人或团队。

## 快速开始

安装并完成第一次内容生成：

```bash
npm i -g @telepat/ideon
ideon settings
ideon write "How small editorial teams can productionize AI writing" --primary article=1 --secondary x-post=1
ideon preview
```

预期结果：

- 在 `output/<timestamp>-<slug>/` 下生成一个运行目录。
- 产出一个或多个可发布的 Markdown 输出。
- 保存 analytics 与元数据，便于复现与回溯。
- 本地预览自动打开，便于检查内容、链接与资源。

## 环境要求

- Node.js 20+
- npm 10+
- OpenRouter API key
- Replicate API token

## 核心能力

- 一次想法，多格式写作：article、blog、newsletter、Reddit、LinkedIn、X thread、X post、landing-page copy。
- 风格控制：按运行设置统一写作语气与表达风格。
- 研究与链接增强：生成规划 brief，并为内容补充相关链接。
- 图像生成：为文章型任务生成封面图与文内配图。
- 迭代能力：可通过不同目标/风格重复生成，支持中断恢复和作业文件复用。
- 本地审阅：在发布前通过浏览器预览内容与资源。

## 工作原理

Ideon 采用分阶段写作流水线：内容规划、正文生成、图像提示扩展、图像渲染、渠道内容生成，以及可选的链接增强。

运行时会合并 settings、环境变量、job 文件与 CLI 参数，并输出结构化产物，便于追踪与复用。

核心命令：

```bash
ideon settings
ideon config list --json
ideon write "An article idea" --primary article=1
ideon write --no-interactive --idea "An article idea" --primary article=1 --style technical --length medium
ideon write --job ./job.json
ideon write resume
ideon delete my-article-slug
ideon preview --no-open
ideon mcp serve
ideon agent status --json
```

Agent 集成范围：

- 支持：CLI 与 MCP runtime 工作流。
- 不支持：Cursor 与 VS Code runtime 集成。

## 安全与信任

- 默认通过 `ideon settings` 将密钥保存到系统钥匙串。
- 在 CI 或容器环境中，请使用 `IDEON_OPENROUTER_API_KEY` 和 `IDEON_REPLICATE_API_TOKEN`。
- 在无法访问钥匙串时设置 `IDEON_DISABLE_KEYTAR=true`。
- 生成内容来自模型输出，发布前请进行人工审阅。

如需报告安全问题，请通过仓库安全报告通道私下提交，或通过仓库 issue 渠道联系维护者并避免包含敏感细节。

## 文档与支持

- 文档站点：https://docs.telepat.io/ideon
- 语言支持：English 与 简体中文（`README.md` / `README.zh-Hans.md`，以及双语文档）
- 快速上手：`docs/getting-started/quickstart.md`
- CLI 参考：`docs/reference/cli-reference.md`
- 配置指南：`docs/guides/configuration.md`
- 故障排查：`docs/guides/troubleshooting.md`
- 仓库：https://github.com/telepat-io/ideon
- npm 包：https://www.npmjs.com/package/@telepat/ideon

## 贡献

欢迎贡献。请先阅读 `docs/contributing/development.md`（开发环境与质量门禁），再参考 `docs/contributing/releasing-and-docs-deploy.md`（发布与文档部署流程）。

如修改面向用户的文档内容，请在同一变更中同时更新 English 与 简体中文版本。

## 许可证

MIT。详见 [LICENSE](./LICENSE).
