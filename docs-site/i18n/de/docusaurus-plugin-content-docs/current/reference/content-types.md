---
title: Inhaltstypen
description: Inhaltstypen Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Inhaltstypen

Ideon unterstützt diese Generierungsziele:

## `article`

- Am besten für: langform-kanonische Inhalte.
- Typische Struktur: Titel, Einleitung, Absätze, Schlussfolgerung, Bild-Einbettingen.
- Typische Ausgabe: Langform-Entwurf mit wiederverwendbarem narrativem Kontext für Kanalausgaben.

## `blog-post`

- Am besten für: Bildungsveröffentlichungen und SEO-fokussierte Erklärer.
- Typische Struktur: klare Einleitung, Untertitel, praktische Erkenntnisse.

## `x-thread`

- Am besten für: mehrteilige Erklärsequenzen auf X.
- Typische Struktur: Haken-Eröffner, nummerierte Thread-Zeilen, klare narrative Fortschreibung.
- Typische Ausgabe: Thread-Form-Inhalte, bei denen jede Zeile eine gemeinsame Handlungsbogen vorantreibt.

## `x-post`

- Am besten für: Kurzform-Verteilung.
- Typische Struktur: Haken-first kurze Zeilen.
- Typische Ausgabe: Ein prägnanter Beitrag, der den Laufstil beibehält, aber Haken-Dichte und Tempo priorisiert.

## `reddit-post`

- Am besten für: Gemeinschaftsdiskussion und Praktiker-Feedback.
- Typische Struktur: Einfache, offene Stimme mit praktischen Details.

## `linkedin-post`

- Am besten für: Professionelle Thought Leadership und Verteilung.
- Typische Struktur: Zweizeiliger Hake, kurze abgesetzte Absätze, fokussierter Abschluss.

## `newsletter`

- Am besten für: Wiederkehrende Abonnentenkommunikation.
- Typische Struktur: Starke Eröffnung, kompakte Absätze, klare Übergänge.
- Typische Ausgabe: Redaktionelles Tempo auf wiederkehrende Publikums-Updates abgestimmt.

## `press-release`

- Am besten für: Offizielle Ankündigungen und Stakeholder-Kommunikation.
- Typische Struktur: Schlagzeile, Einleitung, Ankündigungsdetails, zitierfähige Zeilen und Timing/Kontext.

## `science-paper`

- Am besten für: Forschungsintensive oder evidenzfirstige Langform-Inhalte.
- Typische Struktur: Forschungskontext, Methodenklarheit, Ergebnisse, Einschränkungen und Implikationen.

## Multi-Ausgaben-Verhalten

- Jeder Lauf hat genau eine primäre Ausgabe und optionale sekundäre Ausgaben.
- Sekundäre Ausgaben können generierte primäre Inhalte als Ankerkontext verwenden.
- Langform-Primäre (`article`, `blog-post`, `newsletter`, `press-release`, `science-paper`) verwenden strukturierte absatzbasierte Planung und Schreiben.
- Kurzform-Primäre (`x-post`, `x-thread`, `linkedin-post`, `reddit-post`) verwenden reduzierte Planung (Titel, Beschreibung, Winkel) und einmalige Generierung.
- Alle Primären rendern ein Coverbild; Langform-Primäre enthalten auch Inline-Bilder.

## Auswahlhinweise

- Verwenden Sie `article`-Primär + Sekundäre, wenn Sie eine kanonische Erzählung und mehrere Verteilungsvarianten wünschen.
- Verwenden Sie kanal-only-Ziele für leichte Kampagnenideen und Iteration.
- Verwenden Sie `x-thread` für Erklärreihen und `x-post` für schnelle Einzelbeitrags-Verteilung.

## Stile

Ideon unterstützt diese laufebenen Stile:

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

## Absichten

Ideon unterstützt diese laufebenen Absichten:

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

## Multi-Ziel-Beispiel

```bash
ideon write "AI workflow launch" \
  --primary article=1 \
  --secondary x-thread=2 \
  --secondary x-post=1 \
  --secondary linkedin-post=1 \
  --style technical \
  --intent tutorial
```