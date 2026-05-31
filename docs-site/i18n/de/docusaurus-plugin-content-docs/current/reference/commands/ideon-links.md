---
title: "ideon links <slug>"
description: Führen Sie Link-Anreicherung nur für einen bestehenden generierten Artikel aus.
keywords: [ideon, cli, links, enrichment, sidecar]
---

# `ideon links <slug>`

## Was dieser Befehl macht

`ideon links <slug>` führt nur die Link-Anreicherungsstufe für einen bestehenden generierten Markdown-Artikel aus und schreibt oder aktualisiert dann seine `.links.json`-Sidecar.

Link-Anreicherung bedeutet hier: Ideon wählt linkbare Ausdrücke im Markdown aus, relevante Quell-URLs mit Modell + Websuche auf und speichert diese Link-Vorschläge in Sidecar-Metadaten.

Die ursprüngliche Markdown-Datei wird nicht umgeschrieben; die Vorschau wendet Sidecar-Links bei der Renderzeit an.

## Verwendung

```bash
ideon links <slug> [--mode <fresh|append>] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]
```

## Argumente und Optionen

| Flag/Argument | Kurzform | Erforderlich | Typ | Standard | Erlaubte Werte | Beschreibung |
| --- | --- | --- | --- | --- | --- | --- |
| `<slug>` | Kein | Ja | Zeichenfolge | n/a | Generierter Artikel-Slug | Wählt den Zielartikel nach Frontmatter-Slug aus. |
| `--mode <mode>` | Kein | Nein | Enum | `fresh` | `fresh`, `append` | `fresh` ersetzt bestehende generierte Links. `append` fusioniert neu generierte Links in bestehende Einträge. Benutzerdefinierte Links werden von `--mode` nicht beeinflusst. |
| `--link <expression->url>` | Kein | Nein | Wiederholbare Zeichenfolge | Keine | `"text->https://..."` | Fügt einen benutzerdefinierten Link hinzu oder aktualisiert ihn. Das Format ist `expression->url`. Wiederholbar für mehrere benutzerdefinierte Links. Benutzerdefinierte Links werden separat von generierten gespeichert, immer einbezogen, unabhängig von `--mode`, und auf jedes ungeschützte Vorkommen des Ausdrucks im Artikelschworpen angewendet. |
| `--unlink <expression>` | Kein | Nein | Wiederholbare Zeichenfolge | Keine | Beliebiger Ausdrucksstring | Entfernt einen benutzerdefinierten Link nach Ausdruckstext. Wiederholbar. Groß-/Kleinschreibung-unabhängig. |
| `--max-links <n>` | Kein | Nein | Positive Ganzzahl | Abgeleitet von der Artikellänge | Beliebige positive Ganzzahl | Begrenzt die Anzahl der generierten Links. Beeinflusst benutzerdefinierte Links nicht. |

Hinweise:

- Der Befehl zielt auf berechtigte Langform-Ausgaben ab; Kurzform-Kanäle wie `x-post` und `x-thread` werden von der Anreicherungslogik übersprungen.

## Modus-Semantik

- `fresh`:
  - Generiert eine neue Linkmenge.
  - Ersetzt vorhandene **generierte** Links in der Sidecar.
  - **Benutzerdefinierte Links (hinzugefügt über `--link`) werden immer beibehalten**, unabhängig von `--mode`.
- `append`:
  - Generiert eine neue Linkmenge.
  - Fügt in bestehende generierte Sidecar-Einträge mit Deduplizierung nach `expression + url` ein.
  - Wenn keine Sidecar existiert, wird eine erstellt.

## Benutzerdefinierte Links

Benutzerdefinierte Links sind benutzerspezifische `expression → url`-Paare, die:

- Separate von LLM-generierten Links in der Sidecar gespeichert werden.
- Immer in der Vorschau-Renderung einbezogen werden, unabhängig von `--mode`.
- Vorrang vor generierten Links haben: Wenn das LLM einen Ausdruck auswählt, der bereits einen benutzerdefinierten Link hat, wird der generierte Eintrag für diesen Ausdruck verworfen.
- **Auf jedes ungeschützte Vorkommen** des Ausdrucks im gesamten Artikelschworpen angewendet werden (generierte Links ersetzen nur das erste Vorkommen).
- Über `--mode fresh`-Läufe hinweg persistiert werden — nur `--unlink` entfernt sie.

Um einen benutzerdefinierten Link hinzuzufügen:

```bash
ideon links my-article --link "React->https://react.dev"
```

Um einen benutzerdefinierten Link zu entfernen:

```bash
ideon links my-article --unlink "React"
```

## Sidecar-Format (v2)

Sidecars, die von diesem Befehl geschrieben werden, haben die folgende Struktur:

```json
{
  "version": 2,
  "customLinks": [
    { "expression": "React", "url": "https://react.dev", "title": null }
  ],
  "links": [
    { "expression": "OpenRouter", "url": "https://openrouter.ai", "title": "OpenRouter" }
  ]
}
```

Version 1-Sidecars werden transparent gelesen, wobei `customLinks` als leer behandelt wird.

## Standard-Max-Links

Wenn `--max-links` nicht bereitgestellt wird, ist der Standard basierend auf der Artikel-Zielwortzahl:

| Wortzahlbereich | Standard-Max-Links |
| --- | --- |
| ≤ 700 Wörter | 5 |
| 701 – 1150 Wörter | 8 |
| > 1150 Wörter | 12 |

## Beispiele

```bash title="Standardverhalten (fresh)"
ideon links ai-content-ops-playbook
```

```bash title="Expliziter fresh-Modus"
ideon links ai-content-ops-playbook --mode fresh
```

```bash title="In bestehende Sidecar einfügen"
ideon links ai-content-ops-playbook --mode append
```

```bash title="Einen benutzerdefinierten Link hinzufügen"
ideon links ai-content-ops-playbook --link "OpenRouter->https://openrouter.ai"
```

```bash title="Mehrere benutzerdefinierte Links hinzufügen"
ideon links ai-content-ops-playbook --link "React->https://react.dev" --link "Node.js->https://nodejs.org"
```

```bash title="Einen benutzerdefinierten Link entfernen"
ideon links ai-content-ops-playbook --unlink "React"
```

```bash title="Generierte Links auf 5 begrenzen"
ideon links ai-content-ops-playbook --max-links 5
```

## Ausgabe und Beendigungscodes

Bei Erfolg schreibt Ideon eine Sidecar-Datei neben die passende Markdown-Datei (z.B. `article-1.links.json`).

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Link-Anreicherung erfolgreich abgeschlossen. |
| `1` | Validierung, Nachschlagen, Anmeldeinformationen oder Laufzeitfehler aufgetreten. |

## Verwandte Befehle

- [ideon write [idea]](./ideon-write.md)
- [ideon write resume](./ideon-write-resume.md)
- [ideon preview [markdownPath]](./ideon-preview.md)