<p align="center"><img src="./assets/avatar/ideon-logo.webp" width="128" alt="Ideon"></p>
<h1 align="center">Ideon</h1>
<p align="center"><em>将一个创意转化为文章、话题串和社交媒体帖子——高质量内容，更低 token 成本。</em></p>

<p align="center">
  <a href="https://docs.telepat.io/ideon">📖 文档</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
  · <a href="./README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/ideon/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/ideon"><img src="https://codecov.io/gh/telepat-io/ideon/graph/badge.svg" alt="Codecov"></a>
  <a href="https://sonarcloud.io/summary/new_code?id=telepat-io_ideon"><img src="https://sonarcloud.io/api/project_badges/measure?project=telepat-io_ideon&metric=alert_status" alt="Quality Gate Status"></a>
  <a href="https://www.npmjs.com/package/@telepat/ideon"><img src="https://img.shields.io/npm/v/@telepat/ideon" alt="npm"></a>
  <a href="https://github.com/telepat-io/ideon/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Ideon 是一款 AI 内容写作工具，可将一个想法转化为多格式、多风格、可发布的内容。只需描述一次主题，Ideon 就为您生成文章，以及 X 话题串、LinkedIn 帖子、Reddit 帖子、新闻通讯和博客文章——共享同一种声音和策略。

专为营销人员、创始人和精简团队打造，帮助他们大规模发布高质量内容，而无需为每个渠道手动重写同一创意。

## 功能特性

- **写一次，处处发布** — 一次运行将一个创意转化为文章、博客、新闻通讯、X、LinkedIn 和 Reddit 帖子。文章是核心，其余均为推广内容。
- **风格与意图控制** — 13 种风格 × 13 种意图。所有输出共享同一种一致的声音。
- **出版物与系列** — 通过出版物组织内容编辑策略，通过系列将相关文章归组到共享主题、默认值和主题提示注入下。
- **研究支撑的链接** — Ideon 浏览网络并像人类作者一样插入与上下文相关的外部链接。无需手动研究。
- **SEO 优化输出** — 页面 SEO、E-E-A-T 可信度信号和事实密度已融入写作流水线。章节写作后，默认开启的 `seo-check` 阶段会 lint 关键词布局，并在需要时运行手术式编辑器智能体（默认 `errors-only`；`--seo-check-mode strict` 为零警告）。生成的内容针对传统搜索和 AI 生成摘要进行了排名优化。
- **通过 OpenRouter 接入任何模型** — 接入 Claude、GPT-4 或任何支持的模型。无需更改工作流程即可切换。
- **写作指南驱动** — 提示词组合基于经过实践检验的写作原则汇编而成。没有通用 AI 套话。
- **代码驱动的高效率** — 确定性流水线代码处理编排。您只需在起草正文时支付 token 费用。
- **视觉叙事** — 通过 Replicate 为文章型运行自动生成封面和内嵌图片。
- **Agent 与 CI 就绪** — MCP 服务器、非交互模式、机器可读配置、可恢复的运行。

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

Ideon 采用分阶段写作流水线：内容规划、章节写作、SEO lint 与可选编辑器修订、图像提示扩展、图像渲染、渠道内容生成，以及可选的链接增强。

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
ideon gads login
ideon gkp ideas --keywords seo,marketing
```

## 与 AI Agent 一起使用

Ideon 专为智能体工作流打造：

- **MCP 服务器** — `ideon mcp serve` 通过 stdio 暴露工具，覆盖内容生成、恢复、删除、配置管理与 Google Keyword Planner 查询。兼容 Claude Code、ChatGPT、Gemini 及任何通用 MCP 主机。
- **Agent 运行时注册** — `ideon agent install <runtime>` 为支持的平台注册集成配置文件。使用 `ideon agent status --json` 查看状态。
- **非交互模式** — `ideon write --no-interactive ...` 移除所有提示，适用于 CI 和自动化场景。
- **机器可读配置** — `ideon config list --json` 与 `ideon config get <key> --json` 供智能体 inspection。
- **Skill 包** — 安装 `skill/ideon-cli/` 用于全生命周期写作工作流，并安装 `skill/ideon-plan/` 用于审批门控的内容规划与基于 GKP 的策略工作流。
- **Agent 文档** — [For Agents](https://docs.telepat.io/ideon/for-agents) 涵盖 MCP 服务器、skill 与维护指南。

## 安全与信任

- 默认通过 `ideon settings` 将密钥保存到系统钥匙串。
- 在 CI 或容器环境中，请使用 `TELEPAT_OPENROUTER_KEY` 和 `TELEPAT_REPLICATE_TOKEN`。
- 在无法访问钥匙串时设置 `TELEPAT_DISABLE_KEYTAR=true`。
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
