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
	- (sowie Veröffentlichungs-, Serien-, Warteschlangen-, Planungs- und Export-Werkzeuge — vollständige Liste in der englischen [MCP Servers](pathname:///ideon/for-agents/mcp-servers))

SEO-Check läuft als Pipeline-Stufe 4 während `ideon_write` / `ideon_write_resume` — es gibt kein eigenständiges SEO-MCP-Werkzeug. Optionale Parameter auf `ideon_write`: `author` (Autoren-Slug), `experienceNotes` (Lauf-Anekdoten), `noSeoCheck`, `seoCheckMode` (`errors-only` | `strict`), `seoCheckMaxTurns` (1–20); auf `ideon_write_resume`: `seoCheck` (Erzwingen), `seoCheckMode`, `seoCheckMaxTurns`. Ergebnisse in `meta.json` (`seoCheck`, `author`, `editorialChecklist`). Erfolgreiche Läufe enthalten eine Redaktions-Checklisten-Zusammenfassung in der Tool-Antwort.

### Vorschau

- `ideon_preview` — Lokalen Vorschau-Server starten, stoppen oder Status abfragen

| Parameter | Typ | Erforderlich | Standard | Beschreibung |
| --- | --- | --- | --- | --- |
| `action` | Enum | Ja | — | `start`, `stop` oder `status` |
| `port` | Ganzzahl | Nein | `4173` | Port des Vorschau-Servers (nur bei `start`). In Telepat Monad `5679` hinter Caddy übergeben. |
| `markdownPath` | Zeichenkette | Nein | Neuestes generiertes Markdown | Bestimmte Markdown-Datei für die Vorschau (nur bei `start`) |

`structuredContent.url` ist immer `http://localhost:<port>`. Umgebungen hinter einem Reverse Proxy sollten auf eine öffentliche URL übersetzen (z. B. `TELEPAT_IDEON_PREVIEW_URL` in Monad).

Der Status gilt nur für Vorschau-Server, die vom aktuellen MCP-Prozess gestartet wurden. Separat über `ideon preview` gestartete Server werden nicht erfasst.

### Google Ads OAuth

- `gads_login` — OAuth-Ablauf für Google Ads API-Zugriff starten. Speichert statische Anmeldeinformationen wenn möglich; gibt `authUrl` und `port` in `structuredContent` zurück.
- `gads_login_status` — OAuth-Status abfragen: `not_started`, `pending`, `completed` oder `timed_out`. Bei `completed` werden `refreshToken`, `saved` und `envVarName` (`TELEPAT_GOOGLE_ADS_REFRESH_TOKEN`) zurückgegeben.
- `gads_test` — Konfigurierte Anmeldeinformationen mit einem Test-API-Aufruf verifizieren.
- `gads_logout` — Google Ads-Anmeldeinformationen löschen (`all` löscht alles).

**Container-Persistenzvertrag** (`TELEPAT_DISABLE_KEYTAR=1`):

- Statische Anmeldeinformationen sollten über `TELEPAT_GOOGLE_ADS_*`-Umgebungsvariablen vorab gesetzt werden.
- `gads_login` überspringt Keychain-`configSet` für bereits in der Umgebung gesetzte Anmeldeinformationen.
- Bei OAuth-Abschluss: `saved: false` und `refreshToken` wird für externe Persistenz zurückgegeben (z. B. Agent schreibt `.env`).

Setzen Sie `TELEPAT_IDEON_GADS_REDIRECT_URL` auf die öffentliche Callback-URL (Web OAuth). Fallback: `http://localhost:9876/callback` (Desktop OAuth).

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