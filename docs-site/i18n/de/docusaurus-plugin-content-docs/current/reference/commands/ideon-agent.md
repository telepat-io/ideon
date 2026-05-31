---
title: ideon agent
description: Installieren, deinstallieren und inspizieren Sie lokale Laufzeitintegrationsregistrierungen für Ideon Agenten-Workflows.
keywords: [ideon, cli, agent, runtime integration, mcp]
---

# ideon agent

## Was dieser Befehl macht

`ideon agent` verwaltet lokale Laufzeitintegrationsregistrierungen und Bereitschaftsprüfungen für die Ideon Agentenverwendung.

## Verwendung

```bash
ideon agent install <runtime> [--dry-run]
ideon agent uninstall <runtime> [--dry-run]
ideon agent status [--json]
```

## Unterstützte Laufzeiten

Unterstützte Laufzeit-IDs:

- `claude`
- `claude-desktop`
- `chatgpt`
- `gemini`
- `codex`
- `cursor`
- `vscode`
- `opencode`
- `generic-mcp`

## Unterbefehle

### ideon agent install

Registriert ein Laufzeitintegrationsprofil.

```bash
ideon agent install claude
ideon agent install generic-mcp --dry-run
```

### ideon agent uninstall

Entfernt ein Laufzeitintegrationsprofil.

```bash
ideon agent uninstall claude
ideon agent uninstall chatgpt --dry-run
```

### ideon agent status

Druckt installierte Laufzeiten und Bereitschaftsprüfungen.

```bash
ideon agent status
ideon agent status --json
```

Der Status umfasst:

- installierte Laufzeiten
- Integrations-Synchronisationsprüfungsstatus
- MCP-Werkzeugvertragsanzahl
- Skill-Vertragsanzahl (interne Skill-Metadateneinträge, z.B. `ideon-write-primary`)
- Konfigurationsoberflächen-Bereitschaft

## Ausgabe und Beendigungscodes

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Befehl erfolgreich abgeschlossen. |
| `1` | Laufzeit-ID oder Zustandsvalidierung fehlgeschlagen oder Laufzeitfehler aufgetreten. |
| `130` | Befehl wurde durch `Ctrl+C` unterbrochen. |

## Verwandte Befehle

- [ideon mcp serve](./ideon-mcp-serve.md)
- [ideon config](./ideon-config.md)
- [Agentenwartung und Synchronisation](../../for-agents/agent-maintenance-and-sync.md)

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Laufzeitregistrierung ist idempotent und wird im lokalen Integrationsspeicher persistiert.