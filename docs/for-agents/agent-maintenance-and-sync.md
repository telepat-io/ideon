---
title: Agent Maintenance and Sync
description: Maintenance policy for keeping Ideon CLI, MCP tools, and skill contracts synchronized.
keywords: [ideon, agents, maintenance, mcp, skills, sync]
---

# Agent Maintenance and Sync

Use this page as the operational contract for maintainers and automation agents.

## Scope

In scope:

- CLI command contracts
- MCP tool contracts
- first-party skill contract metadata

Note: "skill contract metadata" here refers to internal identifiers in `src/integrations/skills/registry.ts` (for example `ideon-write-primary`).
This is separate from external installable skill packages at `skill/ideon-cli/` and `skill/ideon-plan/`.

Out of scope:

- Cursor integrations
- VS Code integrations

## Mandatory Same-Change Rule

When a CLI command contract changes, update all affected artifacts in the same change:

1. CLI command behavior and flag parsing.
2. MCP tool input/output contract surfaces.
3. skill contract metadata surfaces.
4. command reference docs and examples.
5. localized docs parity pages.
6. installable skill packages (`skill/ideon-cli/` and `skill/ideon-plan/`, including each `SKILL.md` and companion references).

A change is incomplete if exported CLI, MCP, skill contracts, and installable skill packages are not synchronized.

## Required Validation

Run these checks before merge:

```bash
npm run lint
npm run build
npm run test:coverage
npm run docs:build
```

The lint sequence includes `check:sync`, which validates contract parity.

## Drift Signals

Common drift indicators:

- CLI enum values updated but MCP schema enums unchanged.
- required CLI args changed but skill required fields unchanged.
- command docs list flags that code no longer accepts.

## Reviewer Checklist

Block merge if any answer is no:

- Were all changed CLI arguments mirrored in MCP and skill contracts?
- Did the integration sync checker pass?
- Were docs updated in English and zh-Hans?
- Are unsupported runtime boundaries still explicit?
