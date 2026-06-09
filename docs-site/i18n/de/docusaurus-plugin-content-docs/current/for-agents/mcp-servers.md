---
title: MCP-Server
description: Aktueller MCP-Server-Status für Ideon und Anleitung für zukünftige MCP-Oberflächendokumentation.
keywords: [ideon, agents, mcp, protocol, integration]
---

# MCP-Server

Ideon veröffentlicht einen ersten Partei Model Context Protocol Server über stdio-Transport.

## Aktueller Status

- Einstiegsbefehl: `ideon mcp serve`
- Transport: stdio
- Bestimmte Verwendung: lokal prozessgestartete MCP-Clients
- Aktuelle Werkzeugmenge:
	- `ideon_write`
	- `ideon_write_resume`
	- `ideon_delete`
	- `ideon_links`
	- `ideon_config_get`
	- `ideon_config_set`
	- `ideon_config_list`
	- `ideon_config_unset`
	- `gkp_generate_ideas`
	- `gkp_get_historical_data`
	- `gkp_get_forecast_data`
	- `ideon_preview`
	- `ideon_author_add`, `ideon_author_list`, `ideon_author_edit`, `ideon_author_remove`
	- (sowie Veröffentlichungs-, Serien-, Warteschlangen-, Planungs- und Export-Werkzeuge — siehe englische [MCP Servers](/ideon/for-agents/mcp-servers))

SEO-Check läuft als Pipeline-Stufe 4 während `ideon_write` / `ideon_write_resume` — es gibt kein eigenständiges SEO-MCP-Werkzeug. Optionale Parameter auf `ideon_write`: `author` (Autoren-Slug), `experienceNotes` (Lauf-Anekdoten), `noSeoCheck`, `seoCheckMode` (`errors-only` | `strict`), `seoCheckMaxTurns` (1–20); auf `ideon_write_resume`: `seoCheck` (Erzwingen), `seoCheckMode`, `seoCheckMaxTurns`. Ergebnisse in `meta.json` (`seoCheck`, `author`, `editorialChecklist`). Erfolgreiche Läufe enthalten eine Redaktions-Checklisten-Zusammenfassung in der Tool-Antwort.

### Vorschau

- `ideon_preview` — Lokalen Vorschau-Server starten, stoppen oder Status abfragen

| Parameter | Typ | Erforderlich | Standard | Beschreibung |
| --- | --- | --- | --- | --- |
| `action` | Enum | Ja | — | `start`, `stop` oder `status` |
| `port` | Ganzzahl | Nein | `4173` | Port des Vorschau-Servers (nur bei `start`) |
| `markdownPath` | Zeichenkette | Nein | Neuestes generiertes Markdown | Bestimmte Markdown-Datei für die Vorschau (nur bei `start`) |

Der Status gilt nur für Vorschau-Server, die vom aktuellen MCP-Prozess gestartet wurden. Separat über `ideon preview` gestartete Server werden nicht erfasst.

## Google Keyword Planner-Werkzeuge

Die drei `gkp_*`-Werkzeuge bieten Zugriff auf Google Ads Keyword Planner-Daten. Sie erfordern sechs Google Ads-Anmeldeinformationen, die vor der Verwendung konfiguriert werden müssen.

Für Einrichtungsanleitungen siehe [Google Ads Keyword Planner Einrichtung](../guides/google-ads-keyword-planner.md).

## Vertragshinweise

- Werkzeugverträge müssen mit CLI-Verhalten und Skill-Metadaten synchronisiert bleiben.
- Vertragsparität wird über die Integrations-Synchronisationsprüfung im Lint validiert.
- Fehler von Werkzeughandlern werden als MCP-Werkzeugfehler mit umsetzbaren Nachrichten zurückgegeben.

## Wartungsrichtlinie

Für die obligatorische Änderungs-Synchronisationsregel und Validierungscheckliste siehe:

- [Agentenwartung und Synchronisation](./agent-maintenance-and-sync.md)