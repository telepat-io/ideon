---
title: ideon series
description: Serien mit Thema, Standardwerten und optionaler Veröffentlichungsverknüpfung verwalten.
keywords: [ideon, cli, serie, inhalt, veröffentlichung]
image: /img/logo.svg
---

# ideon series

## Was dieser Befehl tut

`ideon series` verwaltet Inhaltsressourcen — benannte Sammlungen verwandter Inhalte mit gemeinsamen Standardwerten, redaktionellen Richtlinien und einer optionalen Veröffentlichungsverknüpfung. Serien-Standardwerte überschreiben Veröffentlichungs-Standardwerte in der Einstellungskette.

## Unterbefehle

- [`ideon series add`](#ideon-series-add) — Eine neue Serie erstellen
- [`ideon series list`](#ideon-series-list) — Alle Serien auflisten
- [`ideon series edit`](#ideon-series-edit) — Eine bestehende Serie bearbeiten
- [`ideon series remove`](#ideon-series-remove) — Eine Serie löschen

## Einstellungskette

Wenn eine Serie mit einem Schreibvorgang verknüpft ist, werden ihre Standardwerte nach den Veröffentlichungs-Standardwerten und vor den CLI-Argumenten angewendet:

```
Gespeicherte Einstellungen → Job-Datei → Umgebungsvariablen → Veröffentlichungs-Standardwerte → Serien-Standardwerte → CLI-Argumente
```

## Seriendaten in Prompts

Wenn eine Serie aktiv ist, werden folgende Daten in alle LLM-Prompts injiziert:

- Serienname und Thema als narrativer Faden
- Serien-Richtlinie (Ton, verbotene Themen, Offenlegungsanforderungen, Einschränkungen, Notizen)

---

## ideon series add

Eine neue Inhaltsserie erstellen.

### Verwendung

```bash
ideon series add [name] [--topic <thema>] [--publication <slug>] [--style <stil>] [--intent <absicht>] [--length <größe>] [--type <typ>] [--audience <beschreibung>] [--tone <ton>] [--forbidden-topics <themen>] [--disclosure-requirements <anforderungen>] [--audience-restrictions <einschränkungen>] [--editorial-policy <text>]
```

### Optionen

| Flag | Erforderlich | Typ | Beschreibung |
| --- | --- | --- | --- |
| `[name] | Ja (oder interaktiv) | string | Serienname. Slug wird automatisch generiert. |
| `--topic <thema>` | Nein | string | Freitextbeschreibung des Serienthemas. |
| `--publication <slug>` | Nein | string | Serie mit einer Veröffentlichung verknüpfen. |

### Beispiele

```bash
# Minimale Serie
ideon series add "KI-Tiefenanalysen"

# Serie mit Thema und Veröffentlichung
ideon series add "KI-Tiefenanalysen" --topic "Spitzentechnologien der KI erkunden" --publication tech-blog
```

---

## ideon series list

Alle Serien auflisten.

### Verwendung

```bash
ideon series list [--json] [--verbose] [--publication <slug>]
```

### Optionen

| Flag | Typ | Beschreibung |
| --- | --- | --- |
| `--json` | boolean | Als JSON-Array ausgeben. |
| `--verbose` | boolean | Redaktionelle Richtliniendetails anzeigen. |
| `--publication <slug>` | string | Nach Serien dieser Veröffentlichung filtern. |

---

## ideon series edit

Eine bestehende Serie bearbeiten.

### Verwendung

```bash
ideon series edit <slug> [--name <name>] [--topic <thema>] [--publication <slug>] [--unset-publication] [--style <stil>] [--intent <absicht>] [--length <größe>] [--type <typ>]
```

### Optionen

| Flag | Erforderlich | Typ | Beschreibung |
| --- | --- | --- | --- |
| `<slug>` | Ja | string | Zu bearbeitender Serien-Slug. |
| `--topic <thema>` | Nein | string | Neues Thema. |
| `--publication <slug>` | Nein | string | Mit anderer Veröffentlichung verknüpfen. |
| `--unset-publication` | Nein | boolean | Veröffentlichungsverknüpfung entfernen. |

---

## ideon series remove

Eine Serie löschen.

### Verwendung

```bash
ideon series remove <slug> [--force]
```

### Hinweise

Das Löschen einer Serie betrifft nicht die Artikel, die unter ihr geschrieben wurden. Ihre Metadaten bleiben unverändert.

---

## Serien mit `ideon write` verwenden

### CLI-Flag

```bash
ideon write "Meine Idee" --series ki-tiefenanalysen --primary article=1
```

### Kombination von Veröffentlichung und Serie

```bash
ideon write "Meine Idee" --publication tech-blog --series ki-tiefenanalysen --primary article=1
```

Wenn beide angegeben sind:
- Die Veröffentlichung liefert die grundlegende Richtlinie und Standardwerte
- Die Serie überschreibt Veröffentlichungs-Standardwerte, wo eigene Werte vorhanden sind
- CLI-Argumente überschreiben alles
