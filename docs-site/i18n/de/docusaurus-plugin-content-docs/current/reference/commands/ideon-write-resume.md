---
title: ideon write resume
description: Setzen Sie die neueste fehlgeschlagene oder unterbrochene Schreibsitzung vom lokalen Checkpoint-Zustand fort.
keywords: [ideon, cli, resume, checkpoints, write]
---

# ideon write resume

## Was dieser Befehl macht

`ideon write resume` setzt den neuesten fehlgeschlagenen oder unterbrochenen Schreiblauf von der Sitzungszustandsdatei aus fort.

## Verwendung

```bash
ideon write resume [--no-interactive] [--enrich-links] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]
```

## Argumente und Optionen

| Flag/Argument | Kurzform | Erforderlich | Typ | Standard | Erlaubte Werte | Beschreibung |
| --- | --- | --- | --- | --- | --- | --- |
| `--no-interactive` | Kein | Nein | Boolesch | `false` | `true` oder weggelassen | Erzwingt klare nicht-interaktive Renderung auch im TTY-Modus. |
| `--enrich-links` | Kein | Nein | Boolesch | `false` | `true` oder weggelassen | Führt die Link-Anreicherungsstufe während der Fortsetzung aus. |
| `--link <expression->url>` | Kein | Nein | Wiederholbare Zeichenfolge | Keine | `"text->https://..."` | Fügt einen benutzerdefinierten Link in die Sidecar hinzu oder aktualisiert ihn. |
| `--unlink <expression>` | Kein | Nein | Wiederholbare Zeichenfolge | Keine | Beliebiger Ausdrucksstring | Entfernt einen benutzerdefinierten Link nach Ausdruck. |
| `--max-links <n>` | Kein | Nein | Positive Ganzzahl | Abgeleitet von der Artikellänge | Beliebige positive Ganzzahl | Begrenzt die Anzahl der generierten Links. Erfordert `--enrich-links`. |

## Beispiele

```bash title="Minimaler Glückspfad"
ideon write resume
```

```bash title="Häufiger realer Pfad"
ideon write "Long-form article about API docs" --primary article=1 && ideon write resume
```

```bash title="Debug-fokussierte Überprüfung"
ideon write resume && ideon preview --no-open
```

```bash title="One-Shot-Agenten-sicherer Pfad"
ideon write resume --no-interactive
```

## Link-Anreicherung

- Link-Anreicherung ist ein Generierungsnachgang-Vorschlagsdurchlauf für berechtigte Langform-Markdown-Ausgaben.
- Sie wählt Ausdrücke aus, quelle Quell-URLs auf und schreibt `*.links.json`-Sidecar-Dateien, ohne Markdown umzuschreiben.
- Während `ideon write resume` wird die Anreicherung nur ausgeführt, wenn `--enrich-links` bereitgestellt wird.
- Kurzform-Kanäle wie `x-post` und `x-thread` werden übersprungen.

## Ausgabe und Beendigungscodes

Bei Erfolg setzt Ideon von der neuesten geprüften Stufe fort und schreibt finale Ausgaben in das Laufverzeichnis.

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Fortsetzung erfolgreich abgeschlossen. |
| `1` | Keine fortsetzbare Sitzung oder Laufzeitfehler aufgetreten. |
| `130` | Befehl wurde durch `Ctrl+C` unterbrochen. |

## Verwandte Befehle

- [ideon write [idea]](./ideon-write.md)
- [ideon preview [markdownPath]](./ideon-preview.md)

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Keine veralteten Flags gelten für diesen Befehl.