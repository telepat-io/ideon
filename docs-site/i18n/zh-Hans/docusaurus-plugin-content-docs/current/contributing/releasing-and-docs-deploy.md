---
title: 发布与文档部署
description: 面向 Ideon 使用者与贡献者的发布与文档部署说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 发布与文档部署

## 包发布前检查

在打发布标签前执行：

```bash
npm run typecheck
npm test
npm run build
```

确认 `package.json` 使用公开作用域包：

- name: `@telepat/ideon`
- publish access: `public`

## npm 自动发布

仓库 `telepat-io/ideon` 通过 GitHub Actions 自动发布到 npm。

触发条件：

- 推送 `vX.Y.Z` 格式标签（例如 `v1.2.3`）
- 打标签的提交必须可从 `main` 可达
- 标签版本必须与 `package.json` 版本完全一致

工作流行为：

1. 校验标签格式与提交祖先关系
2. 校验包名为 `@telepat/ideon`
3. 执行发布质量门禁（`lint`、`test`、`build`、`docs:build`）
4. 使用 provenance 发布到 npm

### Trusted Publishing 前置要求

本仓库使用 npm Trusted Publishing（OIDC），不使用 `NPM_TOKEN`。

请在 npm 中为 `@telepat/ideon` 配置 trusted publisher：

- provider: GitHub Actions
- repository: `telepat-io/ideon`
- workflow: `.github/workflows/npm-publish.yml`

## 文档部署目标

文档部署到 GitHub Pages：

- repository: `telepat-io/ideon`
- url: `https://docs.telepat.io`
- baseUrl: `/ideon/`

## 部署流程

GitHub Actions 工作流会：

1. 检出仓库
2. 安装文档依赖
3. 构建 Docusaurus 静态产物
4. 上传 Pages artifact
5. 部署到 GitHub Pages

## 运维说明

- 在仓库设置中将 GitHub Pages 来源设置为 GitHub Actions
- 当 main 分支上的文档/内容路径变更时触发部署
- 确保 workflow token 具备 Pages 权限
