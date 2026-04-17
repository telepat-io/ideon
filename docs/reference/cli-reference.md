---
title: CLI Reference
description: Complete command-line reference for Ideon, including command pages, flags, examples, and exit behavior.
keywords: [cli, ideon, commands, reference, automation]
---

# CLI Reference

Use this page as the index for Ideon commands.

## Global Commands

```bash
ideon --help
ideon --version
```

## Command Pages

- [ideon settings](./commands/ideon-settings.md)
- [ideon config](./commands/ideon-config.md)
- [ideon write [idea]](./commands/ideon-write.md)
- [ideon write resume](./commands/ideon-write-resume.md)
- [`ideon delete <slug>`](./commands/ideon-delete.md)
- [ideon preview [markdownPath]](./commands/ideon-preview.md)
- [ideon mcp serve](./commands/ideon-mcp-serve.md)
- [ideon agent](./commands/ideon-agent.md)

## Common Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | Command completed successfully. |
| `1` | Command failed due to validation, runtime, or dependency errors. |
| `130` | Command was interrupted by `Ctrl+C` (SIGINT). |

## Related References

- [Environment Variables](./environment-variables.md)
- [Content Types](./content-types.md)
- [T2I Models](./t2i-models.md)
- [Configuration Guide](../guides/configuration.md)

## Versioning Notes

- Reference reflects Ideon CLI version `0.1.6`.
- Deprecated syntax `--target` was replaced by `--primary` and repeatable `--secondary` flags.
- `ideon write` now supports strict one-shot behavior with `--no-interactive`.
- Agent runtime integrations support CLI/MCP workflows and do not support Cursor or VS Code integrations.
