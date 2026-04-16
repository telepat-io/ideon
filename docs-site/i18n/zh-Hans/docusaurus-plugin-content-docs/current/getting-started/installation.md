---
sidebar_position: 2
title: 安装
description: 面向 Ideon 使用者与贡献者的安装文档。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 安装

## 前置条件

- Node.js 20+
- npm 10+
- macOS/Linux/Windows 终端

## 全局安装

```bash
npm i -g @telepat/ideon
```

## 验证 CLI

```bash
ideon --help
```

## 首次配置

```bash
ideon settings
```

## 可选：从源码运行（贡献者流程）

```bash
git clone https://github.com/telepat-io/ideon.git
cd ideon
npm install
npm run build
npm link
ideon --help
```

## 常见安装问题

- `keytar` 构建/运行问题：请确保系统钥匙串 API 可用且 Node 版本受支持
- 容器或无头 Linux 环境（D-Bus/keyring 不可用）：设置 `IDEON_DISABLE_KEYTAR=true`，并通过环境变量提供 `IDEON_OPENROUTER_API_KEY` 与 `IDEON_REPLICATE_API_TOKEN`
- Node 版本不满足：切换到 Node 20+（兼容 ESM 与工具链）
- 输出目录写入权限问题：在 settings 或环境变量中覆盖输出目录
