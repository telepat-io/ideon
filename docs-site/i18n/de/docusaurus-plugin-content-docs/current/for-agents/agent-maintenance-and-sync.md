---
title: Agentenwartung und Synchronisation
description: Wartungsrichtlinie zur Synchronisation von Ideon CLI, MCP-Werkzeugen und Skill-Verträgen.
keywords: [ideon, agents, maintenance, mcp, skills, sync]
---

# Agentenwartung und Synchronisation

Verwenden Sie diese Seite als operationellen Vertrag für Betreiber und Automatisierungsagenten.

## Geltungsbereich

Im Geltungsbereich:

- CLI-Befehlsverträge
- MCP-Werkzeugverträge
- erste Partei Skill-Vertragsmetadaten

Hinweis: „Skill-Vertragsmetadaten" bezieht sich hier auf interne Bezeichner in `src/integrations/skills/registry.ts` (z.B. `ideon-write-primary`).
Dies ist getrennt vom externen installierbaren Skill-Paket unter `skill/ideon-cli/`.

Außerhalb des Geltungsbereichs:

- Cursor-Integrationen
- VS-Code-Integrationen

## Obligatorische Gleich-Änderungs-Regel

Wenn sich ein CLI-Befehlsvertrag ändert, aktualisieren Sie alle betroffenen Artefakte in derselben Änderung:

1. CLI-Befehlsverhalten und Flag-Parsing.
2. MCP-Werkzeug-Eingabe/Ausgabe-Vertragsoberflächen.
3. Skill-Vertragsmetadaten-Oberflächen.
4. Befehlsreferenzdokumentation und Beispiele.
5. lokalisierte Dokumentationsparitätsseiten.
6. `skill/ideon-cli/`-Paket (`SKILL.md`, `references/command-catalog.md` und andere Begleitreferenzen).

Eine Änderung ist unvollständig, wenn exportierte CLI-, MCP-, Skill-Verträge und das installierbare Skill-Paket nicht synchronisiert sind.

## Erforderliche Validierung

Führen Sie diese Überprüfungen vor dem Zusammenführen aus:

```bash
npm run lint
npm run build
npm run test:coverage
npm run docs:build
```

Die Lint-Sequenz beinhaltet `check:sync`, das die Vertragsparität validiert.

## Abweichungssignale

Häufige Abweichungsindikatoren:

- CLI-Enum-Werte aktualisiert, aber MCP-Schema-Enums unverändert.
- erforderliche CLI-Argumente geändert, aber Skill-Erforderliche-Felder unverändert.
- Befehlsdokumentation listet Flags auf, die der Code nicht mehr akzeptiert.

## Überprüfungscheckliste

Blockieren Sie das Zusammenführen, wenn eine Antwort Nein ist:

- Wurden alle geänderten CLI-Argumente in MCP- und Skill-Verträgen widergespiegelt?
- Ist die Integrations-Synchronisationsprüfung bestanden?
- Wurde Dokumentation auf Englisch und zh-Hans aktualisiert?
- Sind nicht unterstützte Laufzeitgrenzen immer noch explizit?