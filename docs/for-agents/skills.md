---
title: Skills
description: Primary installable Ideon skill package for agent workflows, plus internal contract metadata notes.
keywords: [ideon, agents, skills, workflow, contracts]
---

# Skills

This page is primarily about the installable Ideon skill package for third-party agents.

## Primary Skill Package

Installable package:

- `ideon-cli-skill/`

Use this package when you want an agent to run Ideon as a content writer across full lifecycle workflows:

- install and setup
- content generation across multiple output formats
- style and length controls
- link enrichment, image generation, and local preview workflows
- iterative refinement via resume/rerun and automation-safe command paths

Core file:

- `ideon-cli-skill/SKILL.md`

Companion references:

- `ideon-cli-skill/references/command-catalog.md`
- `ideon-cli-skill/references/troubleshooting.md`
- `ideon-cli-skill/references/framework-patterns.md`

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
