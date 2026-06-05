---
title: ideon plan explore
description: Recherchieren Sie eine neue Inhaltsidee und generieren Sie Keyword-gestützte Serien- und Artikelpläne.
keywords: [ideon, plan, explore, Inhaltsplanung, Keyword-Recherche, Themen-Clustering]
---

# ideon plan explore

Recherchieren Sie eine neue Inhaltsidee mit Google Keyword Planner-Daten und generieren Sie Serien- und Artikelvorschläge. Der Plan wird in einem interaktiven Überprüfungsablauf präsentiert, bevor er in Ihrer Warteschlange gespeichert wird.

## Syntax

```bash
ideon plan explore [idea] [Optionen]
```

## Argumente

| Argument | Beschreibung | Erforderlich |
|----------|-------------|----------|
| `idea` | Zu recherchierende Inhaltsidee | Nein (kann interaktiv eingegeben werden) |

Wenn `idea` weggelassen und nicht über `--non-interactive` bereitgestellt wird, fordert Ideon interaktiv zur Eingabe auf.

## Optionen

| Option | Alias | Beschreibung | Standard |
|--------|-------|-------------|---------|
| `--publication` | `-p` | Publikations-Slug | **Erforderlich** |
| `--context` | | Geschäftskontext oder ICP-Beschreibung | — |
| `--country` | | Kommagetrennte ISO-Ländercodes | Publikationsstandard oder `US` |
| `--language` | | ISO 639-1 Sprachcode | Publikationsstandard oder `en` |
| `--series-count` | | Zielanzahl der Serien | `3` |
| `--articles-per-series` | | Zielartikel pro Serie | `5` |
| `--seed-keywords` | | Kommagetrennte Seed-Keywords, die immer enthalten sein sollen | — |
| `--exclude-series` | | Kommagetrennte Serien-Slugs, die nicht dupliziert werden sollen | — |
| `--content-type` | | Inhaltstyp für Warteschlangeneinträge | `article` |
| `--model` | | Modell für starke Reasoning-Aufrufe | `deepseek/deepseek-v4-pro` |
| `--intent-model` | | Modell für Intent-Klassifizierung | `deepseek/deepseek-v4-flash` |
| `--auto-save` | | Genehmigungstore überspringen und automatisch speichern | `false` |
| `--non-interactive` | | Agent-Modus: Klartextausgabe nach stdout | `false` |
| `--dry-run` | | Recherche ausführen, aber alle Schreibvorgänge überspringen | `false` |

## Beispiele

### Einfache Erkundung

```bash
ideon plan explore "Content-Strategie für B2B SaaS" --publication tech-blog
```

Dies öffnet eine interaktive Eingabeaufforderung für fehlende erforderliche Eingaben, führt alle sieben Planungsstufen aus und präsentiert die Ergebnisse in der Überprüfungs-TUI.

### Mit Geschäftskontext und Seed-Keywords

```bash
ideon plan explore "Cloud-Kostenoptimierung" \
  --publication tech-blog \
  --context "Wir zielen auf Engineering-Leiter in Unternehmen mit monatlichen Cloud-Ausgaben von über $50k" \
  --seed-keywords "FinOps,AWS-Kosteneinsparungen,Cloud-Verschwendungsreduzierung" \
  --series-count 4 \
  --articles-per-series 6
```

### Nicht-interaktiver Agent-Modus

```bash
ideon plan explore "DevOps-Automatisierungstrends" \
  --publication tech-blog \
  --non-interactive \
  --auto-save \
  --context "Unser ICP: Platform-Engineering-Teams in mittelständischen Unternehmen"
```

Ausgabe geht nach stdout. Der Plan wird automatisch persistiert. Exit-Code 2, wenn keine Ergebnisse gefunden werden.

### Bestehende Serien vermeiden

```bash
ideon plan explore "Kubernetes Best Practices" \
  --publication tech-blog \
  --exclude-series kubernetes-101,k8s-security
```

Ausgeschlossene Serien und ihre Keywords werden von der Clusterbildung ausgeschlossen.

### Dry-Run zur Vorschau ohne Speichern

```bash
ideon plan explore "KI im Gesundheitswesen" \
  --publication health-tech \
  --dry-run
```

Alle Recherchen werden normal ausgeführt, aber nichts wird persistiert — keine Serien erstellt, keine Warteschlangeneinträge hinzugefügt. Nützlich zur Validierung von Ideen vor der Festlegung.

### Mit benutzerdefinierten Modellen

```bash
ideon plan explore "Growth-Marketing-Strategien" \
  --publication growth-blog \
  --model anthropic/claude-opus-4 \
  --intent-model openai/gpt-4.1-mini
```

Verwendet ein starkes Modell für die Planungs-LLM-Aufrufe und ein schnelleres/günstigeres Modell für die Intent-Klassifizierung.

## Pipeline-Stufen

Der Erkundungsmodus führt diese sieben Stufen nacheinander aus:

1. **Hydratisieren** — Publikation, Serien, Ausgabehistorie und GKP-Cache laden
2. **Seeds** — Seed-Keywords aus der Inhaltsidee generieren
3. **Recherche** — Iterative GKP-Abfragen mit Erweiterung und Low-Volume-Erkennung
4. **Bewertung** — KOB-Bewertung, Intent-Klassifizierung und Kandidatenfilterung
5. **Clustering** — Ausgewählte Keywords in thematische Serien gruppieren
6. **Artikel planen** — Einzelne Artikel pro Serie planen
7. **Persistieren** — Serien speichern, Keywords aktualisieren und Artikel einreihen

## Interaktiver Ablauf

Wenn `--non-interactive` nicht gesetzt und `--auto-save` nicht aktiviert ist:

1. **Eingabeaufforderung** (falls `idea` nicht angegeben wurde) — Geben Sie Ihre Inhaltsidee ein
2. **Planüberprüfung** — Serienzusammenfassung, Serien navigieren, Artikel überprüfen
3. **Genehmigungstor** — Plan bestätigen oder ablehnen

Drücken Sie `Ctrl+C` jederzeit, um ohne Speichern abzubrechen.

## Exit-Codes

| Code | Bedeutung |
|------|---------|
| `0` | Plan erfolgreich abgeschlossen |
| `1` | Pipeline fehlgeschlagen (API-Fehler, fehlende Anmeldeinformationen, etc.) |
| `2` | Keine Ergebnisse gefunden (Thema erschöpft, geringe Nachfrage) |

## Ausgabeformat (nicht-interaktiv)

Wenn `--non-interactive` gesetzt ist, ist die Ausgabe Klartext im folgenden Format:

```
# Plan: explore
Mode: new-idea
Publication: tech-blog
Series: KI-Strategie

## Research
Rounds: 3
Candidates evaluated: 87
Candidates passed: 23
Cache hits: 42
API calls: 9

## Series: KI-Strategie
Pillar keyword: Enterprise-KI-Strategie
Funnel: top
Rationale: Grundlegender Keyword-Cluster mit starker informationaler Absicht
Coverage gap: Kein bestehender Inhalt in diesem Cluster

### Article: Wie man eine Enterprise-KI-Strategie aufbaut
Primary keyword: Enterprise-KI-Strategie
Secondary keywords: KI-Einführungsframework, Enterprise-KI-Roadmap
Intent: informational
Funnel: top
Format: guide
Priority: high
Pillar: yes
Type: new

ideon queue add "Wie man eine Enterprise-KI-Strategie aufbaut" --publication tech-blog --series ai-strategy --keywords "Enterprise-KI-Strategie, KI-Einführungsframework, Enterprise-KI-Roadmap" --intent guide --type article
```

Wenn keine Ergebnisse gefunden werden, zeigt die Ausgabe:

```
# Plan: explore
Mode: new-idea
Publication: tech-blog

## No Results
Candidates found: 12
Status: exhausted

Keine ausreichenden Nachfragesignale für dieses Thema gefunden.

## Pivot Suggestions
- Versuchen Sie breitere Seed-Keywords
- Grenzen Sie Ihren Zielmarkt ein
- Prüfen Sie, ob bestehender Inhalt dieses Thema bereits abdeckt
```

## Verwandte Befehle

- [`ideon plan expand`](./ideon-plan-expand.md) — Eine bestehende Serie erweitern
- [`ideon gkp ideas`](./ideon-gkp.md) — GKP-Keyword-Ideen generieren
- [`ideon series add`](./ideon-series.md) — Eine Serie manuell erstellen
- [`ideon queue add`](./ideon-queue-add.md) — Einen Artikel zur Warteschlange hinzufügen
