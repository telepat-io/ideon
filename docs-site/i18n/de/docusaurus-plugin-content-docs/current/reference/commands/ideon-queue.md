---
title: ideon queue
description: Verwalten Sie die Inhaltswarteschlange für die Planung zukünftiger Artikel.
keywords: [ideon, cli, warteschlange, inhalte, planung]
image: /img/logo.svg
---

# ideon queue

## Was dieser Befehl macht

`ideon queue` verwaltet die Inhaltswarteschlange — eine globale Liste ausstehender Artikel, die geschrieben werden sollen. Warteschlangeneinträge speichern beim Hinzufügen einen vollständig aufgelösten Snapshot der Schreibparameter.

## Unterbefehle

- [`ideon queue add`](#ideon-queue-add) — Einen Artikel zur Warteschlange hinzufügen
- [`ideon queue list`](#ideon-queue-list) — Warteschlangenartikel auflisten
- [`ideon queue peek`](#ideon-queue-peek) — Den nächsten ausstehenden Artikel anzeigen, ohne ihn zu verbrauchen
- [`ideon queue remove`](#ideon-queue-remove) — Einen Warteschlangeneintrag nach ID löschen
- [`ideon queue clear`](#ideon-queue-clear) — Alle Warteschlangeneinträge löschen

## Speicherung

Warteschlangeneinträge werden als einzelne JSON-Dateien in `~/.config/ideon/queue/` gespeichert.

## Atomarer Schutz

Wenn `ideon write --from-queue` einen Eintrag aufnimmt, wird `<id>.json` in `<id>.in-progress.json` umbenannt. Bei Erfolg wird die Datei gelöscht. Bei Fehler oder Unterbrechung wird sie automatisch wiederhergestellt.

---

## ideon queue add

Einen Artikel zur Inhaltswarteschlange hinzufügen.

### Verwendung

```bash
ideon queue add [idea] [--idea <idea>] [--audience <description>] [--job <path>] [--primary <type=1>] [--secondary <type=count> ...] [--style <style>] [--intent <intent>] [--length <size-or-words>] [--publication <slug>] [--series <slug>] [--no-interactive] [--export <path>]
```

### Optionen

`ideon queue add` akzeptiert dieselben inhaltsdefinierenden Optionen wie [`ideon write`](/reference/commands/ideon-write#argumente-und-optionen).

| Flag | Erforderlich | Typ | Beschreibung |
| --- | --- | --- | --- |
| `[idea]` | Nein | Zeichenfolge | Positionaler Ideenprompt. |
| `--idea <idea>` | Nein | Zeichenfolge | Expliziter Ideenprompt. |
| `--audience <description>` | Nein | Zeichenfolge | Publikumshinweis. |
| `--job <path>` | Nein | Zeichenfolge | Pfad zu einer JSON-Job-Definition. |
| `--primary <type=1>` | Ja im Nicht-Interaktiv-Modus | Zeichenfolge | Primäres Ausgabeziel. |
| `--secondary <type=count>` | Nein | Wiederholbare Zeichenfolge | Sekundäre Ausgabeziele. |
| `--style <style>` | Nein | Enum | Schreibstil. |
| `--intent <intent>` | Nein | Enum | Inhaltsabsicht. |
| `--length <size-or-words>` | Nein | Enum oder Ganzzahl | Ziellänge. |
| `--publication <slug>` | Nein | Zeichenfolge | Veröffentlichung für Standardwerte. |
| `--series <slug>` | Nein | Zeichenfolge | Serie für Standardwerte. |
| `--no-interactive` | Nein | Boolesch | Fehlschlagen statt Nachfragen. |
| `--export <path>` | Nein | Zeichenfolge | Exportpfad nach dem Schreiben. |

### Beispiele

```bash
# Einfache Idee einreihen
ideon queue add "Wie KI das technische Publizieren verändert" --primary article=1 --style technical --intent tutorial

# Mit Veröffentlichung und Serie
ideon queue add "Deep Dive in RAG" --primary article=1 --publication tech-blog --series ki-tiefenanalysen
```

---

## ideon queue list

Warteschlangenartikel auflisten.

### Verwendung

```bash
ideon queue list [--json] [--publication <slug>] [--status <status>]
```

---

## ideon queue peek

Den nächsten ausstehenden Artikel anzeigen, ohne ihn zu verbrauchen.

### Verwendung

```bash
ideon queue peek [--publication <slug>]
```

---

## ideon queue remove

Einen Warteschlangeneintrag nach ID löschen.

### Verwendung

```bash
ideon queue remove <id> [--force]
```

---

## ideon queue clear

Alle Warteschlangeneinträge löschen.

### Verwendung

```bash
ideon queue clear [--force]
```

---

## Verwendung der Warteschlange mit `ideon write`

```bash
# Nächsten ausstehenden Artikel schreiben
ideon write --from-queue

# Nächsten Artikel für eine bestimmte Veröffentlichung schreiben
ideon write --from-queue --publication tech-blog

# Warteschlangeneinstellungen überschreiben
ideon write --from-queue --style playful
```

## Verwandte Befehle

- [ideon write [idea]](/reference/commands/ideon-write)
- [ideon write resume](/reference/commands/ideon-write-resume)
