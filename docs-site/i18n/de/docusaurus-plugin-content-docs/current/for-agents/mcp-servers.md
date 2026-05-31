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