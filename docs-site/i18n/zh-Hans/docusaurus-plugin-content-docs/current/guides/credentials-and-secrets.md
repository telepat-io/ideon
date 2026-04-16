---
title: 凭据与密钥
description: 面向 Ideon 使用者与贡献者的凭据与密钥说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 凭据与密钥

实时生成需要两个提供方凭据。

## 必需密钥

- `IDEON_OPENROUTER_API_KEY`
- `IDEON_REPLICATE_API_TOKEN`

## 推荐配置方式

使用设置流程将密钥保存到系统钥匙串：

```bash
ideon settings
```

CLI 通过钥匙串集成持久化密钥，而不是明文配置。

## 环境变量替代方案

Bash/zsh:

```bash
export IDEON_OPENROUTER_API_KEY=your_openrouter_key
export IDEON_REPLICATE_API_TOKEN=your_replicate_token
```

Fish:

```fish
set -x IDEON_OPENROUTER_API_KEY your_openrouter_key
set -x IDEON_REPLICATE_API_TOKEN your_replicate_token
```

## 校验行为

在实时模式下若缺少必需密钥，流水线会提前失败并给出明确的阶段级错误。

## 安全实践

- 不要在作业文件或仓库配置中提交密钥
- 本地开发优先使用钥匙串存储
- 定期轮换提供方密钥
