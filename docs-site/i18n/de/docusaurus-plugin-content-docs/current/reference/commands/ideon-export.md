---
title: "ideon export <generationId> <path>"
description: Exportiert einen generierten Artikel als eigenständige Markdown-Datei mit Inline-Links und kopierten Bildern.
keywords: [ideon, cli, export, inline links, images]
---

# `ideon export <generationId> <path>`

## Was dieser Befehl macht

`ideon export` erstellt eine **eigenständige, portable Markdown-Datei** aus einem zuvor generierten Artikel durch folgende Schritte:

1. Einlesen des Quell-Markdowns aus dem Generierungsverzeichnis.
2. Laden der zugehörigen `.links.json`-Sidecar-Datei (sowohl `customLinks` als auch `links`) und Inline-Injektion der Links in den Fließtext.
3. Kopieren aller lokal referenzierten Bilder in das Zielverzeichnis unter Beibehaltung ihrer relativen Unterpfade.
4. Schreiben des angereicherten Markdowns nach `<path>/<slug>.md`.

Das ursprüngliche Generierungsverzeichnis und die Sidecar-Datei bleiben unverändert.

## Verwendung

```bash
ideon export <generationId> <path> [--index <n>] [--overwrite]
```

## Argumente und Optionen

| Flag/Argument | Erforderlich | Typ | Standard | Beschreibung |
| --- | --- | --- | --- | --- |
| `<generationId>` | Ja | string | n/a | ID des Generierungsordners (z. B. `20260418-185448-my-article`) oder der `slug` aus dem Frontmatter des Artikels. |
| `<path>` | Ja | string | n/a | Ziel-**Verzeichnis** für die exportierte Datei und Bilder. Wird erstellt, falls nicht vorhanden. |
| `--index <n>` | Nein | positive Ganzzahl | `1` | Welche primäre Artikelvariante exportiert werden soll, wenn eine Generierung mehr als eine erzeugt hat. |
| `--overwrite` | Nein | boolescher Flag | `false` | Überschreibt die Zieldatei, falls sie bereits existiert. Ohne diesen Flag bricht der Befehl mit einem Fehler ab, wenn die Datei vorhanden ist. |

## Benennung der Ausgabedatei

Die exportierte Datei wird nach dem `slug`-Feld im YAML-Frontmatter des Artikels benannt:

```
<path>/<slug>.md
```

## Behandlung von Bildern

Alle Markdown-Bildreferenzen der Form `![alt](relative/path)` werden erkannt und unter Beibehaltung der relativen Unterpfadstruktur ins Ziel kopiert. Absolute URLs und Data-URIs werden ignoriert.

Fehlt eine referenzierte Bilddatei im Quell-Generierungsverzeichnis, bricht der Befehl sofort mit einer Fehlermeldung ab, die die fehlende Datei beschreibt.

## Link-Injektion

Links werden aus der Sidecar-Datei `<article>.links.json` geladen. Die Arrays `customLinks` und `links` werden zusammengeführt und angewendet. Benutzerdefinierte Links (`--link`) ersetzen jedes ungeschützte Vorkommen ihres Ausdrucks im Fließtext; generierte Links ersetzen nur das erste Vorkommen. Wenn keine Sidecar-Datei existiert, wird das Markdown ohne Link-Injektion exportiert.

Der YAML-Frontmatter-Block bleibt exakt wie geschrieben erhalten; die Link-Injektion betrifft nur den Fließtext.

## Überschreibschutz

Ohne `--overwrite` wird der Befehl **mit einem Fehler beendet**, falls `<path>/<slug>.md` bereits existiert, bevor etwas geschrieben wird. Dies verhindert versehentliches Überschreiben.

## Beispiele

Exportiere den zuletzt generierten Artikel nach `~/exports/`:

```bash
ideon export 20260418-185448-metabolic-stability ~/exports/
```

Exportiere anhand des Slugs (Kurzform, wenn der Slug eindeutig ist):

```bash
ideon export metabolic-stability-protocol ~/exports/
```

Exportiere die zweite Variante einer Generierung mit mehreren Artikeln:

```bash
ideon export 20260418-185448-my-article ~/exports/ --index 2
```

Exportiere, selbst wenn die Datei bereits existiert:

```bash
ideon export my-article ~/exports/ --overwrite
```

## Verwandte Befehle

- [`ideon links <slug>`](./ideon-links.md) — aktualisiert die `.links.json`-Sidecar-Datei vor dem Exportieren.
- [`ideon preview`](./ideon-preview.md) — stellt Artikel lokal mit Live-Link-Darstellung bereit, ohne zu exportieren.
