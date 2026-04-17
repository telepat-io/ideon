# Ideon Skill Patterns

These patterns keep Ideon skill responses consistent, safe, and automation-friendly.

## 1. Zero-context outcome pattern

Always begin with plain language:

- What the user gets: generated markdown outputs and optional channel variants.
- What command path achieves it: install -> setup -> write -> preview.

Avoid leading with internal terms (pipeline stage names, schema internals) until after the outcome is clear.

## 2. Install-setup-readiness pattern

Always include these checks in this order:

1. Install verification: `ideon --help`
2. Setup verification: `ideon config list --json`
3. Orchestration smoke: `ideon write --dry-run ...`
4. Preview readiness: `ideon preview --no-open`

Do not skip readiness checks when debugging.

## 3. Scenario ladder pattern

Prefer scenario-based command guidance over random examples:

- Minimal: first successful generation.
- Common: article + one or two secondary outputs.
- Debug: dry-run + JSON status commands.
- CI: non-interactive with env secrets.
- Recovery: `ideon write resume`.
- MCP: `ideon mcp serve`.

## 4. Argument semantics pattern

When documenting options, include:

- Allowed values.
- Required conditions.
- Constraints and conflicts.
- Interactive vs non-interactive behavior.

Ideon-specific mandatory semantics:

- Primary target count must be `1`.
- Secondary counts must be positive integers.
- Same content type cannot be primary and secondary in one run.

## 5. Risk clarifying-question pattern

Ask before high-risk actions:

Destructive:

- Should delete require confirmation or proceed with `--force`?
- Is the slug verified?

Stateful:

- Resume latest state or start fresh?
- Keep previous mode (dry/live) or switch?

Credentials:

- Store via keychain or env-only?
- Is this CI/container requiring `IDEON_DISABLE_KEYTAR=true`?

## 6. Config precedence pattern

State precedence explicitly when output looks unexpected:

CLI flags > job file > env vars > saved settings > defaults

Secrets precedence:

env secrets > keychain secrets

## 7. Preview URL handoff pattern

For local preview requests:

1. Run preview command with explicit port when needed.
2. Extract printed URL from stdout (`Open http://localhost:<port>`).
3. Hand off exact URL.
4. Explain shutdown via Ctrl+C.

## 8. MCP pattern

For MCP workflows:

1. Start server with `ideon mcp serve`.
2. Keep claims limited to documented stdio transport and known tool set.
3. If asked about trust/approval prompts, mark as TODO/host-dependent unless documented.

## 9. Anti-patterns to avoid

- Inventing unsupported runtime IDs (for example cursor/vscode).
- Treating `--primary` count as configurable beyond `1`.
- Assuming keychain works in CI.
- Omitting confirmation for destructive delete paths.
- Reporting preview URL without actually parsing command output.
