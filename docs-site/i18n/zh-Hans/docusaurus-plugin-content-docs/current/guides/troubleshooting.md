---
title: 故障排查
description: 常见 Ideon 错误模式与恢复步骤。
keywords: [ideon, 故障排查, cli, 错误, 恢复]
---

# 故障排查

## 缺少 OpenRouter API Key

错误表现：

- `Missing OpenRouter API key...`

修复方式：

- 设置 `IDEON_OPENROUTER_API_KEY`，或
- 通过 `ideon settings` 保存 key
- 若两者都存在，本次运行优先使用环境变量

## 缺少 Replicate API Token

错误表现：

- `Missing Replicate API token...`

修复方式：

- 设置 `IDEON_REPLICATE_API_TOKEN`，或
- 通过 `ideon settings` 保存 token

如果本次运行不包含 `article` 目标，会跳过图像阶段，因此不需要 Replicate。

## 未提供 Idea

错误表现：

- `No idea provided...`

修复方式：

- 运行 `ideon write "your idea"`，或
- 使用包含 `idea` 或 `prompt` 的 `--job`

## Job 文件无效

错误表现：

- JSON parse or schema validation error

修复方式：

- 检查 JSON 语法
- 确认字段类型符合文档 schema
- 先用最小 Job（`{ "idea": "..." }`）运行，再逐步加字段

## 没有可恢复会话

错误表现：

- `No resumable write session found in .ideon/write/state.json...`

修复方式：

- 先执行 `ideon write "your idea"` 产生一次新会话
- 确认当前工作目录与原运行目录一致
- 注意每个目录都有独立的 `.ideon/write/state.json`，切换目录后无法读取原会话
- 如果项目目录被移动，请连同 `.ideon/` 一起移动；否则请在新目录重新执行一次写作后再恢复

## 写作运行被中断

场景：

- 运行被 `Ctrl+C` 或进程终止打断

恢复方式：

1. Run `ideon write resume`
2. 若找不到可恢复会话，先确认当前目录与原始 `ideon write` 运行目录一致
3. 若多次恢复失败，检查并移除 `.ideon/write/state.json` 后重新开始

## 未找到已生成内容

错误表现：

- `No generated content found in ...`

修复方式：

- 先运行一次生成命令（`ideon write "your idea"`）
- 检查设置中的输出目录
- 为 `ideon preview` 指定明确的 markdown 路径

## 预览可打开但图片缺失

错误表现：

- 预览页面能显示 markdown，但图片占位损坏

修复方式：

- 确认图片文件存在于 CLI 输出显示的生成目录
- 确认预览使用的是与生成时相同的 workspace/输出根目录
- 如果资源被手动删除，请重新生成

## 模型输出为空

错误表现：

- `The model returned an empty ... draft.`

修复方式：

- 重试运行
- 降低 temperature 提高稳定性
- 更换模型或减少提示词歧义

如果某一内容类型反复出现该问题，请先降低该类型数量并验证结果，再逐步放大。

## 结构化输出兼容性错误

错误表现：

- `Model "..." or its routed provider does not support strict structured outputs...`

修复方式：

- 使用支持结构化输出的 OpenRouter 模型
- 确认 provider 路由满足必需参数
- 默认模型失败时，换用已知支持结构化输出的模型重试

说明：

- Ideon 对规划与图像提示扩展使用严格 JSON schema 校验
- 如果模型/provider 不满足结构化输出要求，Ideon 会提前失败，而不是宽松回退解析

## CI/非 TTY 输出

若 UI 无法渲染，Ideon 会自动回退为纯文本阶段日志。

## 预览服务启动失败

常见原因：

- 端口已被占用（默认 `4173`）
- `--port` 参数非法
- 配置的输出目录中没有 markdown 文件

修复方式：

1. 运行 `ideon preview --port 8080 --no-open`
2. 确认输出存在，或显式传入 markdown 路径
3. 确认 `ideon settings` 中的输出目录与当前 workspace 一致
