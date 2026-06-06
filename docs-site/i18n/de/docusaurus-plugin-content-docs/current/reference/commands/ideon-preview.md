---
title: ideon preview [markdownPath]
description: Starten Sie den lokalen Vorschau-Server und die React-Vorschau-App für generierte Ideon-Inhalte.
keywords: [ideon, cli, preview, local server, react]
image: /img/logo.svg
---

# ideon preview [markdownPath]

## Was dieser Befehl macht

`ideon preview [markdownPath]` startet die lokale Vorschau-API und stellt die React-Vorschau-Benutzoberfläche bereit, sodass Sie generierte Ausgaben und Ressourcen im Browser inspizieren können.

## Verwendung

```bash
ideon preview [markdownPath] [--port <port>] [--no-open] [--watch]
```

## Argumente und Optionen

| Flag/Argument | Kurzform | Erforderlich | Typ | Standard | Erlaubte Werte | Beschreibung |
| --- | --- | --- | --- | --- | --- | --- |
| `[markdownPath]` | Kein | Nein | Zeichenfolge (Pfad) | Neuestes generiertes Markdown im Ausgabeverzeichnis | Gültiger Markdown-Dateipfad | Bestimmte Markdown-Ausgabe zum Vorschauen. |
| `--port <port>` | `-p` | Nein | Ganzzahl | `4173` | Gültiger TCP-Port | Port für den Vorschau-Server. |
| `--no-open` | Kein | Nein | Boolesch | `false` | `true` oder weggelassen | Startet den Server ohne Browser zu öffnen. |
| `--watch` | Kein | Nein | Boolesch | `false` | `true` oder weggelassen | Baut die Vorschau-Benutzoberfläche bei Quellcodeänderungen neu und lädt den Browser automatisch neu. |

## Beispiele

```bash title="Minimaler Glückspfad"
ideon preview
```

```bash title="Häufiger realer Pfad"
ideon preview ./output/my-article.md --port 4173 --no-open
```

```bash title="Debug-fossierte Entwicklungspfad"
ideon preview --watch --no-open
```

## Ausgabe und Beendigungscodes

Bei Erfolg druckt Ideon die Vorschau-URL, den ausgew Artikel-Pfad und das bereitgestellte Ressourcen-Verzeichnis.

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Vorschau-Server erfolgreich gestartet. |
| `1` | Vorschau aufgrund ungültigen Pfads, ungültigen Ports oder Laufzeitfehlern fehlgeschlagen. |
| `130` | Befehl wurde durch `Ctrl+C` unterbrochen. |

## Verwandte Befehle

- [ideon write [idea]](./ideon-write.md)
- [`ideon delete <slug>`](./ideon-delete.md)
- [Lokale Vorschau-Anleitung](../../guides/local-preview.md)

## MCP-Äquivalent

Agenten, die den Ideon-MCP-Server verwenden, können den Vorschau-Server mit `ideon_preview` steuern (`action`: `start`, `stop` oder `status`). Siehe [MCP-Server](../../for-agents/mcp-servers.md).

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Keine veralteten Flags gelten für diesen Befehl.