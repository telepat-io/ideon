---
title: Skills
description: Skills contract template for future Ideon agent workflows and constrained execution patterns.
keywords: [ideon, agents, skills, workflow, contracts]
---

# Skills

Ideon publishes first-party skill contract metadata used for runtime readiness and contract sync checks.

Current first-party skill contract entries:

- `ideon-write-primary`
- `ideon-config-set`

## Required Skill Contract

For each skill, document:

1. Skill name and intended outcome.
2. Required inputs and validation constraints.
3. Execution guardrails and safety constraints.
4. Expected outputs and output schema.
5. Failure modes and recovery instructions.
6. Verification prompts and test criteria.

## Publication Rules

- Keep one canonical page per skill.
- Link each skill to authoritative human docs it relies on.
- Include concrete examples with real argument values.
- Keep required fields and enum values synchronized with CLI and MCP contracts.

## Sync and Drift Policy

- Skill contract metadata is part of the integration contract surface.
- If CLI arguments or enum values change, skill contracts must be updated in the same change.
- Integration sync checks should fail on any contract drift.

For mandatory maintenance policy and review checklist, see:

- [Agent Maintenance and Sync](./agent-maintenance-and-sync.md)
