---
title: ideon agent
description: Installieren, deinstallieren und inspizieren Sie lokale Agenten-Laufzeitintegrationen — Skills, MCP-Registrierung und Bereitschaftsprüfungen.
keywords: [ideon, cli, agent, runtime integration, mcp, skills, pi]
---

# ideon agent

## Was dieser Befehl macht

`ideon agent` konfiguriert unterstützte Coding-Agent-Hosts mit Ideon-Skills und MCP-Servereinträgen. Die Installation ist **idempotent**: wiederholtes Ausführen ohne Änderungen ist ein No-Op. Konflikte mit Ideon-verwalteten Einträgen werden mit Warnung übersprungen, sofern `--force` nicht gesetzt ist.

Jede Installation protokolliert Metadaten im lokalen Integrationsspeicher (`agent-integrations.json` im Ideon-Konfigurationsverzeichnis).

## Verwendung

```bash
ideon agent install <runtime> [--cli-skill] [--mcp-skill] [--force] [--project] [--dry-run]
ideon agent uninstall <runtime> [--project] [--dry-run]
ideon agent status [--json]
```

### Installationsflags

| Flag | Standard | Bedeutung |
| --- | --- | --- |
| *(keins)* | CLI-Skill-Modus | Entspricht `--cli-skill` — installiert das `ideon-cli`-Skill-Paket |
| `--cli-skill` | an (implizit) | Symlink oder Kopie von `skill/ideon-cli/` ins Host-Skill-Verzeichnis |
| `--mcp-skill` | aus | Stdio-MCP registrieren (`ideon mcp serve`) und `skill/ideon-mcp/` installieren |
| `--force` | aus | Ersetzt nur konfliktierende **Ideon-verwaltete** Einträge |
| `--project` | aus | Projektbereich (aktuelles Arbeitsverzeichnis) statt benutzerweiter Pfade |
| `--dry-run` | aus | Geplante Änderungen ausgeben, ohne Dateien zu schreiben |

`--cli-skill` und `--mcp-skill` schließen sich gegenseitig aus.

**Ausnahme:** `generic-mcp` ignoriert Skill-Flags und merged nur MCP in `~/.config/mcp/mcp.json`.

## Unterstützte Laufzeiten

| Laufzeit | CLI-Skill (Standard) | MCP-Skill (`--mcp-skill`) | Hinweise |
| --- | --- | --- | --- |
| `pi` | `ideon-cli`-Pfad in Pi `settings.skills` | Installiert `pi-mcp-adapter`, merged `mcpServers.ideon`, fügt `ideon-mcp`-Skill hinzu | `pi` muss für MCP-Adapter-Install auf PATH sein |
| `claude` | Symlink `ideon-cli` → `~/.claude/skills/` (oder Projekt `.claude/skills/`) | MCP in `~/.mcp.json` + `ideon-mcp`-Skill | Optional begrenzter Marker in `CLAUDE.md` |
| `claude-desktop` | Export `ideon-cli` + Setup-Schritte | MCPB-Bundle unter `~/.ideon/mcpb/ideon.mcpb` + Desktop-Schritte | Kein automatisches Desktop-Schreiben |
| `chatgpt` | Export nach `~/.ideon/exports/chatgpt/` | Export `ideon-mcp` + In-App-MCP-Schritte | Keine automatisierbare Host-Konfigurationsdatei |
| `gemini` | Symlink → `~/.agents/skills/` + optional `GEMINI.md`-Marker | MCP in `~/.gemini/mcp.json` + `ideon-mcp`-Skill | |
| `codex` | Symlink → `~/.agents/skills/` | TOML-Abschnitt `[mcp_servers.ideon]` in `~/.codex/config.toml` | |
| `cursor` | Symlink → `~/.cursor/skills/` | MCP in `~/.cursor/mcp.json` + `ideon-mcp`-Skill | |
| `vscode` | Symlink → `~/.copilot/skills/` (oder `.github/skills/`) | MCP in `.vscode/mcp.json` unter `servers.ideon` | VS Code nutzt `servers`-Schlüssel |
| `opencode` | Symlink ins OpenCode-Skill-Verzeichnis | MCP unter `mcp.ideon` in `opencode.json` | |
| `hermes` | Symlink `ideon-cli` → `$HERMES_HOME/skills/` | MCP in `$HERMES_HOME/config.yaml` unter `mcp_servers.ideon` + `ideon-mcp`-Skill | Nur global; respektiert `HERMES_HOME`; nach MCP-Install `/reload-mcp` ausführen |
| `generic-mcp` | *(keins)* | Merge `ideon` in `~/.config/mcp/mcp.json` | Host-agnostischer MCP-Fallback |

### MCP-Servereintrag (stdio)

Alle MCP-Registrierungen verwenden:

```json
{
  "command": "ideon",
  "args": ["mcp", "serve"]
}
```

Host-spezifische Wrapper-Schlüssel unterscheiden sich (`mcpServers`, `servers`, `mcp`, TOML-Abschnitt usw.).

### Pi-MCP-Brücke

Bei `pi --mcp-skill` führt Ideon `pi install npm:pi-mcp-adapter` aus und registriert den Stdio-MCP-Eintrag. **Proxy-Modus** über pi-mcp-adapter (keine direkte Tool-Injektion). Der Adapter bleibt bei Deinstallation erhalten.

## Unterbefehle

### ideon agent install

Konfiguriert den Host und speichert das Integrationsprofil.

```bash
ideon agent install pi
ideon agent install cursor --mcp-skill
ideon agent install claude --project
ideon agent install generic-mcp --mcp-skill --dry-run
```

### ideon agent uninstall

Entfernt Ideon-verwaltete Skill-Links und MCP-Einträge aus dem Integrationsprofil. Löscht keine fremden Host-Inhalte.

```bash
ideon agent uninstall pi
ideon agent uninstall cursor --project --dry-run
```

### ideon agent status

Zeigt installierte Laufzeiten, Sync-Check-Metadaten und Artefakt-Verifikation pro Laufzeit.

```bash
ideon agent status
ideon agent status --json
```

`--json`-Ausgabe enthält:

- `installed` — Einträge aus dem Integrationsspeicher
- `runtimeReports[]` — pro Laufzeit `artifacts`, `issues[]` und `readiness` (z. B. `piBinaryOnPath`, `cliSkillLinked`, `mcpConfigured`)
- Vertragszähler und Konfigurationsoberflächen-Bereitschaft

## Ausgabe und Beendigungscodes

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Befehl erfolgreich abgeschlossen. |
| `1` | Laufzeit-ID oder Zustandsvalidierung fehlgeschlagen oder Laufzeitfehler |
| `130` | Befehl durch `Ctrl+C` unterbrochen |

## Verwandte Befehle

- [ideon mcp serve](./ideon-mcp-serve.md)
- [ideon config](./ideon-config.md)
- [Agentenwartung und Synchronisation](../../for-agents/agent-maintenance-and-sync.md)

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.41+`.
- Frühere Versionen schrieben nur die Registry; Host-Konfiguration ab `0.1.41`.
- Lifecycle-Hooks (PreToolUse usw.) werden nicht installiert — nur Skills und MCP.
