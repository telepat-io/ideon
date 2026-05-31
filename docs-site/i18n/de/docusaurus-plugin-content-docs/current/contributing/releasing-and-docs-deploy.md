---
title: Veröffentlichen und Dokumentationsbereitstellung
description: Veröffentlichen und Dokumentationsbereitstellung Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Veröffentlichen und Dokumentationsbereitstellung

## Paket-Build-Bereitschaft

Vor dem Taggen einer Veröffentlichung:

```bash
npm run typecheck
npm test
npm run build
```

Stellen Sie sicher, dass `package.json` auf das phạmenbezogene öffentliche Paket gesetzt ist:

- name: `@telepat/ideon`
- publish access: `public`

## npm-Veröffentlichungsautomatisierung

Die Veröffentlichung bei npm wird über GitHub Actions für das Repository `telepat-io/ideon` automatisiert.

Auslöse-Regeln:

- Schieben Sie ein Tag im Format `vX.Y.Z` (Beispiel: `v1.2.3`)
- Der getaggte Commit muss von `main` aus erreichbar sein
- Die Tag-Version muss exakt mit der `package.json`-Version übereinstimmen

Workflow-Verhalten:

1. überprüft Tag-Format und Commit-Abstammung
2. überprüft, ob der Paketname `@telepat/ideon` ist
3. führt Veröffentlichungs-Qualitätstore aus (`lint`, `test`, `build`, `docs:build`)
4. veröffentlicht bei npm mit Herkunftsnachweis

## Voraussetzung für vertrauenswürdige Veröffentlichung

Dieses Repository verwendet npm Trusted Publishing (OIDC), nicht `NPM_TOKEN`.

In den npm-Paketeinstellungen für `@telepat/ideon` konfigurieren Sie einen vertrauenswürdigen Herausgeber für:

- Anbieter: GitHub Actions
- Repository: `telepat-io/ideon`
- Workflow: `.github/workflows/npm-publish.yml`

## Dokumentationsbereitstellungsziel

Dokumentation ist für GitHub Pages konfiguriert:

- Repository: `telepat-io/ideon`
- URL: `https://docs.telepat.io`
- baseUrl: `/ideon/`

## Bereitstellungworkflow

Der GitHub Actions-Workflow:

1. checkt Repository aus
2. installiert Dokumentationsabhängigkeiten
3. baut Docusaurus-statische Ausgabe
4. lädt Pages-Artefakt hoch
5. stellt auf GitHub Pages bereit

## Operationelle Hinweise

- Aktivieren Sie GitHub Pages-Quelle als „GitHub Actions" in den Repository-Einstellungen
- Die Bereitstellung läuft bei Änderungen am Hauptzweig zu Dokumentations/Inhalts-Workflow-Pfaden
- Stellen Sie sicher, dass Pages-Berechtigungen für den Workflow-Token aktiviert sind