# Ideon CLI Skill Template

Use this scaffold to refresh or clone a skill package for Ideon-style CLI workflows.

## Directory template

```text
ideon-cli-skill/
├── SKILL.md
├── references/
│   ├── command-catalog.md
│   ├── troubleshooting.md
│   └── framework-patterns.md
└── assets/
    └── generated-skill-template.md
```

## Frontmatter template

```yaml
---
name: <kebab-case-skill-name>
description: Use this skill when users need full Ideon CLI lifecycle workflows (install, setup, run, preview, automation, MCP, troubleshooting).
---
```

## Required SKILL sections

1. What this skill does (plain language outcome first)
2. Installation
3. Setup and first run
4. Local readiness checks
5. When to use / not use
6. Inputs to collect from user
7. Deterministic workflow
8. Operations lifecycle
9. Local preview and URL handoff
10. MCP and integrations
11. Argument semantics and constraints
12. Configuration precedence and discovery
13. Output and exit semantics
14. Gotchas and sharp edges
15. Clarifying questions for risky operations
16. Failure handling table
17. Verification prompts (>= 3 trigger and >= 3 non-trigger)
18. Companion references links

## Ideon defaults block

```bash
# Install
npm i -g @telepat/ideon

# Interactive setup
ideon settings

# Safe smoke
ideon write --dry-run "Smoke test" --primary article=1 --style professional --length medium --no-interactive

# Preview
ideon preview --no-open

# MCP server
ideon mcp serve
```

## Evidence checklist

- Command and options from CLI code and command docs.
- Allowed enums and constraints from schema and parser files.
- Precedence from resolver/config docs.
- Storage paths from settings/secret/integration store code.
- MCP tool list from server/tool contracts.

## TODO policy

If evidence is missing:

- Add explicit TODO markers.
- Do not invent flags, auth models, or host behavior.
- Keep commands copy-paste safe and minimally destructive by default.
