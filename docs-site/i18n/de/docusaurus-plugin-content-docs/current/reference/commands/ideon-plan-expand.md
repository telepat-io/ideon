---
title: ideon plan expand
description: Erweitern Sie eine bestehende Serie mit neuen Keyword-gestützten Artikelideen unter Verwendung von Google Keyword Planner-Daten.
keywords: [ideon, plan, expand, Inhaltsplanung, Serienerweiterung, Keyword-Recherche]
---

# ideon plan expand

Erweitern Sie eine bestehende Serie mit neuen Artikelideen, gestützt durch Google Keyword Planner-Recherche. Der Plan wird in einem interaktiven Überprüfungsablauf präsentiert, bevor er in Ihrer Warteschlange gespeichert wird.

## Syntax

```bash
ideon plan expand [series-slug] [Optionen]
```

## Argumente

| Argument | Beschreibung | Erforderlich |
|----------|-------------|----------|
| `series-slug` | Zu erweiternder Serien-Slug | Nein (kann interaktiv ausgewählt werden) |

Wenn `series-slug` weggelassen und nicht über `--non-interactive` bereitgestellt wird, listet Ideon verfügbare Serien auf und fordert interaktiv zur Auswahl auf.

## Optionen

| Option | Alias | Beschreibung | Standard |
|--------|-------|-------------|---------|
| `--publication` | `-p` | Publikations-Slug | **Erforderlich** |
| `--country` | | Kommagetrennte ISO-Ländercodes | Publikationsstandard oder `US` |
| `--language` | | ISO 639-1 Sprachcode | Publikationsstandard oder `en` |
| `--article-count` | | Zielanzahl neuer zu planender Artikel | `5` |
| `--seed-keywords` | | Kommagetrennte zusätzliche Seed-Keywords | — |
| `--content-type` | | Inhaltstyp für Warteschlangeneinträge | `article` |
| `--model` | | Modell für starke Reasoning-Aufrufe | `deepseek/deepseek-v4-pro` |
| `--intent-model` | | Modell für Intent-Klassifizierung | `deepseek/deepseek-v4-flash` |
| `--auto-save` | | Genehmigungstore überspringen und automatisch speichern | `false` |
| `--non-interactive` | | Agent-Modus: Klartextausgabe nach stdout | `false` |
| `--dry-run` | | Recherche ausführen, aber alle Schreibvorgänge überspringen | `false` |

## Beispiele

### Einfache Erweiterung

```bash
ideon plan expand ai-deep-dives --publication tech-blog
```

Wenn der Serien-Slug weggelassen wird, zeigt eine interaktive Eingabeaufforderung verfügbare Serien zur Auswahl an.

### Mit benutzerdefinierter Artikelanzahl

```bash
ideon plan expand kubernetes-series \
  --publication tech-blog \
  --article-count 8
```

### Seed-Keywords hinzufügen

```bash
ideon plan expand cloud-cost \
  --publication finops-blog \
  --seed-keywords "Cloud-Repatriierung,AWS-Sparpläne,Reserved-Instances-Preise" \
  --article-count 4
```

Diese zusätzlichen Keywords ergänzen die bestehenden Keywords der Serie für die GKP-Recherche.

### Nicht-interaktiver Agent-Modus

```bash
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --non-interactive \
  --auto-save
```

Ausgabe geht nach stdout. Der Plan wird automatisch persistiert.

### Dry-Run zur Vorschau

```bash
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --dry-run
```

Führt Recherche aus, persistiert aber nichts. Nützlich zur Bewertung des Umfangs einer Erweiterung vor der Festlegung.

## Unterschiede zwischen Erweitern und Erkunden

| Aspekt | Erkunden (`new-idea`) | Erweitern (`expand-series`) |
|--------|----------------------|--------------------------|
| Ausgangspunkt | Inhaltsidee von Grund auf | Bestehende Serie |
| Seed-Keywords | LLM-generiert + benutzerbereitgestellt | Serien-Keywords + benutzerbereitgestellt |
| Serienausgabe | Erstellt neue Serien-Cluster | Plant Artikel für eine bestehende Serie |
| Clusterbildung | Gruppiert Kandidaten in neue Serien | Verwendet die Struktur der Zielserie |
| Abdeckungsprüfung | Vollständige Deduplizierung gegen bestehende Inhalte | Deduplizierung innerhalb des Serienumfangs |
| Warteschlangeneinträge | Artikel unter neuen Serien eingereiht | Artikel unter bestehender Serie eingereiht |

## Pipeline-Stufen

Der Erweiterungsmodus überspringt das Clustering (da Sie eine bekannte Serie erweitern) und führt aus:

1. **Hydratisieren** — Publikation, Serien, Ausgabehistorie und GKP-Cache laden
2. **Seeds** — Keywords aus der Zielserie extrahieren; Seed-Keywords anwenden
3. **Recherche** — Iterative GKP-Abfragen
4. **Bewertung** — KOB-Bewertung, Intent-Klassifizierung, Kandidatenfilterung
5. **Artikel planen** — Neue Artikel für die bestehende Serie planen
6. **Persistieren** — Serien-Keywords aktualisieren und neue Artikel einreihen

## Interaktiver Ablauf

Wenn `--non-interactive` nicht gesetzt und `--auto-save` nicht aktiviert ist:

1. **Serienauswahl** (falls `series-slug` nicht angegeben wurde) — Aus verfügbaren Serien wählen
2. **Planüberprüfung** — Artikeldetails mit Keyword, Intent und Format
3. **Genehmigungstor** — Plan bestätigen oder ablehnen

## Exit-Codes

| Code | Bedeutung |
|------|---------|
| `0` | Plan erfolgreich abgeschlossen |
| `1` | Pipeline fehlgeschlagen (API-Fehler, fehlende Anmeldeinformationen, Serie nicht gefunden) |
| `2` | Keine Ergebnisse gefunden |

## Ausgabeformat (nicht-interaktiv)

Wenn `--non-interactive` gesetzt ist, zeigt die Ausgabe:

```
# Plan: expand
Mode: expand-series
Publication: tech-blog
Series: AI Deep Dives

## Research
Rounds: 2
Candidates evaluated: 45
Candidates passed: 18
Cache hits: 28
API calls: 5

## Articles

### Article: Wie Transformer-Modelle NLP revolutionierten
Primary keyword: Transformer-Modelle erklärt
Secondary keywords: Aufmerksamkeitsmechanismus, Self-Attention-Tutorial
Intent: informational
Funnel: top
Format: tutorial
Priority: high
Type: new

### Article: Transformers vs RNNs: Ein praktischer Vergleich
Primary keyword: Transformers vs RNNs
Secondary keywords: Sequenzielle Modellvergleiche, LSTM-Alternativen
Intent: commercial
Funnel: middle
Format: comparison
Priority: medium
Type: new
```

## Verwandte Befehle

- [`ideon plan explore`](./ideon-plan-explore.md) — Eine neue Inhaltsidee recherchieren
- [`ideon series add`](./ideon-series.md) — Eine Serie manuell erstellen
- [`ideon gkp ideas`](./ideon-gkp.md) — GKP-Keyword-Ideen generieren
- [`ideon queue add`](./ideon-queue-add.md) — Einen Artikel zur Warteschlange hinzufügen
