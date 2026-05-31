---
title: Fehlerbehebung
description: Fehlerbehebung Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Fehlerbehebung

## Fehlender OpenRouter API-Schlüssel

Fehlermuster:

- `Missing OpenRouter API key...`

Lösung:

- Setzen Sie `TELEPAT_OPENROUTER_KEY`, oder
- Speichern Sie den Schlüssel über `ideon settings`
- Wenn beide gesetzt sind, gewinnt die Umgebungsvariable für diesen Lauf

## Fehlender Replicate API-Token

Fehlermuster:

- `Missing Replicate API token...`

Lösung:

- Setzen Sie `TELEPAT_REPLICATE_TOKEN`, oder
- Speichern Sie den Token über `ideon settings`

Wenn Ihr Lauf kein `article`-Ziel enthält, werden Bildstufen übersprungen und Replicate ist nicht erforderlich.

## Keine Idee angegeben

Fehlermuster:

- `No idea provided...`

Lösung:

- Übergeben Sie `ideon write "your idea"`, oder
- Verwenden Sie `--job` mit `idea` oder `prompt`

## Ungültige Job-Datei

Fehlermuster:

- JSON-Parse- oder Schema-Validierungsfehler

Lösung:

- Validieren Sie die JSON-Syntax
- Stellen Sie sicher, dass Feldtypen dem dokumentierten Schema entsprechen
- Führen Sie erneut mit einer minimalen Job-Datei aus (`{ "idea": "..." }`) und fügen Sie Felder schrittweise hinzu

## Keine fortsetzbare Sitzung

Fehlermuster:

- `No resumable write session found...`

Lösung:

- Starten Sie zuerst einen frischen Lauf mit `ideon write "your idea"`
- Der Sitzungszustand wird im Benutzer-Konfigurationsverzeichnis gespeichert, nach Projektpfad verschlüsselt
- Wenn eine veraltete `.ideon/write/state.json` in Ihrem Projektverzeichnis existiert, wird sie beim Fortsetzen automatisch migriert
- Wenn das Projekt verschoben wurde, ist die Sitzung dennoch vom Konfigurationsverzeichnis aus zugänglich

## Unterbrochener Schreiblauf

Szenario:

- Lauf wurde mit `Ctrl+C` oder Prozessbeendigung unterbrochen

Wiederherstellung:

1. Führen Sie `ideon write resume` aus
2. Wenn die Fortsetzung nicht gefunden wird, überprüfen Sie, ob Sie im selben Verzeichnis wie das ursprüngliche `ideon write` ausführen
3. Wenn die Fortsetzung wiederholt fehlschlägt, starten Sie einen frischen Lauf mit `ideon write "your idea"`

## Keine generierten Inhalte gefunden

Fehlermuster:

- `No generated content found in ...`

Lösung:

- Führen Sie zuerst einen Generierungsbefehl aus (`ideon write "your idea"`)
- Überprüfen Sie die konfigurierten Ausgabeverzeichnisse in den Einstellungen
- Übergeben Sie einen expliziten Markdown-Pfad an `ideon preview`

## Vorschau lädt, aber Bilder fehlen

Fehlermuster:

- Vorschauseite rendert Markdown, aber Bild-Platzhalter sind defekt

Lösung:

- Überprüfen Sie, ob Bilder im Generierungsverzeichnis vorhanden sind, das von der CLI-Ausgabe angezeigt wird
- Stellen Sie sicher, dass die Vorschau gegen denselben Workspace/Ausgaberoot gestartet wurde, der für die Generierung verwendet wurde
- Führen Sie die Generierung erneut aus, wenn Ressourcen manuell gelöscht wurden

## Leere Modellausgabe

Fehlermuster:

- `The model returned an empty ... draft.`

Lösung:

- Lauf wiederholen
- Temperatur für Determinismus senken
- Modell wechseln oder Prompt-Mehrdeutigkeit reduzieren

Wenn dies wiederholt für einen Inhaltstyp auftritt, versuchen Sie, die Zielanzahl für diesen Typ zu reduzieren und die Ausgaben zu validieren, bevor Sie wieder hochskalieren.

## Strukturierte Ausgabe Kompatibilitätsfehler

Fehlermuster:

- `Model "..." or its routed provider does not support strict structured outputs...`

Lösung:

- Verwenden Sie ein Modell, das strukturierte Ausgaben auf OpenRouter unterstützt
- Überprüfen Sie, ob der Anbieter-Routing die erforderlichen Parameter erfüllen kann
- Wiederholen Sie den Versuch mit einem bekannten strukturierte-Ausgabe-fähigen Modell, wenn Ihr Standardmodell fehlschlägt

Hinweise:

- Ideon setzt strenges JSON-Schema für Planung und Bildprompt-Erweiterung durch
- Wenn ein Modell/Anbieter strukturierte Ausgabeanforderungen nicht erfüllen kann, schlägt Ideon früh fehl, anstatt einen erlaubten Rückfall-Parsing zu versuchen

## CI/Nicht-TTY-Ausgabe

Wenn die UI nicht rendert, fällt Ideon automatisch auf klare Stufenprotokolle zurück.

## Vorschau-Server startet nicht

Häufige Ursachen:

- Port bereits belegt (Standard `4173`)
- Ungültiger `--port`-Wert
- Fehlende Markdown-Ausgaben im konfigurierten Ausgabeverzeichnis

Lösung:

1. Starten Sie `ideon preview --port 8080 --no-open`
2. Bestätigen Sie, dass Ausgaben vorhanden sind, oder übergeben Sie einen Markdown-Pfad explizit
3. Bestätigen Sie, dass die Ausgabeverzeichnisse aus `ideon settings` mit Ihrem aktiven Workspace übereinstimmen