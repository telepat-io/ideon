---
sidebar_position: 3
title: Schnellstart
description: Schnellstartdokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Schnellstart

Diese Anleitung bringt Sie von null zu Ihrem ersten Multi-Ausgaben-Inhaltsschreib-Lauf.

Am Ende haben Sie einen veröffentlichungsfertigen Inhaltsatz, generierte Ressourcen und einen Vorschau-Workflow, an dem Sie iterieren können.

## 1. Einstellungen und Geheimnisse konfigurieren

```bash
ideon settings
```

Konfigurieren Sie innerhalb der Einstellungen:

- LLM-Modell und Modelleinstellungen
- T2I-Modell und optionale Eingabeüberschreibungen
- Ausgabeverzeichnisse
- OpenRouter API-Schlüssel
- Replicate API-Token

## 2. Inhaltsausgaben generieren

```bash
ideon write "How small editorial teams can productionize AI writing" --primary article=1 --secondary x-thread=1 --secondary x-post=1 --style professional
```

Erwartete Stufen:

1. Planung Shared Plan
2. Planung Primary Content
3. Schreiben Primary Content
4. Erweitern von Bildprompts
5. Rendern von Bildern
6. Generieren von Kanalinhalten
7. Anreichern von Links

Langform-Primäre (`article`, `blog-post`, `newsletter`, `press-release`, `science-paper`) verwenden strukturiertes absatzbasiertes Schreiben in Stufe 3. Kurzform-Primäre (`x-post`, `x-thread`, `linkedin-post`, `reddit-post`) verwenden einmalige Generierung in Stufe 3. Alle Primären rendern ein Coverbild.

## 3. Ausgaben überprüfen

Standardmäßig (aufgelöst vom aktuellen Arbeitsverzeichnis):

- Generierungsverzeichnisse: `output/<timestamp>-<slug>/`
- Markdown-Dateien: `article-1.md`, `x-thread-1.md`, `x-post-1.md`, ...
- Laufmetadaten: `job.json`
- Artikelplan: `plan.md`
- Inhaltsmetadaten: `meta.json`
- Laufanalyse: `generation.analytics.json`
- Gemeinsame Generierungsressourcen: Bilddateien im selben Generierungsverzeichnis

Typischer erster Lauf-Wert:

- Eine Idee, erweitert zu mehreren kanalfertigen Entwürfen
- Ein einheitlicher Stil, angewendet auf alle Ausgaben
- Strukturierte Lauf-Artefakte, die Sie in späteren Iterationen wiederverwenden können

Sie können die neueste Generierung in der Browser-Vorschau öffnen:

```bash
ideon preview
```

Die Vorschau umfasst Generierungs-Ebenen-Browsing, Inhaltsregisterkarten und Varianten-Unterregisterkarten.

## 4. Sicheren Trockenlauf ausführen

```bash
ideon write --dry-run "How AI changes developer docs workflows"
```

Troecknläufe behalten den vollen Pipeline-Fluss bei, überspringen aber OpenRouter- und Replicate-API-Aufrufe und produzieren dennoch Generierungsartefakte.

## 5. Mit einer Job-Datei ausführen

```bash
ideon write --job ./job.json
```

Siehe [Job-Dateien](../guides/job-files.md) für das vollständige Schema und Beispiele.

## Nächste Schritte

- Siehe [Pipeline-Stufen](../guides/pipeline-stages.md) für Fortsetzungs- und Checkpoint-Verhalten.
- Siehe [Lokale Vorschau](../guides/local-preview.md) für Generierungs-Detailanzeige.
- Siehe [Fehlerbehebung](../guides/troubleshooting.md) für Wiederherstellungspfade.