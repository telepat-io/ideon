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
ideon write [idea] [--idea <idea>] [--audience <description>] [--job <path>] [--primary <type=1>] [--secondary <type=count> ...] [--style <style>] [--intent <intent>] [--length <size-or-words>] [--no-interactive] [--dry-run] [--enrich-links] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]
```

## 参数与选项

| 参数/选项 | 简写 | 必填 | 类型 | 默认值 | 允许值 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `[idea]` | 无 | 否 | string | n/a | 任意自然语言文本 | 未提供 `--idea` 时使用的位置参数。 |
| `--idea <idea>` | `-i` | 否 | string | n/a | 任意自然语言文本 | 显式 idea，优先级高于位置参数。 |
| `--audience <description>` | 无 | 否 | string | 泛化受众 | 任意自然语言文本 | 用于 shared-brief 规划的受众提示。 |
| `--job <path>` | `-j` | 否 | string (path) | n/a | 有效 JSON 文件路径 | 从文件加载 job 定义。 |
| `--primary <type=1>` | 无 | 非交互模式必填 | string | 交互模式下会提示 | `article`、`blog-post`、`linkedin-post`、`newsletter`、`press-release`、`reddit-post`、`science-paper`、`x-post`、`x-thread`，且 count 必须为 `1` | 必需主目标，数量必须是 `1`。 |
| `--secondary <type=count>` | 无 | 否 | 可重复 string | 无 | 与主目标相同的类型，count >= `1` | 可重复的次级目标。 |
| `--style <style>` | 无 | 否 | enum | `professional` | `academic`、`analytical`、`authoritative`、`conversational`、`empathetic`、`friendly`、`journalistic`、`minimalist`、`persuasive`、`playful`、`professional`、`storytelling`、`technical` | 生成内容风格。 |
| `--intent <intent>` | 无 | 非交互模式必填 | enum | 交互模式下会提示 | `announcement`、`case-study`、`cornerstone`、`counterargument`、`critique-review`、`deep-dive-analysis`、`how-to-guide`、`interview-q-and-a`、`listicle`、`opinion-piece`、`personal-essay`、`roundup-curation`、`tutorial` | 内容意图，会影响所有输出的结构与论证方式。 |
| `--length <size-or-words>` | 无 | 否 | enum 或整数 | `medium` 别名（`900` 词） | `small`、`medium`、`large` 或正整数 | 按词数控制目标篇幅。别名映射：`small=500`、`medium=900`、`large=1400`。 |
| `--no-interactive` | 无 | 否 | boolean | `false` | `true` 或省略 | 禁用所有提示，在缺少必填输入时立即失败。 |
| `--dry-run` | 无 | 否 | boolean | `false` | `true` 或省略 | 不调用外部提供商 API，仅执行编排流程。 |
| `--enrich-links` | 无 | 否 | boolean | `false` | `true` 或省略 | 在 markdown 生成后执行链接增强阶段。 |
| `--link <expression->url>` | 无 | 否 | 可重复 string | 无 | `"文字->https://..."` | 添加或更新自定义链接。格式：`expression->url`。需要 `--enrich-links`。可重复。自定义链接优先于生成链接。 |
| `--unlink <expression>` | 无 | 否 | 可重复 string | 无 | 任意 expression 字符串 | 按 expression 删除自定义链接。可重复，需要 `--enrich-links`。 |
| `--max-links <n>` | 无 | 否 | 正整数 | 由 `--length` 决定 | 任意正整数 | 限制生成链接数量，不影响自定义链接。需要 `--enrich-links`。 |

## 示例

```bash title="最小可用示例"
ideon write "How AI changes technical publishing"
```

```bash title="常见生产示例"
ideon write "How small editorial teams scale content" --primary article=1 --secondary x-thread=2 --style technical --intent how-to-guide --length large
```

```bash title="排障与安全示例"
ideon write --dry-run "How to test Ideon pipeline changes" --primary article=1
```

```bash title="单次执行 agent 安全示例"
ideon write --no-interactive --idea "How to productionize docs operations" --primary article=1 --style technical --intent tutorial --length 1200
```

## 非交互行为

当设置 `--no-interactive` 时，Ideon 在 TTY 环境中也不会弹出任何提示。

- 缺少 idea 输入会立即失败。
- 在 no-interactive 模式下缺少 `--primary`、`--style`、`--intent` 或 `--length` 会立即失败并给出可执行错误提示。
- `--length` 同时支持别名（`small`、`medium`、`large`）和正整数词数。
- 这是 one-shot agent 与 CI 工作流推荐模式。

## 链接增强

- 链接增强是面向符合条件的长内容 markdown 输出的后处理链接建议流程。
- Ideon 会先选取可链接短语，再通过模型 + web search 解析相关来源 URL，并写入 `*.links.json` sidecar 文件。
- 该步骤不会改写原始 markdown 文件。
- 在 `ideon write` 中，只有显式传入 `--enrich-links` 时才会执行链接增强。
- 短内容渠道（如 `x-post`、`x-thread`）会被跳过。
- 使用 `--link "expression->url"` 添加自定义链接（分开存储，始终包含）详见 [ideon links](./ideon-links.md)。
- 使用 `--max-links <n>` 限制生成链接数量；默认根据 `--length` 为 5 / 8 / 12。

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
