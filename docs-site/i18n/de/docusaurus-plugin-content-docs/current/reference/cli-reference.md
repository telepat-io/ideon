---
title: CLI-Referenz
description: Vollständige Befehlszeilenreferenz für Ideon, einschließlich Befehlsseiten, Flags, Beispielen und Beendigungsverhalten.
keywords: [cli, ideon, commands, reference, automation]
---

# CLI-Referenz

Verwenden Sie diese Seite als Index für Ideon-Befehle.

## Globale Befehle

```bash
ideon --help
ideon --version
```

## Befehlsseiten

- [ideon settings](./commands/ideon-settings.md)
- [ideon config](./commands/ideon-config.md)
- [ideon write [idea]](./commands/ideon-write.md)
- [ideon write resume](./commands/ideon-write-resume.md)
- [ideon queue](./commands/ideon-queue.md)
- [`ideon links <slug>`](./commands/ideon-links.md)
- [`ideon export <generationId> <path>`](./commands/ideon-export.md)
- [`ideon delete <slug>`](./commands/ideon-delete.md)
- [ideon preview [markdownPath]](./commands/ideon-preview.md)
- [ideon mcp serve](./commands/ideon-mcp-serve.md)
- [ideon agent](./commands/ideon-agent.md)

## Häufige Beendigungscodes

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Befehl erfolgreich abgeschlossen. |
| `1` | Befehl aufgrund von Validierungs-, Laufzeit- oder Abhängigkeitsfehlern fehlgeschlagen. |
| `130` | Befehl wurde durch `Ctrl+C` (SIGINT) unterbrochen. |

## Verwandte Referenzen

- [Umgebungsvariablen](./environment-variables.md)
- [Inhaltstypen](./content-types.md)
- [T2I-Modelle](./t2i-models.md)
- [Konfigurationsanleitung](../guides/configuration.md)

## Versionierungshinweise

- Die Referenz spiegelt Ideon CLI-Version `0.1.33` wider.
- `ideon queue` verwaltet eine globale Inhaltswarteschlange für die Planung zukünftiger Schreibvorgänge.
- Veraltete Syntax `--target` wurde durch `--Primary` und wiederholbare `--secondary`-Flags ersetzt.
- `ideon write` unterstützt nun striktes One-Shot-Verhalten mit `--no-interactive`.
- Agenten-Laufzeit-Integrationen unterstützen CLI/MCP-Workflows und unterstützen keine Cursor- oder VS-Code-Integrationen.