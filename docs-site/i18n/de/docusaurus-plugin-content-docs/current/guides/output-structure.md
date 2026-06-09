---
title: Ausgabestruktur
description: Ausgabestruktur Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Ausgabestruktur

Ideon schreibt ein Generierungsverzeichnis pro Lauf. Jedes Generierungsverzeichnis enthält eine oder mehrere Markdown-Ausgaben, eine Laufdefinitions-`job.json`, ein laufebenes Analyseartefakt, ein laufebenes Modellinteraktionsartefakt, eine strukturierte Metadaten-Sidecar (`meta.json`) und gemeinsame Bildressourcen.

Ideon speichert auch lokale Schreibsitzungs-Artefakte in `.ideon/write/` (gitignoriert) zur Fortsetzungsunterstützung.

## Standardpfade

- Markdown-Verzeichnis: `/output`
- Ressourcen-Verzeichnis: `/output/assets`
- Analyse-Datei: `generation.analytics.json` innerhalb jedes Generierungsverzeichnisses
- Modellinteraktions-Datei: `model.interactions.json` innerhalb jedes Generierungsverzeichnisses
- Metadaten-Sidecar: `meta.json` innerhalb jedes Generierungsverzeichnisses
- Artikelplan-Datei: `plan.md` innerhalb jedes Generierungsverzeichnisses (für artikelprimäre Läufe)

Pfade, die mit `/output` beginnen, werden relativ zum aktuellen Arbeitsverzeichnis aufgelöst.

## Generierungsverzeichnis-Layout

Beispiel:

```text
output/
  20260327-practical-ai-workflows/
    article-1.md
    x-thread-1.md
    x-post-1.md
    linkedin-1.md
    job.json
    plan.md
    meta.json
    generation.analytics.json
    model.interactions.json
    practical-ai-workflows-cover.webp
    practical-ai-workflows-inline-1.webp
```

Markdown-Dateien werden nach Inhaltstyp-Präfix nummeriert:

- `article-1.md`
- `blog-1.md`
- `x-thread-1.md`
- `x-post-1.md`
- `reddit-1.md`
- `linkedin-1.md`
- `newsletter-1.md`
- `landing-1.md`

## Artikel-Markdown-Inhalte

Generiertes Markdown enthält:

- YAML-Frontmatter:
  - `title`
  - `subtitle`
  - `slug`
  - `description`
  - `keywords`
- H1-Titel und Untertitelzeile
- Coverbild-Einbettung (wenn vorhanden)
- Einleitungskörper
- Absatzkörper (H2-Überschriften)
- Inline-Bild-Einbettungen, an Absatzpositionen verankert
- Schlussfolgerungsabsatz
- Optionaler FAQ-Abschnitt (`## FAQ`), wenn FAQ-Generierung für den Lauf aktiviert ist

FAQ-Einträge verwenden `###`-Frageüberschriften mit ein- bis zweisätzigen Direktantworten. Der FAQ-Block erscheint nach `## Conclusion` und nur, wenn die Pipeline FAQ-Inhalt erzeugt hat.

## Slug-Verhalten

Artikel-Slugs werden während der Planung normalisiert. Generierungsverzeichnisnamen sind zeitgestempelt und eindeutig pro Lauf.

## Ressourcen-Links

Markdown-Einbettingen verwendenrelative Pfade von der Markdown-Dateiposition zu den Ressourcendateien.

## Analyse-Artefakt

Jeder Generierungslauf gibt `generation.analytics.json` innerhalb des Generierungsverzeichnisses aus.

Das JSON enthält:

- Laufzusammenfassung: Gesamtdauer, Gesamt-Wiederholungen und Gesamtkosten (wenn verfügbar)
- Stufenmetriken: pro-Stufen-Dauer, Wiederholungen und stufenbezogene Kosten
- Bildprompt-Aufrufe: pro-Bild-Prompt-Erweiterungs-Zeitmessung/Kosten + Token-Verbrauch (wenn verfügbar)
- Bildrender-Aufrufe: pro-Bild-Render-Zeitmessung/Kosten + Ausgabe-Byte-Größe
- SEO-Check-Aufrufe: pro Editor-Agenten-Schleifen-Runde mit Betriebs-ID (`seo-check:editor-agent:turn-N`), Zeitmessung/Kosten, Token-Verbrauch und auf dieser Runde angeforderten Werkzeugnamen

Um generiertes Markdown und Bild-Einbettingen im Browser zu inspizieren, führen Sie `ideon preview` aus.

## Modellinteraktions-Artefakt

Jeder Generierungslauf gibt auch `model.interactions.json` innerhalb des Generierungsverzeichnisses aus.

Das JSON enthält:

- Laufhülle: `runId`, `runMode`, `dryRun`, `startedAt`, `endedAt`
- `llmCalls`: ein Datensatz pro OpenRouter-Versuch mit Stufen/Betriebs-IDs, Anfragetyp, rohem serialisierten Anfrage-Body, rohem Antwort-Body, Zeitmessung, Versuche/Wiederholungen und Endstatus
- `editorToolCalls`: ein Datensatz pro lokaler SEO-Editor-Werkzeugausführung mit Rundenindex, Werkzeugname, Argumenten, JSON-Ergebnis und Zeitmessung (keine LLM-Kosten)
- `t2iCalls`: ein Datensatz pro Bildrender-Versuch mit Stufen/Betriebs-IDs, rohem Prompt, aufgelöstem T2I-Eingabe-Payload, Zeitmessung, Wiederholungen und Endstatus

Dieses Artefakt ist für Prompt-Engineering und Fehleranalyse gedacht, daher bleiben Payloads absichtlich roh.

## Job-definitions-Artefakt

Jeder Lauf gibt auch `job.json` im Generierungsverzeichnis aus. Es erfasst die aufgelöste Laufdefinition:

- `idea` und `prompt`, die für den Lauf verwendet wurden
- optionales `targetAudience`-Seed, wenn bereitgestellt (oder wenn von einer Job-Datei geerbt)
- aufgelöste `contentTargets` und `style`
- vollständiges aufgelöstes `settings`-Objekt (einschließlich aktueller und zukünftiger Einstellungsfelder)
- Quell-Job-Payload, wenn bereitgestellt (`sourceJob`)
- Laufmetadaten (`generatedAt`, `dryRun`, `runMode`)

Beispielstruktur:

```json
{
  "idea": "How teams can operationalize content systems",
  "prompt": "How teams can operationalize content systems",
  "targetAudience": "Content operators building repeatable publishing systems",
  "settings": {
    "model": "deepseek/deepseek-v4-pro",
    "modelSettings": { "temperature": 0.7, "maxTokens": 4000, "topP": 1 },
    "modelRequestTimeoutMs": 90000,
    "t2i": { "modelId": "black-forest-labs/flux-schnell", "inputOverrides": {} },
    "markdownOutputDir": "/output",
    "assetOutputDir": "/output/assets",
    "contentTargets": [{ "contentType": "article", "role": "primary", "count": 1 }],
    "style": "professional"
  },
  "sourceJob": null,
  "generatedAt": "2026-03-27T10:20:00.000Z",
  "dryRun": false,
  "runMode": "fresh"
}
```

## Metadaten-Sidecar (`meta.json`)

Jeder Generierungslauf gibt eine strukturierte `meta.json`-Sidecar innerhalb des Generierungsverzeichnisses aus. Sie konsolidiert inhaltsbezogene Metadaten in einer einzigen maschinenlesbaren Datei.

Das JSON enthält:

- `version`: Schema-Version (derzeit `1`)
- `title`, `slug`, `idea`, `description`: Kern-Inhaltsmetadaten
- `subtitle`, `keywords`, `angle`: Langform-Artikelmetadaten (nullable when absent)
- `contentType`, `style`, `intent`, `targetLength`: Generierungseinstellungen
- `cover`: Coverbild-Metadaten (`path`, `relativePath`, `description`) oder `null`
- `sections`: Array von Absatztiteln und -beschreibungen (leer für Kurzform-Inhalte)
- `images`: Array aller gerenderten Bilder (Cover und Inline) mit Pfaden, Beschreibungen und Ankerpositionen
- `outputs`: Array aller Markdown-Ausgabedateien mit Inhaltstypen und Pfaden
- `seoCheck` (falls vorhanden): Lint-Ergebnis (`passed` folgt `seoCheckMode`), `seoCheckMode`, `warningsRemaining`, vollständiges `issues[]`, Editor-Rundenzahl und Editor-Pass-Kostenzusammenfassung
- `author` (falls vorhanden): Aufgelöster Autoren-Slug für den Lauf
- `editorialChecklist`: Dynamische Pre-Publish-Checkliste (Byline, KI-Offenlegung, Autorenzuweisung, Platzhalter, Statistikprüfung, Helpful-Content-Selbstbewertung)
- `generatedAt`: ISO-Zeitstempel
- `generationDir`: Absoluter Pfad zum Generierungsverzeichnis

Beispielstruktur:

```json
{
  "version": 1,
  "title": "How teams can operationalize content systems",
  "slug": "operationalize-content-systems",
  "idea": "How teams can operationalize content systems",
  "description": "A practical guide to building repeatable content operations.",
  "subtitle": "From one-off posts to predictable publishing pipelines",
  "keywords": ["content ops", "publishing", "automation"],
  "contentType": "article",
  "style": "professional",
  "intent": "tutorial",
  "targetLength": "medium",
  "angle": "Process-first perspective",
  "cover": {
    "path": "/Users/you/.ideon/output/20260327-slug/cover-1.png",
    "relativePath": "cover-1.png",
    "description": "A clean editorial workspace with content calendars"
  },
  "sections": [
    { "title": "Audit your current workflow", "description": "Map existing steps and bottlenecks." },
    { "title": "Design the pipeline", "description": "Choose tools and handoff points." }
  ],
  "images": [
    {
      "id": "cover",
      "kind": "cover",
      "path": "/Users/you/.ideon/output/20260327-slug/cover-1.png",
      "relativePath": "cover-1.png",
      "description": "A clean editorial workspace with content calendars",
      "anchorAfterSection": null
    },
    {
      "id": "inline-1",
      "kind": "inline",
      "path": "/Users/you/.ideon/output/20260327-slug/inline-1-2.png",
      "relativePath": "inline-1-2.png",
      "description": "Pipeline diagram",
      "anchorAfterSection": 1
    }
  ],
  "outputs": [
    {
      "fileId": "article-1",
      "contentType": "article",
      "path": "/Users/you/.ideon/output/20260327-slug/article-1.md",
      "relativePath": "article-1.md"
    },
    {
      "fileId": "x-post-1",
      "contentType": "x-post",
      "path": "/Users/you/.ideon/output/20260327-slug/x-post-1.md",
      "relativePath": "x-post-1.md"
    }
  ],
  "generatedAt": "2026-03-27T10:20:00.000Z",
  "generationDir": "/Users/you/.ideon/output/20260327-slug"
}
```

`meta.json` wird auch von `ideon export` zusammen mit dem exportierten Markdown und Bildern kopiert.

## Lokale Sitzungsartefakte

- Sitzungszustandsdatei: `~/.ideon/sessions/<project-hash>/state.json` (OS-spezifisches Konfigurationsverzeichnis)
- Enthält gespeicherte Stufen-Ausgaben (Plan, Absatzentwürfe, Bildmetadaten, finales Artefakt-Zusammenfassung)
- Frische Läufe überschreiben vorherige Sitzungsartefakte
- `ideon write resume` verwendet diesen Zustand, um nach Fehlschlägen oder Unterbrechungen fortzufahren
- Sitzungszustand wird im Benutzer-Heim-Konfigurationsverzeichnis gespeichert, nach Projektpfad-Hash verschlüsselt

Verzeichnisbereich-Beispiele:

- Ausführen in `~/project-a` erstellt und setzt den Zustand derselben Sitzung fort, unabhängig vom aktuellen Verzeichnis
- Ausführen in `~/project-b` verwendet eine separate Sitzung, die nach eigenem Projektpfad verschlüsselt ist
- Veraltete `.ideon/write/state.json`-Dateien werden beim ersten Fortsetzen automatisch migriert

Wichtige Zustandsfelder:

- `status`: `running`, `failed` oder `completed`
- `lastCompletedStage`: letzte geprüfte Stufen-ID
- `failedStage` und `errorMessage`: neueste Fehlermetadaten
- `plan`, `text`, `imagePrompts`, `imageArtifacts`: zwischengespeicherte Stufen-Artefakte, die von der Fortsetzung verwendet werden
- `artifact`: finales Ausgabe-Zusammenfassung (`markdownPaths`, `generationDir`, `analyticsPath`, `interactionsPath` und Zählungen)