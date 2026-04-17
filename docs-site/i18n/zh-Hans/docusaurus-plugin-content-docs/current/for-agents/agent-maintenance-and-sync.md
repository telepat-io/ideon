---
title: Agent Maintenance and Sync
description: 用于保持 Ideon CLI、MCP 工具与 skill 契约同步的维护策略。
keywords: [ideon, agents, 维护, mcp, skills, 同步]
---

# Agent Maintenance and Sync

本页是维护者与自动化 agent 的运行契约。

## 范围

In scope:

- CLI 命令契约
- MCP 工具契约
- 一方 skill 契约元数据

说明：这里的“skill 契约元数据”指 `src/integrations/skills/registry.ts` 中的内部标识（例如 `ideon-write-primary`），与外部可安装的 `ideon-cli-skill/` 包是两个不同概念。

Out of scope:

- Cursor 集成
- VS Code 集成

## 强制同改规则

当 CLI 命令契约变更时，必须在同一变更中同步更新：

1. CLI 命令行为与参数解析。
2. MCP 工具输入输出契约面。
3. skill 契约元数据面。
4. 命令参考文档与示例。
5. 本地化文档对等页面。

若导出的 CLI、MCP 与 skill 契约不同步，则该变更不完整。

## 必需校验

合并前运行：

```bash
npm run lint
npm run build
npm run test:coverage
npm run docs:build
```

lint 序列中包含 `check:sync`，用于校验契约一致性。

## 漂移信号

常见漂移现象：

- CLI 枚举已变更但 MCP schema 枚举未更新。
- CLI 必填参数变更但 skill required 字段未更新。
- 命令文档列出的参数已与实现不一致。

## 评审检查清单

若有任一项为否，请阻止合并：

- 所有 CLI 参数变更是否已同步到 MCP 与 skill 契约？
- integration sync 检查是否通过？
- English 与 zh-Hans 文档是否同步更新？
- 不支持的 runtime 边界是否仍明确？
