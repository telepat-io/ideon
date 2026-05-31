---
title: Job-Dateien
description: Job-Dateien Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Job-Dateien

Job-Dateien ermöglichen wiederholbare und teilbare Generierungsläufe über einen oder mehrere Inhaltstypen hinweg.

## Minimales Beispiel

```json
{
  "idea": "How content teams can scale AI-assisted writing"
}
```

Ausführen:

```bash
ideon write --job ./job.json
```

## Erweitertes Beispiel

```json
{
  "idea": "How editorial teams can ship weekly explainers",
  "targetAudience": "Content leads at small SaaS teams building repeatable thought-leadership motions",
  "settings": {
    "model": "deepseek/deepseek-v4-pro",
    "modelSettings": {
      "temperature": 0.7,
      "maxTokens": 2500,
      "topP": 0.95
    },
    "modelRequestTimeoutMs": 90000,
    "contentTargets": [
      { "contentType": "article", "role": "primary", "count": 1 },
      { "contentType": "x-thread", "role": "secondary", "count": 2 },
      { "contentType": "x-post", "role": "secondary", "count": 1 },
      { "contentType": "linkedin-post", "role": "secondary", "count": 1 }
    ],
    "style": "friendly",
    "t2i": {
      "modelId": "black-forest-labs/flux-schnell",
      "inputOverrides": {
        "output_format": "png"
      }
    },
    "markdownOutputDir": "/output",
    "assetOutputDir": "/output/assets"
  }
}
```

## Hinweise

- `settings.contentTargets` muss genau ein primäres Ziel und optionale sekundäre Ziele enthalten.
- Wenn `settings.style` weggelassen wird, verwendet Ideon standardmäßig `professional`.
- Wenn `targetAudience` weggelassen wird, initialisiert Ideon die Shared-Plan-Planung mit einem allgemeinen, nicht spezifischen Publikum.
- CLI-Argumente überschreiben Job-Datei-Einstellungen für `idea`, `targetAudience`, `style` und `contentTargets`.
- Umgebungsvariablen überschreiben passende Job-Datei-Felder, wo unterstützt.
- Nach jedem Lauf schreibt Ideon eine generierte `job.json` innerhalb des Generierungsverzeichnisses, die die aufgelöste Laufdefinition und Metadaten für diese spezifische Ausführung erfasst.

## Überschreibungsmatrix

Höchste bis niedrigste Priorität:

1. CLI-Flags und direkte Ideeneingabe
2. Umgebungsvariablen (`IDEON_*`)
3. Job-Datei `settings`
4. Gespeicherte Einstellungen
5. Schema-Standardwerte

Praktische Beispiele:

- `ideon write --job ./job.json --style technical` erzwingt den technischen Stil, auch wenn die Job-Datei etwas anderes sagt.
- `ideon write --job ./job.json --audience "Procurement leaders evaluating AI ops tooling"` überschreibt `job.targetAudience` für diesen Lauf.
- `IDEON_MODEL=... ideon write --job ./job.json` verwendet das Umgebungsmodell statt des Job-Modells.
- `--primary` mit optionalem `--secondary` ersetzt das vollständige Job `settings.contentTargets`-Array für diesen Lauf.

## Wiederverwendung generierter Job-Definitionen

Jedes Generierungsverzeichnis enthält eine aufgelöste `job.json`. Sie können diese Datei kopieren, nur das Anpassen, was Sie benötigen (z.B. Modell, Stil oder Ziele), und sie erneut ausführen:

```bash
ideon write --job ./output/20260327-your-slug/job.json
```

Dies ist der einfachste Weg, vorherige Läufe mit minimaler Abweichung zu reproduzieren oder zu verzweigen.

## Idee-Auflösungsregel

Ideen-Auswahlreihenfolge:

1. Direkte CLI-Idee-Argument
2. `job.idea`
3. `job.prompt`

Wenn keine vorhanden sind, wirft Ideon einen benutzerseitigen Fehler.