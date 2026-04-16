---
title: Testing Strategy
description: Testing Strategy documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Testing Strategy

Ideon uses Jest with ESM support and focused test suites.

## Current Suites

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

## Run Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Quality Gates

Recommended baseline before merge:

```bash
npm run lint
npm test
npm run build
npm run docs:build
```

## Extending Coverage

Priority additions:

- More preview UI interaction coverage (theme, mobile drawer, and empty/error states)
- Additional failure-path coverage for provider responses
- Integration coverage for delete semantics in mixed generation directories
