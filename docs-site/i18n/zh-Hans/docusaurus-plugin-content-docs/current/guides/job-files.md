---
title: 作业文件
description: 面向 Ideon 使用者与贡献者的作业文件说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 作业文件

作业文件可让一次或多种内容类型的生成任务实现可复现与可共享。

## 最小示例

```json
{
  "idea": "How content teams can scale AI-assisted writing"
}
```

运行：

```bash
ideon write --job ./job.json
```

## 完整示例

```json
{
  "idea": "How editorial teams can ship weekly explainers",
  "targetAudience": "Content leads at small SaaS teams building repeatable thought-leadership motions",
  "settings": {
    "model": "moonshotai/kimi-k2.5",
    "modelSettings": {
      "temperature": 0.7,
      "maxTokens": 2500,
      "topP": 0.95
    },
    "modelRequestTimeoutMs": 90000,
    "contentTargets": [
      { "contentType": "article", "role": "primary", "count": 1 },
      { "contentType": "x-thread", "role": "secondary", "count": 2 },
      { "contentType": "x-post", "role": "secondary", "count": 1 },
      { "contentType": "linkedin-post", "role": "secondary", "count": 1 }
    ],
    "style": "friendly",
    "t2i": {
      "modelId": "black-forest-labs/flux-schnell",
      "inputOverrides": {
        "output_format": "png"
      }
    },
    "markdownOutputDir": "/output",
    "assetOutputDir": "/output/assets"
  }
}
```

## 说明

- `settings.contentTargets` 必须包含且仅包含一个主目标，并可包含若干次目标。
- 若省略 `settings.style`，Ideon 默认使用 `professional`。
- 若省略 `targetAudience`，Ideon 会在 shared-brief 规划阶段使用通用受众。
- CLI 参数会覆盖作业文件中的 `idea`、`targetAudience`、`style` 与 `contentTargets`。
- 在支持的字段上，环境变量会覆盖作业文件值。
- 每次运行后，Ideon 会在生成目录写入一个解析后的 `job.json`，记录该次执行的最终运行定义与元数据。

## 覆盖优先级

从高到低：

1. CLI flags and direct idea input
2. Environment variables (`IDEON_*`)
3. Job file `settings`
4. Saved settings
5. Schema defaults

实践示例：

- `ideon write --job ./job.json --style technical` 会强制使用 technical 风格，即使作业文件中定义了其他风格。
- `ideon write --job ./job.json --audience "Procurement leaders evaluating AI ops tooling"` 会覆盖该次运行的 `job.targetAudience`。
- `IDEON_MODEL=... ideon write --job ./job.json` 会优先使用环境变量模型而非作业文件模型。
- `--primary` 配合可选 `--secondary` 会替换该次运行的整个 `settings.contentTargets` 数组。

## 复用已生成的作业定义

每个生成目录都包含一个解析后的 `job.json`。你可以复制该文件，仅调整必要字段（例如模型、风格或目标）后再次运行：

```bash
ideon write --job ./output/20260327-your-slug/job.json
```

这是在最小偏移下复现或分支历史运行的最简单方式。

## Idea 解析规则

Idea 选择顺序：

1. Direct CLI idea argument
2. `job.idea`
3. `job.prompt`

若都不存在，Ideon 会抛出面向用户的错误。
