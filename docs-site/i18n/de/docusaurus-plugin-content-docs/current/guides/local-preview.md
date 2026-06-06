---
title: Lokale Vorschau
description: Lokale Vorschau Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Lokale Vorschau

Ideon stellt generierte Inhalte über eine React-basierte lokale Web-App bereit, sodass Sie Text, Ressourcen, Plan-Metadaten und Modellinteraktionen an einem Ort überprüfen können.

## Schnellstart

Stellen Sie die neueste generierte Stapel aus Ihrem Ausgabeverzeichnis bereit:

```bash
ideon preview
```

Dieser Befehl:

- startet einen lokalen Server auf `http://localhost:4173`
- stellt den gebauten React-Vorschau-Client bereit (`dist/preview`)
- lädt Generierungs-Metadaten von Vorschau-API-Endpunkten
- stellt generierungslokale Ressourcen aus Ihrem konfigurierten Ressourcen-Ausgabeverzeichnis bereit
- öffnet Ihren Standardbrowser automatisch

## Was Sie in der Benutzoberfläche sehen

Die Vorschau-App verwendet das Telepat-Dunkeldesign (Leuchthintergründe, Poppins-Typografie, violette Akzente).

### Kopfzeile

- Markenlogo und Aktualisierungssteuerung
- **Info** öffnet die Metadaten-Schublade (Publikation, Serie und Generierungskontext)
- **Actions**-Menü: Markdown kopieren, meta.json herunterladen, Quellordner öffnen (kopiert den Generierungspfad)

### Linke Leiste

- Suche über Titel, Snippets, Keywords und Slugs
- Dropdown-Filter für Publikationen und Serien (aus Ihrer Ideon-Konfiguration)
- nach Datum gruppierte Generierungsliste mit Cover-Vorschaubildern, sofern vorhanden
- Publikations- und Keyword-Badges auf jedem Listeneintrag

### Hauptansichten

Für die aktive Generierung stehen drei Registerkarten zur Verfügung:

| Ansicht | Zweck |
|--------|--------|
| **Content** | Kanalspezifische Vorschaurahmen pro Ausgabetyp (Artikel, Blogpost, X-Post, LinkedIn usw.) mit Format- und Varianten-Tabs sowie Kapitelübersicht für Langform-Inhalte |
| **Plan & Assets** | Original-Idee, Content-Plan-Abschnitte, Bildergalerie sowie Stil-/Intent-Metadaten aus `meta.json` |
| **Logs** | Nach Stufen gruppierte LLM- und Bild-Interaktionsinspektion (`Prompt / Response` und `Full JSON`) |

Publikation und Serie sind optional. Generierungen ohne diese Zuordnung lassen sich weiterhin normal anzeigen; zugehörige UI-Bereiche werden ausgeblendet.

### Inhaltsformat-Vorschau

Jeder unterstützte Ideon-Ausgabetyp wird im Content-Tab einem kanalspezifischen Vorschaurahmen zugeordnet:

- Langform-Typen (`article`, `blog-post`, `science-paper`) zeigen ergänzende Elemente aus `meta.json` (Cover, Keywords, Byline oder Abstract) plus den echten Markdown-Body, mit scroll-synchronisierter Kapitelübersicht.
- Social- und Verteilungstypen (`x-post`, `x-thread`, `linkedin-post`, `reddit-post`, `newsletter`, `press-release`) verpacken die echte Ausgabe in plattformähnliche Karten mit dekorativer Umrahmung (Avatare, Aktionsleisten, statische Engagement-Platzhalter).
- Autoren-Chrome leitet sich vom aufgelösten Publikationsnamen ab, sofern vorhanden; andernfalls wird eine neutrale Vorschau-Bezeichnung verwendet.
- Dekorative UI (Kommentarthreads, Reaktionszahlen, Sponsor-Blöcke) ist statische Vorschau-Dekoration, keine Daten aus der Generierungspipeline.
- Unbekannte Ausgabetypen fallen auf generische Markdown-Typografie zurück.

## Laufzeitarchitektur

`ideon preview` führt zwei Ebenen aus:

1. API + statischer Server (`src/server/previewServer.ts`)
2. React-Client-App (`src/preview-app/`, gebaut von Vite in `dist/preview/`)

Beim Start versucht der Server, den gebauten React-Client zu finden und `index.html` unter `/` bereitzustellen.

- Wenn der React-Build existiert, wird die SPA-Oberfläche bereitgestellt.
- Wenn der Build fehlt, fällt die Vorschau auf eine servergerenderte Hülle zurück, sodass die Vorschau dennoch funktioniert.

## Vorschau-API-Endpunkte

Die React-App liest Daten von:

- `GET /api/bootstrap`: initiale Quellpfad- und aktive-Generierung-Auswahl
- `GET /api/articles`: Generierungsliste (enthält `publication`, `series` und `keywords`, sofern in `meta.json` vorhanden)
- `GET /api/articles/:slug`: vollständige Ausgabe, typisiertes `metaJson` und `markdownBody` pro Ausgabe
- `GET /api/publications`: konfigurierte Publikationen für Seitenleisten-Filter und Metadaten-Schublade
- `GET /api/series`: konfigurierte Serien für Seitenleisten-Filter und Metadaten-Schublade
- `GET /api/generations/:generationId/assets/*assetPath`: generierungsbezogene Ressourcenbereitstellung

## Auswahl- und Rückfallverhalten

- Wenn `markdownPath` weggelassen wird, wählt die Vorschau rekursiv die neueste Markdown-Ausgabe aus.
- Wenn `markdownPath` bereitgestellt wird, verwendet die Vorschau diese Generierung als initiale Auswahl, wenn gefunden.
- Wenn die aktive Generierung verschwindet, während die Vorschau geöffnet ist, fällt das Aktualisieren sicher auf die neueste verbleibende Generierung zurück.
- Wenn kein Markdown mehr vorhanden ist, zeigt die Vorschau eine Leerzustandsnachricht statt eines Absturzes.
- Seitenleisten-Filter wählen automatisch die erste passende Generierung, wenn die aktuelle Auswahl herausgefiltert wird.

## Vorschau eines bestimmten Artikels

```bash
ideon preview ./output/my-article.md
```

Wenn Sie in diesem Repository sind und Vorschau-Client-Neubau + Start in einem Befehl wünschen, können Sie auch ausführen:

```bash
npm run preview -- ./output/my-article.md
```

Optionale Flags:

- `--port <port>` für einen anderen Port verwenden
- `--no-open` zum Überspringen des automatischen Browserstarts

## Mitwirkenden-Hinweise

Wenn Sie die Vorschau-Benutzeroberfläche lokal entwickeln:

1. Bauen Sie den React-Client einmal:

```bash
npm run build:preview
```

2. Starten Sie die Vorschau ohne Browser zu öffnen:

```bash
ideon preview --no-open
```

3. Bauen Sie den Client neu, wenn sich der Vorschau-App-Code ändert:

```bash
npm run build:preview
```

`npm run preview` ist ein optionales Repository-Komfortskript, das sowohl einen Vorschau-Build als auch einen Server-Start durchführt.

## Fehlerbehebung

Wenn Ideon meldet, dass keine generierten Inhalte gefunden wurden:

1. Führen Sie zuerst einen Generierungsbefehl aus (`ideon write "your idea"`).
2. Bestätigen Sie Ihre Ausgabeverzeichnisse in `ideon settings`.
3. Wenn sich Markdown woanders befindet, übergeben Sie einen expliziten Pfad an `ideon preview`.

Wenn die Vorschau auf dem Standardport nicht startet:

1. Auf einem anderen Port starten: `ideon preview --port 8080 --no-open`
2. Prüfen Sie lokale Portkonflikte auf `4173`.

Wenn UI-Änderungen nicht sichtbar sind:

1. Führen Sie erneut `npm run build:preview` aus.
2. Aktualisieren Sie den Browser mit hartem Neuladen.
3. Bestätigen Sie, dass `dist/preview/index.html` einen aktuellen Zeitstempel hat.

Wenn Bilder nicht laden:

1. Stellen Sie sicher, dass die Vorschau auf denselben Workspace-Ausgaberoot zeigt, der für die Generierung verwendet wurde.
2. Überprüfen Sie, dass Markdown generierungsrelative Ressourcenpfade verwendet.
3. Öffnen Sie die Browser-Entwicklertools und bestätigen Sie, dass `/api/generations/:id/assets/...` `200` zurückgibt.

Wenn Publikations- oder Serienfilter leer sind:

1. Erstellen Sie Publikationen mit `ideon publication add`.
2. Erstellen Sie Serien mit `ideon series add`.
3. Führen Sie die Generierung erneut aus, damit `meta.json` die gewählten Publikations-/Serien-Slugs speichert.
