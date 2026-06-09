---
title: Befehlsindex
description: Maschinenfreundlicher Index der Ideon CLI-Befehle und ihrer kanonischen Dokumentationsseiten.
keywords: [ideon, agents, command index, cli, reference]
---

# Befehlsindex

## ideon settings

- Pfad: `/reference/commands/ideon-settings`
- Zweck: Konfigurieren Sie Laufzeiteinstellungen und Anmeldeinformationen über den interaktiven Ablauf.
- Wichtige Flags: keine.

## ideon config

- Pfad: `/reference/commands/ideon-config`
- Zweck: Verwalten Sie Einstellungen und Geheimniswerte nicht-interaktiv für Automatisierung und Agenten.
- Wichtige Flags: `list --json`, `get --json`, `set`, `unset`.

## ideon write [idea]

- Pfad: `/reference/commands/ideon-write`
- Zweck: Generieren Sie primäre und optionale sekundäre Ausgaben aus einer Idee oder Job-Datei.
- Wichtige Flags: `--primary`, `--secondary`, `--job`, `--style`, `--intent`, `--length`, `--no-interactive`, `--dry-run`, `--no-seo-check`, `--seo-check-mode`, `--seo-check-max-turns`, `--enrich-links`, `--link`, `--unlink`, `--max-links`, `--from-queue`.

## ideon queue

- Pfad: `/reference/commands/ideon-queue`
- Zweck: Verwalten Sie die Inhaltswarteschlange für die Planung zukünftiger Artikel.
- Wichtige Flags: `add`, `list --json`, `peek`, `remove --force`, `clear --force`.

## ideon write resume

- Pfad: `/reference/commands/ideon-write-resume`
- Zweck: Setzen Sie die letzte fehlgeschlagene oder unterbrochene Schreibsitzung vom Checkpoint-Zustand fort.
- Wichtige Flags: `--no-interactive`, `--seo-check`, `--seo-check-mode`, `--seo-check-max-turns`, `--enrich-links`, `--link`, `--unlink`, `--max-links`.

## `ideon links <slug>`

- Pfad: `/reference/commands/ideon-links`
- Zweck: Führen Sie Link-Anreicherung für einen zuvor generierten Artikel nach Slug aus.
- Wichtige Flags: `--mode`, `--link`, `--unlink`, `--max-links`.

## `ideon delete <slug>`

- Pfad: `/reference/commands/ideon-delete`
- Zweck: Löschen Sie eine generierte Markdown-Ausgabe und zugehörige Analyse-Sidecar.
- Wichtige Flags: `--force`.

## ideon preview [markdownPath]

- Pfad: `/reference/commands/ideon-preview`
- Zweck: Starten Sie lokale Vorschau-Benutzoberfläche und API für generierte Ausgaben.
- Wichtige Flags: `--port`, `--no-open`, `--watch`.

## ideon mcp serve

- Pfad: `/reference/commands/ideon-mcp-serve`
- Zweck: Starten Sie den ersten Partei Ideon MCP-Server über stdio-Transport.
- Wichtige Flags: keine.

## ideon agent

- Pfad: `/reference/commands/ideon-agent`
- Zweck: Verwalten Sie lokale Laufzeitintegrationsregistrierungen und Bereitschaftsprüfungen.
- Wichtige Flags: `install --dry-run`, `uninstall --dry-run`, `status --json`.