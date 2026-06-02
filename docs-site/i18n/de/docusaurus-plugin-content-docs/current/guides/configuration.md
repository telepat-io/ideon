---
title: Konfiguration
description: Konfigurationsdokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Konfiguration

Ideon fusioniert Konfiguration aus mehreren Quellen und validiert das Ergebnis vor der Ausführung.

## Vorrangregeln

Niedrigste bis höchste Priorität:

1. Gespeicherte Einstellungsdatei
2. Job-Datei-Einstellungen
3. Umgebungsvariablen
4. Veröffentlichungs-Standardwerte (wenn `--publication` gesetzt ist)
5. Serien-Standardwerte (wenn `--series` gesetzt ist; überschreibt Veröffentlichungs-Standardwerte)
6. Direkte CLI-Argumente (`--style`, `--intent`, `--primary`, `--secondary`, Ideeneingabe)

Geheimnis-Vorrang:

- `TELEPAT_OPENROUTER_KEY` und `TELEPAT_REPLICATE_TOKEN` aus Umgebungsvariablen überschreiben Keychain-gespeicherte Geheimnisse.
- Wenn Umgebungsvariablen nicht gesetzt sind, versucht Ideon, Keychain-Werte zu lesen, die über `ideon settings` gespeichert wurden.
- Keychain-Unterstützung (`keytar`) wird bei der Laufzeit verzögert geladen, wenn Geheimnis-Lese/Schreibvorgänge benötigt werden.
- Wenn der Keychain-Zugriff fehlschlägt (z.B. D-Bus ist in einem Container nicht verfügbar), greift Ideon auf Umgebungsvariablen für die Geheimnisauflösung zurück.
- Setzen Sie `TELEPAT_DISABLE_KEYTAR=true`, um den Keychain-Zugriff in Container- oder CI-Umgebungen komplett zu überspringen.

Feldweises Fusionsverhalten:

- `modelSettings` wird nach Schlüssel (`temperature`, `maxTokens`, `topP`) über Quellen fusioniert.
- `contentTargets` wird als vollständiges Array ersetzt, wenn es von einer Quelle mit höherer Priorität bereitgestellt wird.
- Skalare Einstellungen (z.B. `model`, `style`, `intent`, `targetLength`, `markdownOutputDir`) werden durch die Quelle mit der höchsten Priorität ersetzt.

## Einstellungsschema

Kern-Einstellungen umfassen:

- `model`: LLM-Modellkennung
- `modelSettings.temperature`: 0..2
- `modelSettings.maxTokens`: positive Ganzzahl
- `modelSettings.topP`: 0..1
- `modelRequestTimeoutMs`: positive Ganzzahl Anfrage-Timeout in Millisekunden (Standard `90000`)
- `modelRequestMaxAttempts`: maximale Versuche (initial + Wiederholungen) pro OpenRouter-Aufruf vor dem Aufgeben. Standard `4`, Bereich 1–10. Wiederholungen erfolgen bei 408/409/425/429 und 5xx; `Retry-After`-Header und `retry_after` JSON-Body-Felder werden berücksichtigt, begrenzt auf 60s pro Wartezeit.
- `t2i.modelId`: ausgewähltes Text-zu-Bild-Modell
- `t2i.inputOverrides`: modellspezifische Benutzerüberschreibungen
- `t2i.maxAttempts`: maximale Versuche (initial + Wiederholungen) pro Replicate-Bildgenerierung vor dem Fehlschlagen. Standard `4`, Bereich 1–10. Gleiche Wiederholungsregeln wie oben — 429er mit `retry_after` werden berücksichtigt.
- `notifications.enabled`: Schaltet OS-Benachrichtigungen für Schreib-Lebenszyklausgaben um
- `markdownOutputDir`
- `assetOutputDir`
- `contentTargets`: Array von Ausgabzielen mit pro-Typ-Zählungen
- `style`: laufebener Schreibstil
- `intent`: laufebene Inhaltsabsicht
- `targetLength`: laufebene Ziellänge in Wörtern (positive Ganzzahl). Aliase werden als Eingabe akzeptiert: `small=500`, `medium=900`, `large=1400`.

`contentTargets`-Einträge:

- `contentType`: eines von `article`, `blog-post`, `linkedin-post`, `newsletter`, `press-release`, `reddit-post`, `science-paper`, `x-post`, `x-thread`
- `role`: `primary` oder `secondary`
- `count`: positive Ganzzahl

Regeln:

- Genau ein `contentTargets`-Eintrag muss die Rolle `primary` haben.
- Die primäre Anzahl muss `1` sein.
- Sekundäre Einträge sind optional und können Zählungen größer als `1` verwenden.

Stilwerte:

- `academic`
- `analytical`
- `authoritative`
- `conversational`
- `empathetic`
- `friendly`
- `journalistic`
- `minimalist`
- `persuasive`
- `playful`
- `professional`
- `storytelling`
- `technical`

Absichtswerte:

- `announcement`
- `case-study`
- `cornerstone`
- `counterargument`
- `critique-review`
- `deep-dive-analysis`
- `how-to-guide`
- `interview-q-and-a`
- `listicle`
- `opinion-piece`
- `personal-essay`
- `roundup-curation`
- `tutorial`

Standardwerte:

- `contentTargets`: `[ { "contentType": "article", "role": "primary", "count": 1 } ]`
- `style`: `professional`
- `intent`: `tutorial`
- `targetLength`: `900`

Ziellängen-Aliase:

- `small`: `500` Wörter
- `medium`: `900` Wörter (Standard)
- `large`: `1400` Wörter

## Gespeicherter Einstellungsort

Gespeichert über OS-Konfigurationspfad (mit `env-paths`), typischerweise:

- macOS: `~/.ideon/settings.json`

Um gespeicherte Einstellungen zu bearbeiten, führen Sie erneut `ideon settings` aus. Der Assistent ist der unterstützte Weg, um Werte und gespeicherte Anmeldeinformationen zu aktualisieren.

## Beispiel Umgebungsüberschreibung

```bash
IDEON_MODEL=openai/gpt-4.1-mini \
IDEON_TEMPERATURE=0.6 \
IDEON_MAX_TOKENS=2400 \
IDEON_STYLE=technical \
IDEON_INTENT=tutorial \
IDEON_TARGET_LENGTH=1200 \
ideon write "An idea"
```

Hinweis: Inhalts-Ziel-Arrays sind derzeit nicht über Umgebungsvariablen konfigurierbar. Verwenden Sie CLI `--primary/--secondary`-Flags oder Job-Datei `settings.contentTargets`.

Siehe [Umgebungsvariablen](../reference/environment-variables.md) für die vollständige Liste.