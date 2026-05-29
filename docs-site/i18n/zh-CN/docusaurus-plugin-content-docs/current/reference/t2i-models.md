---
title: T2I 模型
description: 面向 Ideon 使用者与贡献者的 T2I 模型参考文档。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 支持的文生图模型

Ideon 当前支持以下模型 ID：

- `black-forest-labs/flux-schnell` (default)
- `black-forest-labs/flux-2-pro`
- `bytedance/seedream-4`
- `google/nano-banana-pro`
- `prunaai/z-image-turbo`

## 覆盖参数处理

用户提供的 `t2i.inputOverrides` 会在运行前进行清洗：

- 不允许用户配置的字段会被移除
- 按类型进行值转换与校验
- 非法值会被忽略

## 由流水线管理的字段

根据模型能力，Ideon 可能会自动设置以下流水线字段：

- `aspect_ratio`
- `width`
- `height`

这样可以保持图像尺寸与版式意图的稳定性。

## 选择建议

- 优先从默认 `flux-schnell` 开始，以获得更快速度
- 在基线稳定后再逐步提高偏质量的参数
- 在实际图像调用前先用 dry-run 验证编排流程

## 实际权衡

| Model | Speed | Typical Quality | Best Use |
|---|---|---|---|
| `black-forest-labs/flux-schnell` | Fast | Good baseline | Iteration, high-throughput drafts |
| `black-forest-labs/flux-2-pro` | Medium | Higher fidelity | Hero visuals, polished cover images |
| `bytedance/seedream-4` | Medium | Strong composition | Balanced speed/quality workflows |
| `google/nano-banana-pro` | Medium | Style-consistent outputs | Brand-like variation and consistency |
| `prunaai/z-image-turbo` | Fast | Lightweight | Quick exploratory rendering |

## 常见覆盖参数模式

当你需要模型特定调优时，可使用 `t2i.inputOverrides`：

- 输出格式调优（例如 `png` 与 `webp`）
- 在支持时使用模型原生质量参数
- 在允许时控制数量/变体参数

示例：

```json
{
	"settings": {
		"t2i": {
			"modelId": "black-forest-labs/flux-schnell",
			"inputOverrides": {
				"output_format": "png"
			}
		}
	}
}
```

如果某个覆盖参数不适用于所选模型，Ideon 会在校验阶段将其丢弃。
