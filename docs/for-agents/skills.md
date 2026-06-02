---
title: Skills
description: Installable Ideon skill packages for writer and planner agent workflows, plus internal contract metadata notes.
keywords: [ideon, agents, skills, workflow, contracts]
---

# Skills

This page covers installable Ideon skill packages for third-party agents.

## Installable Skill Packages

Installable packages:

- `skill/ideon-cli/`
- `skill/ideon-plan/`

Use `skill/ideon-cli/` when you want an agent to run Ideon as a content writer across full lifecycle workflows:

- install and setup
- content generation across multiple output formats
- style, length, market, and locale controls
- link enrichment, image generation, and local preview workflows
- iterative refinement via resume/rerun and automation-safe command paths

Use `skill/ideon-plan/` when you want an approval-gated strategist workflow:

- publication-aware and series-aware planning
- GKP-backed keyword research with cache-aware loops
- conservative series mutations and queue additions only after explicit approval
- planning-first operation without auto-writing articles

Core files:

- `skill/ideon-cli/SKILL.md`
- `skill/ideon-plan/SKILL.md`

Companion references:

- `skill/ideon-cli/references/command-catalog.md`
- `skill/ideon-cli/references/troubleshooting.md`
- `skill/ideon-cli/references/framework-patterns.md`
- `skill/ideon-plan/references/workflow.md`
- `skill/ideon-plan/references/ideon-operations.md`
- `skill/ideon-plan/references/gads-gkp.md`
- `skill/ideon-plan/references/keyword-cache.md`

## Internal Contract Metadata (Secondary)

Ideon also publishes first-party internal skill contract metadata used by runtime readiness and sync checks.
These names are internal identifiers and not the installable package name.

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
