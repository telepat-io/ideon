---
title: Inhaltsplanung
description: Planen Sie Inhaltsserien und Artikel mit Google Keyword Planner-gestützter Recherche, Themen-Clustering und interaktiver Überprüfung in Ideon.
keywords: [ideon, Inhaltsplanung, Keyword-Recherche, Themen-Clustering, Serienplanung, SEO-Strategie]
---

# Inhaltsplanung

Die Inhaltsplanungsfunktion von Ideon verwandelt Ihre Themenideen in datengestützte, veröffentlichungsbereite Inhaltsstrategien. Statt zu raten, was Sie schreiben sollen, erhalten Sie Keyword-validierte Serien- und Artikelvorschläge, die über eine interaktive Terminal-UI geprüft werden — alles gestützt durch echte Google Ads Keyword Planner-Daten.

## Überblick

Die Inhaltsplanung hat zwei Modi, die über den Befehl `ideon plan` aufgerufen werden:

| Modus | Befehl | Wann zu verwenden |
|------|---------|-------------|
| **Erkunden** | `ideon plan explore` | Eine neue Inhaltsidee recherchieren und neue Serien- und Artikelpläne generieren |
| **Erweitern** | `ideon plan expand` | Neue Artikelideen zu einer bestehenden Serie hinzufügen |

Beide Modi benötigen eine Publikation, Google Ads-Anmeldeinformationen und einen OpenRouter API-Schlüssel. Das Ergebnis sind Serienvorschläge und Artikelideen, die Sie überprüfen und genehmigen, bevor sie in Ihrer Warteschlange gespeichert werden.

## Schnelles Beispiel

```bash
# Ein neues Thema erkunden
ideon plan explore "Content-Strategie für B2B SaaS" \
  --publication tech-blog \
  --series-count 3 \
  --articles-per-series 5 \
  --context "Wir helfen jungen B2B SaaS-Unternehmen, Content-Engines aufzubauen"

# Eine bestehende Serie erweitern
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --article-count 6
```

## Wie es funktioniert

Ideon führt eine siebenstufige Planungspipeline aus:

### Stufe 1: Hydratisieren (Hydrate)

Lädt Ihre Publikations-, Serien- und Ausgabehistorie, um eine **Abdeckungskarte** zu erstellen — ein Bild jedes Keywords, das Sie bereits abgedeckt haben, und wie alt jeder Artikel ist. Dies verhindert doppelte Vorschläge und zeigt Aktualisierungskandidaten an.

### Stufe 2: Seeds

Generiert Seed-Keywords aus Ihrer Inhaltsidee. Im Erkundungsmodus schlägt das LLM Keyword-Themen mit Begründungen vor; vom Benutzer bereitgestellte Seed-Keywords werden immer einbezogen. Im Erweiterungsmodus dienen die vorhandenen Keywords der Zielserie als Recherche-Seeds.

### Stufe 3: Recherche (Research)

Iterative Abfragen des Google Keyword Planners (GKP). Jede Runde:
- Fragt neue Seed-Keywords beim GKP an
- Speichert Ergebnisse im Cache und verwendet aktuelle Snapshots wieder
- Verfolgt Suchvolumen, Wettbewerb und CPC-Daten der Kandidaten
- Erweitert Keywords, wenn die Erträge abnehmen
- Wechselt in den Low-Volume-Modus bei geringem Suchvolumen

### Stufe 4: Bewertung (Score)

Bewertet und filtert jeden Kandidaten-Keyword mit dem **KOB-Score** (Keyword Opportunity Benchmark), der gewichtet:
- Suchvolumen
- CPC-Signal (hohe Gebote deuten auf kommerzielle Absicht hin)
- Wettbewerbsniveau
- Intent-Klassifizierung (informational, commercial, transactional)

Kandidaten unter der Bewertungsschwelle werden mit Begründungen verworfen.

### Stufe 5: Clustering (Cluster)

Gruppiert ausgewählte Keywords in thematische **Serien**. Jeder Cluster erhält:
- Ein Pillar-Keyword
- Unterstützende Keyword-Liste
- Funnel-Stufe (top, middle, bottom)
- Begründung und Hinweise zur Abdeckungslücke

Cluster vermeiden bestehende Serien, die zum Ausschluss markiert sind.

### Stufe 6: Artikel planen (Plan Articles)

Plant für jeden Serien-Cluster einzelne Artikel mit:
- Titel und Inhaltswinkel
- Primäre und sekundäre Keywords
- Intent-Typ (informational, commercial, transactional)
- Format (guide, listicle, comparison, case-study, tutorial, opinion)
- Priorität (high, medium, low)
- Vertrauenshinweise

### Stufe 7: Persistieren (Persist)

Nach Ihrer Genehmigung wird der Plan gespeichert:
- Neue Serien werden erstellt
- Bestehende Serien-Keywords werden aktualisiert
- Artikelideen werden als `ideon queue`-Einträge eingereiht
- Ein Planungssitzungsprotokoll wird geschrieben

## Interaktiver Überprüfungsablauf

Im interaktiven Modus (Standard) präsentiert Ideon nach Abschluss der Pipeline eine Terminal-UI-Überprüfung:

1. **Zusammenfassungsansicht** — Serienanzahl, Artikelanzahl, Recherchestatistiken
2. **Serienüberprüfung** — Navigieren und erweitern Sie jede Serie, um Pillar-Keywords und Artikellisten zu sehen
3. **Artikelüberprüfung** — Durchsuchen Sie einzelne Artikel mit Keyword-, Intent- und Formatdetails
4. **Genehmigungstor** — Bestätigen oder ablehnen Sie den gesamten Plan

Verwenden Sie die Pfeiltasten zur Navigation, Enter zum Erweitern/Reduzieren von Serien und `Y`/`N` zum Bestätigen.

## Nicht-interaktiver Modus

Für CI, Automatisierung und Agent-Workflows verwenden Sie `--non-interactive`, um die TUI vollständig zu überspringen und die Planausgabe nach stdout zu schreiben:

```bash
ideon plan explore "Content-Strategie für SaaS" \
  --publication tech-blog \
  --non-interactive \
  --auto-save
```

| Flag | Wirkung |
|------|--------|
| `--non-interactive` | Überspringt TUI; schreibt Plan als Klartext nach stdout |
| `--auto-save` | Umgeht Genehmigungstore; persistiert Plan sofort |
| `--dry-run` | Führt Recherche aus, schreibt aber nichts auf die Festplatte |

## Abdeckungskarte und Deduplizierung

Vor dem Vorschlag eines Keywords prüft Ideon Ihre **Abdeckungskarte** — eine Aufzeichnung jedes Keywords, das Sie unter der aktuellen Publikation veröffentlicht haben. Bereits abgedeckte Keywords werden angezeigt mit:
- Dem bestehenden Artikeltitel
- Wie alt der Artikel in Monaten ist
- Einem **Aktualisierungskandidat**-Flag, wenn älter als 6 Monate

Dies stellt sicher, dass Ihr Plan niemals vorschlägt, dasselbe Thema zweimal zu schreiben, und hilft Ihnen, Inhalte zu erkennen, die aktualisiert werden müssen.

## KOB-Bewertung und Intent-Klassifizierung

Der **Keyword Opportunity Benchmark (KOB)**-Score kombiniert:

| Faktor | Gewicht | Quelle |
|--------|--------|--------|
| Monatliches Suchvolumen | Hoch | GKP-Verlaufsdaten |
| CPC-Signal | Mittel | Hohes Top-of-Page-Gebot |
| Wettbewerbsniveau | Mittel | GKP-Wettbewerbsindex |
| Intent-Klarheit | Niedrig | LLM-Klassifizierung |

**Intent-Klassifizierung** verwendet einen separaten LLM-Aufruf, um jedes Keyword als informational, commercial oder transactional mit einem Vertrauensscore von 1–5 zu klassifizieren. Dies fließt in die Funnel-Stufenzuweisung während des Clusterings ein.

## Low-Volume-Modus

Wenn die Recherche verfügbare Keywords in einem Thema mit geringem Suchvolumen erschöpft, wechselt Ideon in den **Low-Volume-Modus**. Dies lockert die Bewertungsschwellen, sodass Sie dennoch nützliche Pläne anstelle von leeren Ergebnissen erhalten. Die Ausgabe kennzeichnet diesen Zustand, damit Sie wissen, dass das Thema begrenzte Nachfragesignale hat.

Wenn keine Kandidaten selbst im Low-Volume-Modus bestehen, erscheint ein **Pivot-Vorschläge**-Abschnitt mit alternativen Blickwinkeln.

## Arbeiten mit Publikationen und Serien

Die Inhaltsplanung ist tief in das Publikations- und Seriensystem von Ideon integriert:

```bash
# Zuerst eine Publikation erstellen
ideon publication add "Tech Blog" --style technical --intent tutorial

# Eine Serie manuell erstellen (optional — Pläne erstellen Serien automatisch)
ideon series add "AI Deep Dives" --topic "Erforschung von KI-Technologien" --publication tech-blog

# Planung für Ihre Publikation
ideon plan explore "Machine Learning Trends" --publication tech-blog

# Vermeiden Sie die Duplizierung einer bestehenden Serie
ideon plan explore "ML Trends" \
  --publication tech-blog \
  --exclude-series ai-deep-dives
```

Publikationsstandardeinstellungen (Stil, Intent, Land, Sprache) fließen in die Planungspipeline ein. Ländercodes und Sprache werden an jede GKP-Abfrage übergeben, sodass Volumendaten marktspezifisch sind.

## CLI-Referenz

Vollständige Befehlsdetails auf einzelnen Seiten:

- [`ideon plan explore`](../reference/commands/ideon-plan-explore.md) — Eine neue Idee recherchieren
- [`ideon plan expand`](../reference/commands/ideon-plan-expand.md) — Eine bestehende Serie erweitern

## Agent- und Automatisierungs-Workflows

Die Inhaltsplanung unterstützt dieselbe Automatisierungsoberfläche wie das Schreiben:

- **Nicht-interaktiver Modus** — `ideon plan explore ... --non-interactive --auto-save`
- **Exit-Codes** — 0 bei Erfolg, 1 bei Fehler, 2 bei keinen Ergebnissen
- **MCP-Integration** — Planung ist mit dem MCP-Server (`ideon mcp serve`) für agent-orchestrierte Workflows kompatibel
- **Skill-Pakete** — Das `ideon-plan` Skill-Paket bietet Anleitung auf Agent-Ebene für Planungs-Workflows

## Verwandte Dokumentation

- [Google Keyword Planner Integration](./google-ads-keyword-planner.md)
- [Konfiguration](./configuration.md)
- [Pipeline-Stufen](./pipeline-stages.md)
- [Job-Dateien](./job-files.md)
- [Ausgabestruktur](./output-structure.md)
