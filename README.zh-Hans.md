# Ideon

Ideon 通过单一 CLI 流程，将一个想法转化为多渠道的高质量 Markdown 内容，并可选生成配图。

[🇺🇸 English](./README.md) | [🇨🇳 简体中文](./README.zh-Hans.md)

[![CI](https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/telepat-io/ideon/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/telepat-io/ideon/graph/badge.svg)](https://codecov.io/gh/telepat-io/ideon)
[![npm version](https://img.shields.io/npm/v/%40telepat%2Fideon)](https://www.npmjs.com/package/@telepat/ideon)
[![Docs](https://img.shields.io/badge/docs-live-1f6feb)](https://docs.telepat.io/ideon)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/telepat-io/ideon/blob/main/LICENSE)

## 它解决什么问题

Ideon 帮助小型内容和产品团队稳定产出高质量内容，无需手动编排选题规划、正文撰写、图像提示和产物打包。

常见使用场景：

- 一次运行同时生成长文主内容和社交渠道变体。
- 在 CI 或本地工作流中通过 JSON 作业文件实现可复现输出。
- 从本地检查点恢复中断的生成任务。
- 发布前在本地预览生成的 Markdown 与资源。

## 快速开始

安装并运行第一次生成：

```bash
npm i -g @telepat/ideon
ideon settings
ideon write "How small editorial teams can productionize AI writing" --primary article=1 --secondary x-post=1
ideon preview
```

预期结果：

- 在 `output/<timestamp>-<slug>/` 下生成一个运行目录。
- 产出 Markdown 文件与 analytics 文件。
- 本地预览自动打开，便于检查内容与资源链接。

## 环境要求

- Node.js 20+
- npm 10+
- OpenRouter API key
- Replicate API token

## 工作原理

Ideon 运行分阶段流水线：

1. 从 settings、环境变量、作业文件与 CLI 参数解析配置和密钥。
2. 根据请求目标生成共享 brief 与内容计划。
3. 生成章节内容与可选渠道输出。
4. 在适用时扩展图像提示并渲染图像资源。
5. 组装 Markdown 输出与 analytics 产物。
6. 可选执行链接增强，并通过本地预览查看结果。

核心命令：

```bash
ideon settings
ideon write "An article idea" --primary article=1
ideon write --job ./job.json
ideon write resume
ideon delete my-article-slug
ideon preview --no-open
```

## 安全与信任

- 默认通过 `ideon settings` 将密钥保存到系统钥匙串。
- 在 CI 或容器环境中，请使用 `IDEON_OPENROUTER_API_KEY` 和 `IDEON_REPLICATE_API_TOKEN`。
- 在无法访问钥匙串时设置 `IDEON_DISABLE_KEYTAR=true`。
- 生成内容来自模型输出，发布前请进行人工审阅。

如需报告安全问题，请通过仓库安全报告通道私下提交，或通过仓库 issue 渠道联系维护者并避免包含敏感细节。

## 文档与支持

- 文档站点：https://docs.telepat.io/ideon
- 快速上手：`docs/getting-started/quickstart.md`
- CLI 参考：`docs/reference/cli-reference.md`
- 配置指南：`docs/guides/configuration.md`
- 故障排查：`docs/guides/troubleshooting.md`
- 仓库：https://github.com/telepat-io/ideon
- npm 包：https://www.npmjs.com/package/@telepat/ideon

## 贡献

欢迎贡献。请先阅读 `docs/contributing/development.md`（开发环境与质量门禁），再参考 `docs/contributing/releasing-and-docs-deploy.md`（发布与文档部署流程）。

## 许可证

MIT。详见 [LICENSE](./LICENSE).
