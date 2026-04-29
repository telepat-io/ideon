<p align="center"><img src="./ideon-logo.webp" width="128" alt="Ideon"></p>
<h1 align="center">Ideon</h1>
<p align="center"><em>一个想法，无限格式。</em></p>

<p align="center">
  <a href="https://docs.telepat.io/ideon">📖 文档</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/ideon/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/ideon"><img src="https://codecov.io/gh/telepat-io/ideon/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/ideon"><img src="https://img.shields.io/npm/v/@telepat/ideon" alt="npm"></a>
  <a href="https://github.com/telepat-io/ideon/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Ideon 是一款 AI 内容写作工具，可将一个想法转化为多格式、多风格、可发布的内容。

## 它能解决什么问题

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
```

## 与 AI Agent 一起使用

Ideon 专为智能体工作流打造：

- **MCP 服务器** — `ideon mcp serve` 通过 stdio 暴露 5 个工具，覆盖内容生成、恢复、删除和配置管理。兼容 Claude Code、ChatGPT、Gemini 及任何通用 MCP 主机。
- **Agent 运行时注册** — `ideon agent install <runtime>` 为支持的平台注册集成配置文件。使用 `ideon agent status --json` 查看状态。
- **非交互模式** — `ideon write --no-interactive ...` 移除所有提示，适用于 CI 和自动化场景。
- **机器可读配置** — `ideon config list --json` 与 `ideon config get <key> --json` 供智能体 inspection。
- **Skill 包** — 将 `ideon-cli-skill/` 安装到智能体主机，获得覆盖安装、配置、操作与调试的完整生命周期 skill。
- **Agent 文档** — [For Agents](https://docs.telepat.io/ideon/for-agents) 涵盖 MCP 服务器、skill 与维护指南。

## 安全与信任

- 默认通过 `ideon settings` 将密钥保存到系统钥匙串。
- 在 CI 或容器环境中，请使用 `IDEON_OPENROUTER_API_KEY` 和 `IDEON_REPLICATE_API_TOKEN`。
- 在无法访问钥匙串时设置 `IDEON_DISABLE_KEYTAR=true`。
- 生成内容来自模型输出，发布前请进行人工审阅。

如需报告安全问题，请通过仓库安全报告通道私下提交，或通过仓库 issue 渠道联系维护者并避免包含敏感细节。

## 文档与支持

- [文档站点](https://docs.telepat.io/ideon)
- [快速上手](https://docs.telepat.io/ideon/getting-started/quickstart)
- [CLI 参考](https://docs.telepat.io/ideon/reference/cli-reference)
- [配置指南](https://docs.telepat.io/ideon/guides/configuration)
- [故障排查](https://docs.telepat.io/ideon/guides/troubleshooting)
- [For Agents](https://docs.telepat.io/ideon/for-agents)
- [仓库](https://github.com/telepat-io/ideon)
- [npm 包](https://www.npmjs.com/package/@telepat/ideon)

## 贡献

欢迎贡献。请先阅读 [Development](https://docs.telepat.io/ideon/contributing/development)（开发环境与质量门禁），再参考 [Releasing and Docs Deploy](https://docs.telepat.io/ideon/contributing/releasing-and-docs-deploy)（发布与文档部署流程）。

如修改面向用户的文档内容，请在同一变更中同时更新 English 与 简体中文版本。

## 许可证

MIT。详见 [LICENSE](./LICENSE)。
