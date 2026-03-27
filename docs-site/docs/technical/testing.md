---
title: Testing Strategy
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

- More preview UI interaction coverage (tab/variant switching behavior)
- Additional failure-path coverage for provider responses
- Integration coverage for delete semantics in mixed generation directories
