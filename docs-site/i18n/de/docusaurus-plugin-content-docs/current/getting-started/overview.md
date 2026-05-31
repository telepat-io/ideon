---
sidebar_position: 1
title: Übersicht
description: Übersichtsdokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Ideon Dokumentation

Ideon ist ein KI-Inhaltsschreiber, der eine rohe Idee in kanalspezifische, veröffentlichungsfertige Inhalte verwandelt.

Verwenden Sie Ideon, wenn Sie Inhalte schnell über mehrere Formate veröffentlichen müssen, während Ton, Struktur und Qualität konsistent bleiben.

## Was Ideon macht

- Schreibt mehrere Inhaltstypen aus einer Idee (Artikel, Blog, Newsletter, Reddit, LinkedIn, X-Thread/X-Beitrag, Landing-Text)
- Passt das Schreiben für jeden Kanal an und bewahrt dabei die laufebene Stilkonsistenz
- Baut Planungskontext und Entwürfe für langform-strukturierte artikelgeführte Läufe
- Generiert visuelle Elemente für artikelgeführte Ausgaben (Cover- und Inline-Bilder)
- Reichert Ausgaben mit relevanten Links an, wenn aktiviert
- Erstellt wiederverwendbare Artefakte (`*.md`, `job.json`, `plan.md`, `meta.json`, `generation.analytics.json` und gemeinsame Ressourcen)

## Warum es wichtig ist

- Reduziert die Zeit für manuelles Umschreiben einer Idee für jeden Kanal
- Hält Markenstimme und redaktionelle Qualität konsistenter
- Bewegt von Brainstorming zu veröffentlichungsfertigen Entwürfen in einem wiederholbaren Workflow
- Iteriert sicher mit Trockenläufen, fortsetzbaren Sitzungen und Vorschau vor der Veröffentlichung

## Für wen diese Dokumentation bestimmt ist

- Betreiber und Autoren, die Ideon schnell ausführen möchten
- Ingenieure, die Ideon in skriptbasierte oder CI-Workflows integrieren
- Mitwirkende, die Pipeline-Stufen, Modelle und Dokumentation erweitern

## Schnelllinks

- [Installation](./installation.md)
- [Schnellstart](./quickstart.md)
- [Konfigurationsanleitung](../guides/configuration.md)
- [CLI-Referenz](../reference/cli-reference.md)
- [Technische Architektur](../technical/architecture.md)
- [Beitragen](../contributing/development.md)

## Erforderliche Dienste für Live-Läufe

- OpenRouter API-Schlüssel
- Replicate API-Token

Wenn Sie nur die End-to-End-Orchestrierung testen möchten, verwenden Sie `--dry-run`, um externe API-Aufrufe zu vermeiden.