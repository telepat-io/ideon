---
title: Leistung und Kosten
description: Leistung und Kosten Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Leistung und Kosten

Verwenden Sie diesen Leitfaden, um Ausgabequalität, Laufzeit und Anbieterausgaben auszubalancieren.

## Was die Kosten beeinflusst

Haupttreiber:

- Anzahl der angeforderten Ausgaben (`contentTargets`-Zählungen)
- Modellauswahl für Text- und Bildgenerierung
- Wiederholungen, die durch vorübergehende Anbieterfehler verursacht werden
- Höhere Token-Budgets (`maxTokens`) für lange Ausgaben

Sie können pro-Lauf-Summen in `generation.analytics.json` inspizieren.

## Was die Laufzeit beeinflusst

Haupttreiber:

- Gesamtausgabeanzahl und Mischung der Inhaltstypen
- Primärer Inhaltstyp (`article`-Primär verwendet strukturierten Fluss; Nicht-Artikel-Primär verwendet allgemeinen Fluss)
- Bildmodellgeschwindigkeit und Wiederholungsverhalten
- Netzwerklatenz und Anbieter-Backoff-Fenster

Artikelprimäre Läufe führen strukturierte Artikelstufen aus; Nicht-Artikelprimäre Läufe führen allgemeine primäre Stufen aus und rendern dennoch ein primäres Coverbild.

## Kostenkontrollmuster

1. Zuerst mit Trockenlauf validieren:

```bash
ideon write --dry-run "Your idea" --primary article=1 --secondary x-thread=1 --secondary x-post=1
```

2. Mit weniger Varianten beginnen und dann skalieren:

```bash
ideon write "Your idea" --primary article=1 --secondary x-post=1
```

3. Verwenden Sie Job-Dateien für wiederholbare Experimente und passen Sie nur eine Variable gleichzeitig an.

4. Bevorzugen Sie schnellere Modelle während der Exploration und wechseln Sie dann zu qualitätsorientierten Modellen für finale Läufe.

## Laufzeitkontrollmuster

1. Halten Sie `contentTargets` in frühen Iterationen eng.
2. Verwenden Sie `x-thread` nur, wenn die Thread-Struktur wirklich benötigt wird.
3. Setzen Sie unterbrochene Läufe fort, statt neu zu beginnen:

```bash
ideon write resume
```

4. Wenn ein Lauf wiederholt bei einer Stufe fehlschlägt, diagnostizieren Sie mit [Fehlerbehebung](./troubleshooting.md), bevor Sie Zielanzahlen erhöhen.

## Praktischer Workflow

1. Trockenlauf ausführen und Orchestrierung und Ausgaben bestätigen.
2. Niedrige-Anzahl Live-Generierung ausführen.
3. Markdown-Qualität und `generation.analytics.json` inspizieren.
4. Zählungen erhöhen oder Modelle wechseln.
5. Die aufgelöste `job.json` für reproduzierbare zukünftige Läufe speichern.

## Verwandte Leitfäden

- [Konfiguration](./configuration.md)
- [Job-Dateien](./job-files.md)
- [Pipeline-Stufen](./pipeline-stages.md)
- [T2I-Modelle](../reference/t2i-models.md)