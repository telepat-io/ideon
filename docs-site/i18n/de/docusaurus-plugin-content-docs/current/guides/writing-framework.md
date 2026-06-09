---
title: Schreibrahmen
description: Schreibrahmen Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Schreibrahmen

Ideon verwendet nun eine Leitfaden-erste Prompt-Komposition. Schreibverhalten wird aus Markdown-Leitfäden unter `writing-guide/` bezogen und pro Stufe zusammengestellt.

## Kernprinzipien

1. Struktur mit Absicht
2. Informationsdichte statt Füllstoff
3. Spezifität statt Vagheit
4. Rhythmus und Lesbarkeit
5. Skannbarkeit und strukturelle Wegweisung
6. Aktiv mit konkreten Subjekten
7. Storytelling mit Disziplin
8. Kanalnative Auslieferung
9. Authentizitätsfilter (einfache, direkte Sprache)

## Tun und Vermeiden

Tun:

- Verwenden Sie konkrete Mechanismen und Beispiele.
- Beginnen Sie mit einem klaren Haken.
- Bauen Sie eine klare Durchgangslinie vom Anfang bis zum Ende auf.
- Verwenden Sie kurze, mittlere und längere Sätze, um natürliches Tempo zu erzeugen.
- Beginnen Sie Absätze mit aussagekräftigen deklarativen Behauptungen.
- Bevorzugen Sie messbare oder operationell testbare Aussagen.
- Passen Sie die Struktur an Kanalerwartungen an.

Vermeiden:

- Generische Behauptungen ohne Beweise.
- Wiederholendes Satztempo.
- Marketing-Füllstoff und Hype-Sprache.
- Leere Recap-Zeilen, die keine neuen Informationen hinzufügen.
- Überpolierte AI-klingende Übergänge und dramatische Klischees.
- Kopieren der Artikelstruktur unverändert in soziale Formate.

## Stilauswahl

Sie können einen laufebenen Stil setzen. Ideon verwendet diesen Wert, um den passenden Stilleitfaden unter `writing-guide/styles/` auszuwählen.

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

## Prompt-Kompositionsmodell

Ideon komponiert Schreibanweisungen durch Laden stufenspezifischer Leitfadenpakete plus Laufmetadaten:

1. Stufenbündel-Leitfäden (Planung, Absatzschreiben, Shared Plan, Kanalanpassung)
2. Ausgewählter Stilleitfaden (`writing-guide/styles/<style>.md`)
3. Ausgewählter Absichtsleitfaden (`writing-guide/content-intent/<intent>.md`)
4. Ausgewählte Format-Leitfäden (`writing-guide/formats/<content-type>.md`)
5. Operationelle Metadaten im Code (Laufkontext und Ziellänge

Dies hält das Schreibverhalten in versionierten Leitfaden-Dateien und bewahrt gleichzeitig deterministische Laufzeitbeschränkungen.

## Wie dies in Multi-Ausgaben-Läufen angewendet wird

- Derselbe ausgewählte Stil- und Absichtsleitfaden gilt für jede Ausgabe im Lauf.
- Format-Leitfäden spezialisieren dann die Struktur für jeden Kanal.
- Wenn Artikel-Ausgaben enthalten sind, können soziale Ausgaben diesen Artikel als Ankerkontext verwenden.

Praktische Implikation:

- Verwenden Sie einen Stil pro Lauf für Kohärenz und variieren Sie dann nur Ziele und Zählungen.
- Wenn Sie sehr unterschiedliche Stimmen benötigen, teilen Sie diese in separate Läufe auf.

## KI-Suche Extrahierbarkeit

Long-Form-Läufe laden `writing-guide/seo/ai-search-extraction.md` während Planung und Absatzschreiben. Dieser Leitfaden ergänzt bestehende SEO-Regeln um Entwurfs-Extrahierbarkeit:

- Frageförmige H2-Überschriften für informative Abschnitte
- In sich geschlossene Absätze mit expliziter Entitätsbenennung
- Vergleichstabellen, wenn ein Abschnitt drei oder mehr Optionen bewertet
- Anti-Gaming-Regeln: Genauigkeit vor templatisiertem Füllmaterial

### FAQ-Abschnitt

Für informative Absichten auf Long-Form-Primärzielen kann Ideon nach dem Schluss über einen separaten `sections:faq`-LLM-Aufruf einen `## FAQ`-Block anhängen. Standardmäßig aktivierte Absichten:

- `tutorial`
- `how-to-guide`
- `cornerstone`
- `deep-dive-analysis`
- `case-study`
- `roundup-curation`

FAQ-Generierung steuern mit:

- `faqSection: true` oder `faqSection: false` in Job-Einstellungen oder gespeicherten Einstellungen
- `--faq-section` erzwingt FAQ-Generierung
- `--no-faq-section` überspringt FAQ-Generierung

Wenn nicht gesetzt, verwendet Ideon die absichtsbasierte Standardlogik oben.