---
title: ideon mcp serve
description: Starten Sie den ersten Partei Ideon Model Context Protocol Server über stdio-Transport.
keywords: [ideon, cli, mcp, stdio, agents]
---

# ideon mcp serve

## Was dieser Befehl macht

`ideon mcp serve` startet Ideons MCP-Server über stdio, sodass ein MCP-Client Ideon-Werkzeuge aufrufen kann.

## Verwendung

```bash
ideon mcp serve
```

## Transport und Geltungsbereich

- Transport: stdio
- Bestimmte Verwendung: lokal prozessgestartete MCP-Clients
- Integrationsgeltungsbereich: CLI/MCP-Laufzeiten
- Unterstützte Laufzeiten: claude, claude-desktop, chatgpt, gemini, codex, cursor, vscode, opencode, hermes, generic-mcp

## Verfügbare Werkzeuge

### Ideon-Werkzeuge

- `ideon_write`
- `ideon_write_resume`
- `ideon_delete`
- `ideon_links`
- `ideon_config_get`
- `ideon_config_set`
- `ideon_config_list`
- `ideon_config_unset`

### Google Keyword Planner-Werkzeuge

- `gkp_generate_ideas` — Finden Sie verwandte Keywords aus Seed-Keywords oder einer URL
- `gkp_get_historical_data` — Erhalten Sie historische Suchvolumen und Wettbewerb für Keywords
- `gkp_get_forecast_data` — Projizieren Sie Impressionen, Klicks und Kosten für Keywords

Die GKP-Werkzeuge erfordern sechs Google Ads-Anmeldeinformationen, die vor der Verwendung konfiguriert werden müssen. Für Einrichtungsanleitungen siehe [Google Ads Keyword Planner Einrichtung](../../guides/google-ads-keyword-planner.md).

## Ausgabe und Beendigungscodes

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Server sauber beendet. |
| `1` | Server konnte nicht starten oder ist auf einen Laufzeitfehler gestoßen. |
| `130` | Befehl wurde durch `Ctrl+C` unterbrochen. |

## Verwandte Befehle

- [ideon agent](./ideon-agent.md)
- [ideon config](./ideon-config.md)
- [MCP-Server (Für Agenten)](../../for-agents/mcp-servers.md)
- [Google Ads Keyword Planner Einrichtung](../../guides/google-ads-keyword-planner.md)

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Werkzeugverträge werden durch die Integrations-Synchronisationsprüfung validiert.