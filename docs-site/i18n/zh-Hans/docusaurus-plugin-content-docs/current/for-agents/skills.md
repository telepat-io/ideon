---
title: Skills
description: 面向未来 Ideon agent 工作流与受约束执行模式的 Skills 契约模板。
keywords: [ideon, agents, skills, 工作流, 契约]
---

# Skills

Ideon 已发布一方 skill 契约元数据，用于运行时就绪检查与契约同步校验。

当前一方 skill 契约条目：

- `ideon-write-primary`
- `ideon-config-set`

## 必备 Skill 契约

每个 skill 都应文档化以下内容：

1. Skill 名称与预期产出。
2. 必需输入与校验约束。
3. 执行边界与安全约束。
4. 预期输出与输出 schema。
5. 失败模式与恢复说明。
6. 验证提示与测试标准。

## 发布规则

- 每个 skill 保持单一权威页面。
- 为每个 skill 链接其依赖的人类可读权威文档。
- 提供带真实参数值的具体示例。
- required 字段与 enum 值需与 CLI 和 MCP 契约保持同步。

## 同步与漂移策略

- skill 契约元数据属于 integration contract surface。
- 若 CLI 参数或 enum 变更，必须在同一变更中同步更新 skill 契约。
- 出现任何契约漂移时，integration sync 校验应失败。

强制维护策略与评审清单见：

- [Agent Maintenance and Sync](./agent-maintenance-and-sync.md)
