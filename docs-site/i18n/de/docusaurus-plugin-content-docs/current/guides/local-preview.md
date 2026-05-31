---
title: Lokale Vorschau
description: Lokale Vorschau Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Lokale Vorschau

Ideon stellt generierte Inhalte über eine React-basierte lokale Web-App bereit, sodass Sie Text, Ressourcen und Modellinteraktionen an einem Ort überprüfen können.

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

### Linke Leiste

- ein Element pro Generierungsverzeichnis
- Titel, Zeitstempel und Snippet-Vorschau
- Schnell-Lade-Button

### Hauptinhaltsbereich

- kompakte Zusammenfassungszeile (Quellpfad, Generierungsanzahl, Ausgabeanzahl, Interaktionsanzahl)
- aktiver Generierungstitel und -slug
- Kanal-Registerkarten auf oberster Ebene (`article`, `x-post`, `linkedin-post`, usw.)
- Varianten-Registerkarten innerhalb jedes Kanals (`Article 1`, `X Post 2`, usw.)
- gerenderter Markdown-Body für die ausgewählte Ausgabe

### Protokollansicht

- stufen gruppierte Interaktionsliste (`shared-plan`, `planning`, `sections`, `image-prompts`, `images`, `output`, `links`)
- pro-Aufruf-Inspektor mit Metadaten (Modell, Status, Dauer)
- Modus-Umschaltung für `Prompt / Response` und `Full JSON`

## Laufzeitarchitektur

`ideon preview` führt nun zwei Ebenen aus:

1. API + statischer Server (`src/server/previewServer.ts`)
2. React-Client-App (`src/preview-app/`, gebaut von Vite in `dist/preview/`)

Beim Start versucht der Server, den gebauten React-Client zu finden und `index.html` unter `/` bereitzustellen.

- Wenn die React-Build existiert, wird die SPA-Benutzoberfläche bereitgestellt.
- Wenn der Build fehlt, fällt die Vorschau auf eine servergerenderte Hülle zurück, sodass die Vorschau dennoch funktioniert.

## Vorschau-API-Endpunkte

Die React-App liest Daten von:

- `GET /api/bootstrap`: initiale Quellpfad- und aktive-Generierung-Auswahl
- `GET /api/articles`: Generierungsliste für die linke Leiste
- `GET /api/articles/:slug`: vollständige Ausgabe + Interaktions-Payload für eine Generierung
- `GET /api/generations/:generationId/assets/*assetPath`: generierungsbereichsbezogene Ressourcenbereitstellung

## Auswahl- und Rückfallverhalten

- Wenn `markdownPath` weggelassen wird, wählt die Vorschau rekursiv die neueste Markdown-Ausgabe aus.
- Wenn `markdownPath` bereitgestellt wird, verwendet die Vorschau diese Generierung als initiale Auswahl, wenn gefunden.
- Wenn die aktive Generierung verschwindet, während die Vorschau geöffnet ist, fällt das Aktualisieren sicher auf die neueste verbleibende Generierung zurück.
- Wenn kein Markdown mehr vorhanden ist, zeigt die Vorschau eine Leerzustandsnachricht statt eines Absturzes.

## Design-Verhalten

- Erstes Laden folgt dem OS-Farbmodell (`prefers-color-scheme`).
- Hell/Dunkel-Umschaltung wird im lokalen Speicher persistiert.
- Die App verwendet Ant Design-Design-Token und benutzerdefiniertes CSS für kanalspezifische Ausgabekarten.

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

Wenn Sie die Vorschau-Benutzoberfläche lokal entwickeln:

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