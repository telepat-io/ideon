---
title: 测试策略
description: 面向 Ideon 使用者与贡献者的测试策略说明。
keywords: [ideon, 文档, cli, 指南, 参考]
---

# 测试策略

Ideon 使用支持 ESM 的 Jest，并采用聚焦型测试套件。

## 当前测试套件

- `options.test.ts`: T2I coercion/sanitization/defaults
- `articleSchema.test.ts`: schema boundary validation
- `markdown.test.ts`: markdown rendering contract
- `pipeline.runner.test.ts`: stage orchestration behavior (multi-targets, generation dirs, resume semantics)
- `config.resolver.test.ts`: precedence and idea resolution
- `previewHelpers.test.ts` and `previewServer.test.ts`: recursive discovery, generation grouping, preview resilience, asset serving
- `previewServer.internals.test.ts` and `previewServer.branches.test.ts`: preview branch/error-path and shell/API behavior
- `src/preview-app/App.test.tsx`: React preview integration behavior (selection, tab switching, logs inspector)
- `src/preview-app/interactions.test.ts`: interaction normalization and grouping utilities
- `prompts.framework.test.ts`: framework/style/content-type prompt layering
- `write.command.test.ts`: target parsing and CLI write option behavior

## 运行测试

```bash
npm test
npm run test:watch
npm run test:coverage
```

## 质量门禁

推荐在合并前至少通过：

```bash
npm run lint
npm test
npm run build
npm run docs:build
```

## 扩展覆盖率

优先补充：

- 更多预览 UI 交互覆盖（主题、移动端抽屉、空状态/错误状态）
- 提供方响应失败路径的额外覆盖
- 混合生成目录下删除语义的集成覆盖
