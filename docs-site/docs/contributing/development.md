---
title: Development Workflow
---

# Development Workflow

## Repository Setup

```bash
git clone https://github.com/telepat-io/ideon.git
cd ideon
npm install
cd docs-site && npm install && cd ..
```

## Core Scripts

Project root:

```bash
npm run dev -- --help
npm run typecheck
npm test
npm run build
npm run pricing:refresh
```

Docs:

```bash
npm run docs:start
npm run docs:build
npm run docs:typecheck
```

## Contribution Guidelines

- Keep changes scoped and atomic
- Preserve CLI behavior compatibility unless explicitly changing UX
- Add or update tests for logic changes
- Update docs with behavior changes in same PR

## Suggested PR Checklist

- [ ] Typecheck clean
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Docs updated (if behavior changed)
