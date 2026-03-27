---
title: Testing Strategy
---

# Testing Strategy

Ideon uses Jest with ESM support and focused test suites.

## Current Suites

- `options.test.ts`: T2I coercion/sanitization/defaults
- `articleSchema.test.ts`: schema boundary validation
- `markdown.test.ts`: markdown rendering contract
- `pipeline.runner.test.ts`: stage orchestration behavior
- `config.resolver.test.ts`: precedence and idea resolution

## Run Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Quality Gates

Recommended baseline before merge:

```bash
npm run typecheck
npm test
npm run build
```

## Extending Coverage

Priority additions:

- Replicate output normalization edge cases
- Plain renderer output format assertions
- Additional failure-path coverage for provider responses
