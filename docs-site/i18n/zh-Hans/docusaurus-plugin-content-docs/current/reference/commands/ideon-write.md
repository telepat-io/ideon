---
title: ideon write [idea]
description: 从想法或 Job 文件生成一个主输出和可选次级输出。
keywords: [ideon, cli, write, 生成, markdown, openrouter, replicate]
image: /img/logo.svg
---

# ideon write [idea]

## 命令作用

`ideon write [idea]` 会运行完整 Ideon 流水线，生成一个必需主输出和可选次级输出；当主输出包含 article 时，会执行图像渲染。

## 用法

```bash
ideon write [idea] [--idea <idea>] [--audience <description>] [--job <path>] [--primary <type=1>] [--secondary <type=count> ...] [--style <style>] [--length <size>] [--no-interactive] [--dry-run] [--no-enrich-links]
```

## 参数与选项

| 参数/选项 | 简写 | 必填 | 类型 | 默认值 | 允许值 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `[idea]` | 无 | 否 | string | n/a | 任意自然语言文本 | 未提供 `--idea` 时使用的位置参数。 |
| `--idea <idea>` | `-i` | 否 | string | n/a | 任意自然语言文本 | 显式 idea，优先级高于位置参数。 |
| `--audience <description>` | 无 | 否 | string | 泛化受众 | 任意自然语言文本 | 用于 shared-brief 规划的受众提示。 |
| `--job <path>` | `-j` | 否 | string (path) | n/a | 有效 JSON 文件路径 | 从文件加载 job 定义。 |
| `--primary <type=1>` | 无 | 非交互模式必填 | string | 交互模式下会提示 | `article`、`blog-post`、`x-thread`、`x-post`、`reddit-post`、`linkedin-post`、`newsletter`、`landing-page-copy`，且 count 必须为 `1` | 必需主目标，数量必须是 `1`。 |
| `--secondary <type=count>` | 无 | 否 | 可重复 string | 无 | 与主目标相同的类型，count >= `1` | 可重复的次级目标。 |
| `--style <style>` | 无 | 否 | enum | `professional` | `professional`、`friendly`、`technical`、`academic`、`opinionated`、`storytelling` | 生成内容风格。 |
| `--length <size>` | 无 | 否 | enum | `medium` | `small`、`medium`、`large` | 目标篇幅。 |
| `--no-interactive` | 无 | 否 | boolean | `false` | `true` 或省略 | 禁用所有提示，在缺少必填输入时立即失败。 |
| `--dry-run` | 无 | 否 | boolean | `false` | `true` 或省略 | 不调用外部提供商 API，仅执行编排流程。 |
| `--no-enrich-links` | 无 | 否 | boolean | `false` | `true` 或省略 | 跳过 markdown 生成后的链接增强阶段。 |

## 示例

```bash title="最小可用示例"
ideon write "How AI changes technical publishing"
```

```bash title="常见生产示例"
ideon write "How small editorial teams scale content" --primary article=1 --secondary x-thread=2 --style technical --length large
```

```bash title="排障与安全示例"
ideon write --dry-run "How to test Ideon pipeline changes" --primary article=1
```

```bash title="单次执行 agent 安全示例"
ideon write --no-interactive --idea "How to productionize docs operations" --primary article=1 --style technical --length medium
```

## 非交互行为

当设置 `--no-interactive` 时，Ideon 在 TTY 环境中也不会弹出任何提示。

- 缺少 idea 输入会立即失败。
- 在 no-interactive 模式下缺少 `--primary`、`--style` 或 `--length` 会立即失败并给出可执行错误提示。
- 这是 one-shot agent 与 CI 工作流推荐模式。

## 输出与退出码

成功时，Ideon 会将生成结果写入 `output/<timestamp>-<slug>/`，并输出流程完成信息。

| 退出码 | 含义 |
| --- | --- |
| `0` | 写作流程执行成功。 |
| `1` | 发生参数校验或运行时错误。 |
| `130` | 命令被 `Ctrl+C` 中断。 |

## 相关命令

- [ideon write resume](./ideon-write-resume.md)
- [ideon config](./ideon-config.md)
- [ideon preview [markdownPath]](./ideon-preview.md)
- [ideon settings](./ideon-settings.md)
- [配置指南](../../guides/configuration.md)

## 版本与弃用说明

- 当前行为对应 Ideon `0.1.6`。
- 已弃用的 `--target` 已由 `--primary` 与可重复 `--secondary` 替代。
