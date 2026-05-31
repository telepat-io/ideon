---
title: Pipeline-Stufen
description: Pipeline-Stufen Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Pipeline-Stufen

Ideon führt eine siebenstufige Pipeline mit Live-Statusupdates und pro-Stufen-Analyse durch.

## Stufenablauf

Alle Läufe folgen denselben sieben Stufen:

1. **Planung Shared Plan**
2. **Planung Primary Content**
3. **Schreiben Primary Content**
4. **Erweitern von Bildprompts**
5. **Rendern von Bildern**
6. **Generieren von Kanalinhalten**
7. **Anreichern von Links**

Das Stufenverhalten hängt vom Inhaltstyp ab:

- Langform-Primär (`article`, `blog-post`, `newsletter`, `press-release`, `science-paper`): Der Plan umfasst Absätze und Inline-Bilder, und Stufe 3 schreibt Einleitung, Absätze und Schlussfolgerung.
- Kurzform-Primär (`x-post`, `x-thread`, `linkedin-post`, `reddit-post`): Der Plan umfasst Titel, Beschreibung und Winkel, und Stufe 3 generiert einmalige Primärausgaben.
- Für alle Primären bereiten Stufen 4–5 das primäre Coverbild vor und rendern es.
- `links`: Wird nur ausgeführt, wenn `--enrich-links` aktiviert ist, und schreibt Sidecar-Link-Metadaten für berechtigte Langform-Ausgaben

## Stufen-Benutzersignale

- `pending`: Nicht gestartet
- `running`: Wird gerade ausgeführt
- `succeeded`: Erfolgreich abgeschlossen
- `failed`: Fehler mit Details

Die Live-TTY-Benutzoberfläche blendet absichtlich ausstehende Zeilen aus, um die Ausgabe kompakt zu halten. Sie zeigt:

- aktuell laufende Stufe und Element
- abgeschlossene Historie
- fehlgeschlagene Zeilen
- Wiederholungskontext auf Stufendetails, wenn vorübergehende Fehler Wiederholungen auslösen (`retried Nx`, letzter Wiederholungsfehler)

Elementhistorie wird mit einem terminaladaptiven Fenster gerendert, sodass lange Läufe auf kurzen Terminals lesbar bleiben und gleichzeitig der neueste Fortschritt erhalten bleibt.

## Aktualisierungen während der Ausführung

- Sektionsstufe meldet aktiven Sektionsindex/Titel
- Bildprompt-Stufe meldet aktuelle Prompt-Erweiterung
- Bildrender-Stufe meldet aktuellen Renderfortschritt
- Ausgabestufe meldet sekundären pro-Element-Generierungsfortschritt und finales Generierungsverzeichnis
- Links-Stufe meldet pro-Element-Link-Anreicherung und Sidecar-Metadaten-Schreibvorgänge
- Wenn eine Stufe `succeeded` erreicht, druckt die CLI Stufenanalyse (Dauer und Kosten, wenn verfügbar)
- Nicht-TTY/klare Ausgabe sendet auch Laufstufen-Detailänderungen, sodass Wiederholungs/Fehlerfortschritt außerhalb der interaktiven Benutzoberfläche sichtbar ist

Für Stufen, die mehrere Arbeitseinheiten erzeugen, gibt Ideon elementweise Statuszeilen mit demselben Zustandsmodell (`pending`, `running`, `succeeded`, `failed`) aus.

Beispiele:

- Absatzschreib-Elementaktualisierungen (`Introduction`, `Section 2/N`, `Conclusion`)
- Sekundäre Ausgaben-Elementaktualisierungen (`x post 1/10`, `linkedin post 2/3`)
- Link-Anreicherungs-Elementaktualisierungen (`article-1`, `linkedin-1`)

Jedes Element zeigt einen Spinner während der Laufzeit und druckt Elementanalyse, sobald es erfolgreich ist.

## Erfasste Analytik

Für jeden Generierungslauf zeichnet Ideon auf:

- Stufendauer (ms) für alle sieben Stufen
- Stufen-Wiederholungszähler für externe API-Aufrufe
- Stufen-Kostensummen, wenn Preisdaten verfügbar sind
- Pro-Bild-Prompt-Erweiterungsaufrufmetriken (Dauer, Wiederholungen, Token-Verbrauch, Kosten)
- Pro-Bild-Renderaufrufmetriken (Dauer, Wiederholungen, Ausgabe-Bytes, Kosten)
- Pro-Ausgaben-Elementaufrufmetriken (Dauer, Wiederholungen, Kosten)
- Pro-Link-Anreicherungs-Elementaufrufmetriken (Dauer, Wiederholungen, Kosten, Phrase-Anzahl)

Analytik wird in `generation.analytics.json` in jedem Generierungsverzeichnis geschrieben.

Bei Pipeline-Abschluss zeigt die CLI auch aggregierte Summen für Laufdauer, Wiederholungszahl und Gesamtkosten.
Es enthält auch eine stufenweise Kosten Aufschlüsselung, damit Sie sehen können, wo innerhalb des Laufs Ausgaben angefallen sind.

## Fehlschlagssyntax

Wenn eine Stufe fehlschlägt:

- Aktuelle laufende Stufe wird als fehlgeschlagen mit Details markiert
- Abgeschlossene Stufen bleiben erfolgreich
- Verbleibende Stufen bleiben ausstehend
- Fehler steigt zur CLI mit sauberer benutzerseitiger Behandlung auf

## Fortsetzungssyntax

- Jeder abgeschlossene Stufen-Checkpoint wird in die Sitzungszustandsdatei persistiert.
- Checkpoints werden im Benutzer-Konfigurationsverzeichnis gespeichert, nach Projektpfad verschlüsselt.
- `ideon write resume` lädt gespeicherte Artefakte neu und überspringt bereits abgeschlossene Stufen.
- Die Fortsetzung funktioniert aus jedem Verzeichnis — der Sitzungszustand ist nicht mehr an das Arbeitsverzeichnis gebunden.
- Die Fortsetzung prüft derzeit an Stufengrenzen, sodass laufende Arbeit innerhalb einer Stufe von dieser Stufe aus wiederholt wird.
- Die Fortsetzung ist auch nach einer abgeschlossenen Sitzung erlaubt, um fehlende nachgelagerte Artefakte aus dem zwischengespeicherten Zustand neu zu generieren.

## Unterbrechungsverhalten

- `Ctrl+C` (SIGINT) und SIGTERM werden als fehlgeschlagene Sitzung aufgezeichnet, wenn eine Schreibsitzung existiert.
- Ideon schreibt eine Unterbrechungsnachricht in den Sitzungszustand, sodass `ideon write resume` von der letzten abgeschlossenen Stufe aus fortfahren kann.

## Trockenlaufverhalten

- Stufen-Orchestrierung wird weiterhin ausgeführt und Analytik wird ausgegeben.
- Externe OpenRouter- und Replicate-Aufrufe werden übersprungen.
- Ausgabeartefakte werden weiterhin geschrieben, sodass Verzeichnisstruktur und Orchestrierung ohne Anbieterkosten validiert werden können.

## Ausgabestufen-Verhalten

- Die primäre Ausgabe wird immer zuerst generiert und als `<primary-prefix>-1.md` geschrieben.
- Sekundäre Ziele werden nach Inhaltstyp in nummerierte Dateien erweitert (`x-thread-1.md`, `x-post-1.md`, usw.).
- Langform-Primäre verwenden Sektionsgenerierungs-Artefakte; Kurzform-Primäre verwenden einmalige Primärgenerierung.
- Sekundäre Ausgaben werden am generierten primären Kontext verankert.
- Die Ausgabestufe schreibt auch `job.json` mit der aufgelösten Laufdefinition und `meta.json` mit strukturierten Inhaltsmetadaten.
- Der Ausgabefortschritt wird in der CLI aufgeschlüsselt und in der Analytik unter `outputItemCalls` persistiert.

## Links-Stufen-Verhalten

- Link-Anreicherung verwendet das konfigurierte Modell mit aktiviertem OpenRouter Web-Such-Plugin.
- Link-Anreicherung ist ein Generierungsnachgang-Vorschlagsdurchlauf für berechtigte Langform-Markdown-Ausgaben.
- Ideon wählt zuerst linkbare Ausdrücke aus und löst dann für jeden Ausdruck eine optimal passende URL unter Verwendung von Absatzkontext auf.
- Linkdaten werden in Sidecar-Dateien neben Markdown-Ausgaben geschrieben (z.B. `article-1.links.json`), im v2-Format: `{ version: 2, customLinks: [...], links: [...] }`.
- Quell-Markdown-Dateien bleiben unverändert erhalten; der Vorschau-Server wendet Sidecar-Links bei der Renderzeit an.
- Während `ideon write` und `ideon write resume` ist diese Stufe über `--enrich-links` optional.
- Kurzform-Kanäle (`x-post`, `x-thread`) werden standardmäßig für die Link-Anreicherung übersprungen.
- **Benutzerdefinierte Links** (`--link "expression->url"`) werden separat gespeichert und immer beibehalten, unabhängig von `--mode fresh`. Verwenden Sie `--unlink <expression>`, um einen benutzerdefinierten Link zu entfernen.
- Benutzerdefinierte Links haben Vorrang: Wenn das LLM einen Ausdruck auswählt, der bereits durch einen benutzerdefinierten Link abgedeckt ist, wird der generierte Eintrag für diesen Ausdruck verworfen.
- **Benutzerdefinierte Links ersetzen jedes ungeschützte Vorkommen** ihres Ausdrucks im Artikelschworpen; generierte Links ersetzen nur das erste Vorkommen.
- **Max-Links** (`--max-links <n>`) begrenzt die Anzahl der generierten Links. Standardwerte sind 5 / 8 / 12 basierend auf der Artikel-Zielwortzahl (≤700 / ≤1150 / >1150).