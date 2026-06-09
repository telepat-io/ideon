---
title: ideon author
description: Autorenprofile für Stimme, Erfahrung und Fachwissen in Schreib-Prompts verwalten.
keywords: [ideon, cli, author, profile, eeat, expertise]
image: /img/logo.svg
---

# ideon author

## Was dieser Befehl tut

`ideon author` verwaltet Autorenprofile als eigene Entitäten. Jeder Autor hat einen Namen, einen automatisch abgeleiteten Slug und ein freies **profile** (Erfahrung, Stimme, Stil, Qualifikationen). Autorenkontext wird in alle Inhalts-Schreib-Prompts injiziert, wenn er für einen Lauf aufgelöst wird.

## Autoren-Auflösungskette

Beim Start eines Schreiblaufs löst Ideon den aktiven Autor in dieser Reihenfolge auf:

```
CLI --author / job.author → series.defaults.defaultAuthor → publication.defaults.defaultAuthor
```

Laufbezogene **experience notes** (`--experience` oder `job.experienceNotes`) ergänzen die Serien-Erfahrung (`series.defaults.experienceNotes`). Beide werden bei Vorhandensein verkettet.

## Unterbefehle

- [`ideon author add`](#ideon-author-add) — Neuen Autor anlegen
- [`ideon author list`](#ideon-author-list) — Alle Autoren auflisten
- [`ideon author edit`](#ideon-author-edit) — Autor bearbeiten
- [`ideon author remove`](#ideon-author-remove) — Autor löschen

---

## ideon author add

```bash
ideon author add [name] [--profile <text>]
```

| Flag | Erforderlich | Beschreibung |
| --- | --- | --- |
| `[name]` | Ja (oder interaktiv) | Anzeigename. Slug wird automatisch abgeleitet. |
| `--profile <text>` | Empfohlen | Freies Profil: Erfahrung, Stimme, Qualifikationen, Anekdoten für das Modell. |

### Beispiel

```bash
ideon author add "Alex Chen" --profile "Staff SRE bei einem Fintech-Startup. Schreibt über Kubernetes, Incident Response und Platform Engineering."
```

---

## ideon author list

```bash
ideon author list [--json] [--verbose]
```

---

## ideon author edit

```bash
ideon author edit <slug> [--name <name>] [--profile <text>]
```

---

## ideon author remove

```bash
ideon author remove <slug> [-f|--force]
```

---

## Verwandte Befehle

- Standardautor auf Veröffentlichung: `ideon publication edit <slug> --author <author-slug>`
- Standardautor und Serien-Erfahrung: `ideon series edit <slug> --author <author-slug> --experience <text>`
- Pro Lauf überschreiben: `ideon write "..." --author <author-slug> --experience "Laufbezogene Anekdote"`

Siehe auch: [ideon write](./ideon-write.md), [ideon series](./ideon-series.md).
