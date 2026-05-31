---
title: Skills
description: Primäres installierbares Ideon-Skill-Paket für Agenten-Workflows, plus interne Vertragsmetadaten-Hinweise.
keywords: [ideon, agents, skills, workflow, contracts]
---

# Skills

Diese Seite handelt hauptsächlich vom installierbaren Ideon-Skill-Paket für Drittanbieter-Agenten.

## Primäres Skill-Paket

Installierbares Paket:

- `skill/ideon-cli/`

Verwenden Sie dieses Paket, wenn ein Agent Ideon als Inhaltschreiber über vollständige Lebenszyklus-Workflows hinweg ausführen soll:

- Installation und Einrichtung
- Inhaltsgenerierung über mehrere Ausgabeformate
- Stil- und Längensteuerung
- Link-Anreicherung, Bildgenerierung und lokale Vorschau-Workflows
- iterative Verfeinerung über Fortsetzung/Wiederholung und automatisierungssichere Befehlspfade

Kerndatei:

- `skill/ideon-cli/SKILL.md`

Begleitreferenzen:

- `skill/ideon-cli/references/command-catalog.md`
- `skill/ideon-cli/references/troubleshooting.md`
- `skill/ideon-cli/references/framework-patterns.md`

## Interne Vertragsmetadaten (Sekundär)

Ideon veröffentlicht auch erste Partei interne Skill-Vertragsmetadaten, die von Laufzeit-Bereitschafts- und Synchronisationsprüfungen verwendet werden.
Diese Namen sind interne Bezeichner und nicht der installierbare Paketname.

Aktuelle erste Partei Skill-Vertragseinträge:

- `ideon-write-primary`
- `ideon-config-set`

## Erforderlicher Skill-Vertrag

Für jeden Skill dokumentieren Sie:

1. Skill-Name und beabsichtigtes Ergebnis.
2. Erforderliche Eingaben und Validierungseinschränkungen.
3. Ausführungsschutzmaßnahmen und Sicherheitseinschränkungen.
4. Erwartete Ausgaben und Ausgabeschema.
5. Fehlermodi und Wiederherstellungsanweisungen.
6. Überprüfungs-Prompts und Testkriterien.

## Veröffentlichungsregeln

- Halten Sie eine kanonische Seite pro Skill.
- Verlinken Sie jeden Skill mit autoritativer menschlicher Dokumentation, auf die er sich stützt.
- Fügen Sie konkrete Beispiele mit realen Argumentwerten hinzu.
- Halten Sie erforderliche Felder und Enum-Werte mit CLI- und MCP-Verträgen synchronisiert.

## Synchronisations- und Abweichungsrichtlinie

- Skill-Vertragsmetadaten sind Teil der Integrationsvertragsoberfläche.
- Wenn CLI-Argumente oder Enum-Werte geändert werden, müssen Skill-Verträge in derselben Änderung aktualisiert werden.
- Integrations-Synchronisationsprüfungen sollten bei jeder Vertragsabweichung fehlschlagen.

Für die obligatorische Wartungsrichtlinie und Überprüfungscheckliste siehe:

- [Agentenwartung und Synchronisation](./agent-maintenance-and-sync.md)