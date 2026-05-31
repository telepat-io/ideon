---
title: ideon delete <slug>
description: Löschen Sie eine generierte Markdown-Ausgabe nach Slug mit sicherer Behandlung gemeinsamer Ressourcen.
keywords: [ideon, cli, delete, cleanup, output]
---

# `ideon delete <slug>`

## Was dieser Befehl macht

`ideon delete <slug>` entfernt eine generierte Markdown-Ausgabe und ihre Analyse-Sidecar und entfernt das Generierungsressourcen-Verzeichnis nur, wenn keine Geschwister-Markdown-Ausgaben mehr vorhanden sind.

## Verwendung

```bash
ideon delete <slug> [--force]
```

## Argumente und Optionen

| Flag/Argument | Kurzform | Erforderlich | Typ | Standard | Erlaubte Werte | Beschreibung |
| --- | --- | --- | --- | --- | --- | --- |
| `<slug>` | Kein | Ja | Zeichenfolge | n/a | Generierter Artikel-Slug ohne `.md` | Slug der zu löschenden generierten Ausgabe. |
| `--force` | `-f` | Nein | Boolesch | `false` | `true` oder weggelassen | Überspringt interaktive Löschbestätigung. |

## Beispiele

```bash title="Minimaler Glückspfad"
ideon delete my-article-slug
```

```bash title="Häufiger realer Pfad"
ideon delete my-article-slug --force
```

```bash title="Sicherheits- und Debug-Pfad"
ideon delete my-article-slug --force && ideon preview --no-open
```

## Ausgabe und Beendigungscodes

Bei Erfolg druckt Ideon gelöschte Pfade und Aufräumdetails.

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Löschen erfolgreich abgeschlossen. |
| `1` | Löschen aufgrund fehlenden Slugs, Berechtigungen oder Laufzeitfehlern fehlgeschlagen. |
| `130` | Befehl wurde durch `Ctrl+C` unterbrochen. |

## Verwandte Befehle

- [ideon write [idea]](./ideon-write.md)
- [ideon preview [markdownPath]](./ideon-preview.md)

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Keine veralteten Flags gelten für diesen Befehl.