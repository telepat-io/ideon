---
slug: /
title: Ideon
description: Ideon Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
sidebar_label: Willkommen
sidebar_position: 0
---

> KI-Inhaltsschreiber für Multi-Channel-Veröffentlichungen

Ideon verwandelt eine Idee in mehrere veröffentlichungsfertige Ergebnisse mit einheitlichem Stil, optionalen visuellen Elementen und recherchegestützten Links.

Es ist für Teams konzipiert, die hochwertige Inhalte über mehrere Kanäle veröffentlichen müssen, ohne alles manuell für jedes Format umzuschreiben.

## Warum Ideon

- Viele Formate aus einer Idee schreiben: Artikel, Blog-Beitrag, Newsletter, Reddit-Beitrag, LinkedIn-Beitrag, X-Thread, X-Beitrag und Landing-Page-Text.
- Stimmung mit Stilkontrollen über alle Ausgaben hinweg konsistent halten.
- Tiefe mit Planungsbriefs, Link-Anreicherung und generierten Bildern für artikelgeführte Läufe hinzufügen.
- Integrierte SEO-Optimierung: On-Page-Grundlagen, E-E-A-T-Signale und Faktenichte in jeder Generierung eingebaut.
- Schnell iterieren mit fortsetzbaren Läufen, Job-Dateien und lokaler Vorschau.

## Schnellstart

```bash
npm i -g @telepat/ideon
ideon write "Why async Rust is worth learning" --primary article=1 --secondary x-thread=2 --secondary x-post=1 --style technical
```

Siehe [Installation](./getting-started/installation.md) und [Schnellstart](./getting-started/quickstart.md) für die vollständige Einrichtung einschließlich Anmeldeinformationen.

## Was Ideon produziert

- Ein Generierungsverzeichnis pro Lauf (Zeitstempel + Slug)
- Eine oder mehrere Markdown-Ausgaben (`article-1.md`, `x-thread-1.md`, `x-post-1.md`, usw.)
- `job.json` Laufdefinitions-Metadaten für Reproduzierbarkeit
- `plan.md` mit dem primären Inhaltsplan
- `meta.json` strukturierte Inhaltsmetadaten-Sidecar
- `generation.analytics.json` mit Stufen- und Laufmetriken
- Gemeinsame Bildressourcen, die über ein Replicate T2I-Modell für die primäre Ausgabe gerendert werden (Artikel-primär enthält Inline-Bilder)

## Dokumentation

| Abschnitt | Was ist enthalten |
|---|---|
| [Erste Schritte](./getting-started/installation.md) | Installieren, Anmeldeinformationen konfigurieren, erste Multi-Ausgaben-Generierung starten |
| [Anleitungen](./guides/configuration.md) | Konfiguration, Schreibrahmen, Job-Dateien, Pipeline-Stufen, Ausgabestruktur |
| [Referenz](./reference/cli-reference.md) | CLI-Flags, Inhaltsziele, Stile, Umgebungsvariablen, unterstützte T2I-Modelle |
| [Technisch](./technical/architecture.md) | Architektur, LLM/Bild-Pipeline, Testen |
| [Beitragen](./contributing/development.md) | Entwicklungsumgebung, Modelle/Stufen/Einstellungen hinzufügen, Veröffentlichen |

## Erforderliche Anmeldeinformationen

- **OpenRouter API-Schlüssel** — für LLM-Aufrufe (Planung, Artikelschreiben, Kanalausgaben)
- **Replicate API-Token** — für Bildrendering

Speichern Sie sie interaktiv: `ideon settings` — oder setzen Sie `TELEPAT_OPENROUTER_KEY` / `TELEPAT_REPLICATE_TOKEN` als Umgebungsvariablen.

Verwenden Sie `--dry-run`, um die Pipeline-Orchestrierung zu testen, ohne API-Aufrufe zu machen.