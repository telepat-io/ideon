---
title: Architektur
description: Architekturdokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Architektur

Ideon ist als modulare CLI-Pipeline mit Generierungsverzeichnisausgaben und fortsetzbaren Stufen-Artefakten organisiert.

## Hochrangige Ausführung

1. Konfiguration und Geheimnisse auflösen
2. Generierungsverzeichnis erstellen und Laufmetadaten (`job.json`) ausführen
3. Primäre Inhaltsplanung + Schreiben ausführen (absatzbasiert für Langform, einmalig für Kurzform)
4. Bildprompts erweitern + Ressourcen rendern
5. Eine oder mehrere Markdown-Ausgabedateien + `meta.json` + Analytik schreiben

## Modulgrenzen

- `src/bin`: ausführbarer Einstiegspunkt
- `src/cli`: Befehlsschicht und Renderung
- `src/config`: Schema, Umgebungs Parsing, Fusionierung, Persistierung
- `src/pipeline`: Orchestrierung und Stufenzustand
- `src/generation`: Primäre Inhaltsplanung/Schreiben (absatzbasierte Langform + einmalige Kurzform) + sekundäre Kanalgenerierung
- `src/llm`: OpenRouter-Client und Prompt-Baukästen
- `src/images`: Replicate-Client + Bild-Pipeline
- `src/models/t2i`: Modellregister + Überschreibungserzwingung
- `src/output`: Markdown und Dateisystem-Dienstprogramme
- `src/server`: lokaler Vorschau-Server, Generierungs-Entdeckungshilfen, API-Routen
- `src/preview-app`: React + Ant Design Vorschau-Client (Vite-gebaut statische App)
- `src/types`: Domänen- und Validierungs-Schemas

## Stufenvertrag

Jede Stufe trägt:

- `id`
- `title`
- `status`
- `detail`
- optionales `summary`

Dieser Vertrag treibt sowohl die Ink-Benutzoberfläche als auch die klare Text-Renderer-Ausgabe an.

## Ausgabemodell

Jeder Lauf schreibt ein Generierungsverzeichnis:

- nummerierte Markdown-Ausgaben (`article-1.md`, `x-thread-1.md`, `x-post-1.md`, usw.)
- `job.json` mit aufgelösten Laufdefinitions-Metadaten
- `plan.md` mit dem primären Inhaltsplan
- `meta.json` mit strukturierten Inhaltsmetadaten
- `generation.analytics.json`
- gemeinsame Ressourcen für diese Generierung

Vorschau- und Löschoperationen arbeiten mit dieser Generierungsstruktur.

## Vorschau-Untersystem

Die Vorschau ist in zwei zusammenarbeitende Ebenen aufgeteilt:

1. `src/server/previewServer.ts` (Express-Server)
2. `src/preview-app/*` (React-SPA)

Der Server ist verantwortlich für:

- Generierungs-Entdeckung und initiale Auswahl
- API-Endpunkte für Bootstrap, Liste und Artikeldetail-Payloads
- generierungsbereichsbezogene Ressourcenbereitstellung
- Bereitstellung statischer Client-Dateien aus `dist/preview`
- gracielles Rückfall-HTML-Shell, wenn der Client-Build nicht verfügbar ist

Die React-App ist verantwortlich für:

- Generierungsnavigation und Ausgabenvarianten-Umschaltung
- kanalspezifische Markdown-Darstellung
- Interaktionsinspektion (`Prompt / Response`- und `Full JSON`-Modi)
- helles/dunkles Design-Erlebnis und persistierte Designpräferenz

Build-Pfad:

- Vite baut `src/preview-app` in `dist/preview`
- `npm run build` beinhaltet `npm run build:preview`
- `ideon preview` startet den Vorschau-Server und die App
- `npm run preview` (Repository-Komfortskript) baut zuerst den Vorschau-Client und startet dann `ideon preview`

## Fehlergrenzen-Strategie

- Stufenfehler sind lokalisiert und klar dargestellt
- Behandelte CLI-Fehler vermeiden redundante Stack-Tracebacks
- Unbekannte Fehler geben weiterhin Nicht-Null-Beendigungscodes zurück