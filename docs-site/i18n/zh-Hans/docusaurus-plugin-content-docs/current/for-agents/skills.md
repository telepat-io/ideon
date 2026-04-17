---
title: Skills
description: 面向第三方 agent 的 Ideon 可安装主技能包说明，以及内部契约元数据说明。
keywords: [ideon, agents, skills, 工作流, 契约]
---

# Skills

本页首先说明面向第三方 agent 的可安装 Ideon 主技能包。

## 主技能包（优先）

可安装技能包路径：

- `ideon-cli-skill/`

当你希望 agent 以“内容写作平台”方式调用 Ideon 时，应优先使用该技能包。其覆盖完整生命周期：

- 安装与初始配置
- 多输出格式内容生成
- 风格与长度控制
- 链接增强、图像生成与本地预览
- 通过恢复/重跑实现迭代优化，以及自动化安全运行路径

核心文件：

- `ideon-cli-skill/SKILL.md`

配套参考：

- `ideon-cli-skill/references/command-catalog.md`
- `ideon-cli-skill/references/troubleshooting.md`
- `ideon-cli-skill/references/framework-patterns.md`

## 内部契约元数据（次级）

Ideon 同时发布一方内部 skill 契约元数据，用于运行时就绪检查与契约同步校验。
这些名称是内部集成标识，不是可安装技能包名称。

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
