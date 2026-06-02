---
title: ideon write [idea]
description: Generieren Sie eine primäre Inhaltsausgabe und optionale sekundäre Ausgaben aus einer Idee oder Job-Datei.
keywords: [ideon, cli, write, generation, markdown, openrouter, replicate]
image: /img/logo.svg
---

# ideon write [idea]

## Was dieser Befehl macht

`ideon write [idea]` führt die vollständige Ideon-Pipeline aus, um eine erforderliche primäre Ausgabe plus optionale sekundäre Ausgaben zu generieren, mit optionalem Bildrendering, wenn Artikel-Ausgabe ausgewählt ist.

## Verwendung

```bash
ideon write [idea] [--idea <idea>] [--audience <description>] [--job <path>] [--primary <type=1>] [--secondary <type=count> ...] [--style <style>] [--intent <intent>] [--length <size-or-words>] [--no-interactive] [--dry-run] [--enrich-links] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]
```

## Argumente und Optionen

| Flag/Argument | Kurzform | Erforderlich | Typ | Standard | Erlaubte Werte | Beschreibung |
| --- | --- | --- | --- | --- | --- | --- |
| `[idea]` | Kein | Nein | Zeichenfolge | n/a | Beliebiger natürlichsprachlicher Text | Positionaler Ideenprompt, wenn `--idea` nicht bereitgestellt wird. |
| `--idea <idea>` | `-i` | Nein | Zeichenfolge | n/a | Beliebiger natürlichsprachlicher Text | Expliziter Ideenprompt. Hat Vorrang vor positionaler Idee. |
| `--audience <description>` | Kein | Nein | Zeichenfolge | Allgemeines nicht-spezifisches Publikum | Beliebiger natürlichsprachlicher Text | Publikumshinweis, der von der Shared-Plan-Planung verwendet wird. |
| `--job <path>` | `-j` | Nein | Zeichenfolge (Pfad) | n/a | Gültiger JSON-Dateipfad | Lädt Job-Definition aus Datei. |
| `--primary <type=1>` | Kein | Ja im nicht-interaktiven Modus | Zeichenfolge | TTY-Eingabeaufforderung im interaktiven Modus | `article`, `blog-post`, `linkedin-post`, `newsletter`, `press-release`, `reddit-post`, `science-paper`, `x-post`, `x-thread` mit Anzahl `1` | Erforderliches primäres Ziel. Die primäre Anzahl muss genau `1` betragen. |
| `--secondary <type=count>` | Kein | Nein | Wiederholbare Zeichenfolge | Keine | Gleiche Zieltypen wie primär, Anzahl >= `1` | Optionale wiederholbare sekundäre Ziele. |
| `--style <style>` | Kein | Nein | Enum | `professional` | `academic`, `analytical`, `authoritative`, `conversational`, `empathetic`, `friendly`, `journalistic`, `minimalist`, `persuasive`, `playful`, `professional`, `storytelling`, `technical` | Schreibstil, der auf alle generierten Inhalte angewendet wird. |
| `--intent <intent>` | Kein | Ja im nicht-interaktiven Modus | Enum | TTY-Eingabeaufforderung im interaktiven Modus | `announcement`, `case-study`, `cornerstone`, `counterargument`, `critique-review`, `deep-dive-analysis`, `how-to-guide`, `interview-q-and-a`, `listicle`, `opinion-piece`, `personal-essay`, `roundup-curation`, `tutorial` | Inhaltsabsicht, die Struktur und Argumentform über alle generierten Ausgaben steuert. |
| `--length <size-or-words>` | Kein | Nein | Enum oder Ganzzahl | `medium`-Alias (`900` Wörter) | `small`, `medium`, `large` oder positive Ganzzahl | Ziel-Inhaltslänge in Wörtern. Aliase ordnen `small=500`, `medium=900`, `large=1400` zu. |
| `--no-interactive` | Kein | Nein | Boolesch | `false` | `true` oder weggelassen | Deaktiviert alle Eingabeaufforderungen und schlägt schnell fehl, wenn erforderliche Eingaben fehlen. |
| `--dry-run` | Kein | Nein | Boolesch | `false` | `true` oder weggelassen | Führt Orchestrierung ohne Anbieter-API-Aufrufe aus. |
| `--enrich-links` | Kein | Nein | Boolesch | `false` | `true` oder weggelassen | Führt die Link-Anreicherungsstufe nach der Markdown-Generierung aus. |
| `--link <expression->url>` | Kein | Nein | Wiederholbare Zeichenfolge | Keine | `"text->https://..."` | Fügt einen benutzerdefinierten Link in die Sidecar hinzu oder aktualisiert ihn. Format: `expression->url`. Wiederholbar. Benutzerdefinierte Links haben Vorrang vor generierten. |
| `--unlink <expression>` | Kein | Nein | Wiederholbare Zeichenfolge | Keine | Beliebiger Ausdrucksstring | Entfernt einen benutzerdefinierten Link nach Ausdruck. Wiederholbar. |
| `--max-links <n>` | Kein | Nein | Positive Ganzzahl | Abgeleitet von `--length` | Beliebige positive Ganzzahl | Begrenzt die Anzahl der generierten Links. Gilt nicht für benutzerdefinierte Links. Erfordert `--enrich-links`. |
| `--publication <slug>` | Kein | Nein | Zeichenfolge | n/a | Gültiger Veröffentlichungs-Slug | Veröffentlichungs-Slug für Standardwerte und redaktionelle Richtlinie. |
| `--series <slug>` | Kein | Nein | Zeichenfolge | n/a | Gültiger Serien-Slug | Serien-Slug für Standardwerte und thematischen Kontext. Serie überschreibt Veröffentlichungs-Standardwerte. |

## Beispiele

```bash title="Minimaler Glückspfad"
ideon write "How AI changes technical publishing"
```

```bash title="Häufiger realer Pfad"
ideon write "How small editorial teams scale content" --primary article=1 --secondary x-thread=2 --style technical --intent how-to-guide --length large
```

```bash title="Mit Serienverknüpfung"
ideon write "Deep dive into transformer architectures" --primary article=1 --series ki-tiefenanalysen --publication tech-blog
```

```bash title="Sicherheits- und Debug-Pfad"
ideon write --dry-run "How to test Ideon pipeline changes" --primary article=1
```

```bash title="One-Shot-Agenten-sicherer Pfad"
ideon write --no-interactive --idea "How to productionize docs operations" --primary article=1 --style technical --intent tutorial --length 1200
```

## Nicht-interaktives Verhalten

Wenn `--no-interactive` gesetzt ist, fragt Ideon nicht nach fehlenden Werten, auch nicht in TTY-Umgebungen.

- Fehlende Ideeneingabe schlägt sofort fehl.
- Fehlende `--primary`, `--style`, `--intent` oder `--length` im nicht-interaktiven Modus schlagen sofort mit umsetzbaren Fehlern fehl.
- `--length` akzeptiert Aliase (`small`, `medium`, `large`) oder eine positive Ganzzahl-Wortanzahl.
- Dies ist der empfohlene Modus für One-Shot-Agenten- und CI-Workflows.

## Link-Anreicherung

- Link-Anreicherung ist ein Generierungsnachgang-Vorschlagsdurchlauf für berechtigte Langform-Markdown-Ausgaben.
- Ideon wählt linkbare Ausdrücke aus, relevante Quell-URLs mit Modell + Websuche auf und schreibt Ergebnisse in `*.links.json`-Sidecar-Dateien.
- Die ursprünglichen Markdown-Dateien werden durch diesen Schritt nicht umgeschrieben.
- Während `ideon write` wird die Anreicherung nur ausgeführt, wenn `--enrich-links` bereitgestellt wird.
- Kurzform-Kanäle wie `x-post` und `x-thread` werden übersprungen.
- Verwenden Sie `--link "expression->url"`, um benutzerdefinierte Links hinzuzufügen, die separat gespeichert und immer einbezogen werden (siehe [ideon links](./ideon-links.md) für vollständige benutzerdefinierte Link-Semantik).
- Verwenden Sie `--max-links <n>`, um die Anzahl der generierten Links zu begrenzen; Standardwerte sind 5 / 8 / 12 basierend auf `--length`.

## Ausgabe und Beendigungscodes

Bei Erfolg schreibt Ideon Generierungsausgaben unter `output/<timestamp>-<slug>/` und druckt Pipeline-Abschluss-Details.

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Schreiben erfolgreich abgeschlossen. |
| `1` | Validierungs- oder Laufzeitfehler aufgetreten. |
| `130` | Befehl wurde durch `Ctrl+C` unterbrochen. |

## Verwandte Befehle

- [ideon write resume](./ideon-write-resume.md)
- [ideon config](./ideon-config.md)
- [ideon preview [markdownPath]](./ideon-preview.md)
- [ideon settings](./ideon-settings.md)
- [Konfigurationsanleitung](../../guides/configuration.md)

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Veraltete `--target`-Syntax wurde durch `--primary` und wiederholbare `--secondary` ersetzt.