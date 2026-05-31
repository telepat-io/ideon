---
title: LLM- und Bild-Pipeline
description: LLM- und Bild-Pipeline Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# LLM- und Bild-Pipeline-Innenansichten

## OpenRouter-Client-Verhalten

OpenRouter-Anfragen beinhalten:

- Timeout: 45s pro Versuch
- Wiederholungen: bis zu 3 Versuche
- Wiederholbare Statuscodes: 408, 409, 429, 5xx
- Vorübergehende Netzwerk-Wiederholungsbehandlung

Strukturierte Anfragen unterstützen Parse-Callbacks zur Laufzeitvalidierung.

## Plan- und Prompt-Validierung

Ideon validiert:

- primäre Inhaltspläne (`articleSchema`-Einschränkungen für Langform-Typen, reduziertes Schema für Kurzform-Typen)
- Bildprompt-Payloads (`prompt` erforderlich)
- Laufkonfiguration über Zod-Schema-Standardwerte und -Einschränkungen

Ungültige Anbieterausgaben schlagen schnell mit umsetzbaren Fehlern fehl.

## Absatznormalisierung

Generierter Text wird normalisiert durch:

- Whitespace trimmen
- Markdown-Zäune entfernen, wenn vorhanden
- Leere Ausgabsätze ablehnen

## Prompt-System-Zusammensetzung

Die Prompt-Zusammensetzung ist leitfaden-erste:

- stufenspezifische Leitfadenbündel, geladen aus `writing-guide/`
- Stilleitfaden, ausgewählt aus `writing-guide/styles/<style>.md`
- Absichtsleitfaden, ausgewählt aus `writing-guide/content-intent/<intent>.md`
- Format-Leitfäden, ausgewählt aus `writing-guide/formats/<content-type>.md`
- operationelle Laufzeitbeschränkungen aus dem Code (Laufkontext, Ziellänge und minimale Ausgabeform-Verträge)

Für Multi-Ziel-Läufe können Artikel-Ausgaben als Ankerkontext für soziale/Kanal-Ausgaben verwendet werden.

## Kurzform-Ausgabepfad

- Kurzform-Inhaltstypen (`x-post`, `x-thread`, `linkedin-post`, `reddit-post`) werden in einmaligen Prompts generiert.
- Sie durchlaufen dennoch die einheitliche Planungsstufe, aber der Plan ist reduziert (Titel, Beschreibung, Winkel, Coverbild) und enthält keine Absätze oder Inline-Bilder.
- Stufe 3 verwendet einmalige Generierung statt absatzbasiertem Schreiben.

## Bildrendering-Pfad

1. Plan generiert Coverbild-Beschreibung und Inline-Bild-Beschreibungen (Anzahl proportional zur Artikellänge: 0–1 für klein, 1–2 für mittel, 2–4 für groß), jeweils mit expliziter `anchorAfterSection`-Platzierung beginnend bei Sektion 2
2. Bildplätze aus dem Plan erstellen (alle Inline-Bilder beibehalten; `--max-images` begrenzt bei Bedarf)
3. Jede Platzbeschreibung zum finalen Prompt erweitern, Planrichtung mit tatsächlichem Sektionsinhalt mischend
4. Replicate-Eingabe aus Modellregister und bereinigten Überschreibungen erstellen
5. Modell ausführen und Ausgabe-Bytes normalisieren
6. Bilddateien schreiben und markdown-relative Pfade berechnen

## Trockenlaufverhalten

Troecknläufe umgehen Anbieter-Aufrufe, üben aber die Orchestrierung aus:

- deterministischer synthetischer Plan und Absätze
- Platzhalter-Ressourcendateien
- normale Markdown-Zusammensetzung