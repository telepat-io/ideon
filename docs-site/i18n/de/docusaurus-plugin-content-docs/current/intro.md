---
sidebar_position: 1
title: Dokumentations-Einführung
description: Dokumentations-Einführung für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Dokumentations-Einführung

Ideon ist ein Inhalts-Schreib-CLI, das Ihnen hilft, eine Idee in viele kanalfertige Ausgaben mit einheitlichem Stil und produktionsfreundlichen Artefakten umzuwandeln.

Diese Dokumentation erklärt, was Ideon ist, warum Teams es verwenden und wie man es effektiv in lokalen-, CI- und Agenten-Workflows einsetzt.

## Wofür Ideon am besten ist

- Multi-Format-Schreiben aus einer Quellidee.
- Kanalspezifische Ausgabegenerierung (Artikel, Social Media, Newsletter, Landing-Page-Texte und mehr).
- Stilkonsistenz über Ausgaben in einem einzelnen Lauf hinweg.
- Rechercheinformierte Planung, optionale Link-Anreicherung und generierte visuelle Elemente für artikelgeführte Läufe.
- Integrierte SEO-Optimierung mit On-Page-Grundlagen, E-E-A-T-Glaubwürdigkeitssignalen und Faktenicht-Anforderungen.
- Iterative Workflows durch Wiederholungen, Fortsetzungsunterstützung und lokale Vorschau.

## Hier starten

- Neue Benutzer-Einrichtung: [Erste Schritte](./getting-started/installation.md)
- Erster Lauf-Durchlauf: [Schnellstart](./getting-started/quickstart.md)
- CLI-Optionen und Flags: [CLI-Referenz](./reference/cli-reference.md)

## Kernkonzepte

- Inhaltsziele: Wählen Sie genau einen primären Ausgabetyp plus optionale sekundäre Ausgabetypen pro Lauf
- Stil-Overlay: Wenden Sie einen laufebenen Stil auf alle Ausgaben an
- Generierungsverzeichnis: Jeder Lauf schreibt Markdown-Ausgaben, gemeinsame Ressourcen, `job.json`, `plan.md`, `meta.json` und `generation.analytics.json`
- Bedingte Stufen: Artikel-primäre Läufe verwenden strukturierten Artikelablauf; Nicht-Artikel-primäre Läufe verwenden allgemeine primäre Generierung mit einem Coverbild

## Empfohlene Lesereihenfolge

1. [Installation](./getting-started/installation.md)
2. [Schnellstart](./getting-started/quickstart.md)
3. [Konfiguration](./guides/configuration.md)
4. [Pipeline-Stufen](./guides/pipeline-stages.md)
5. [CLI-Referenz](./reference/cli-reference.md)

## Häufige Workflows

- Einstellungen und Anmeldeinformationen konfigurieren: `ideon settings`
- Inhalte generieren: `ideon write "your idea" --primary article=1 --secondary x-thread=1 --secondary x-post=1 --style technical`
- Ausgaben in der Vorschau anzeigen: `ideon preview`
- Fehlgeschlagene/unterbrochene Läufe fortsetzen: `ideon write resume`

Für Modell- und Laufökonomie siehe [Leistung und Kosten](./guides/performance-and-costs.md).