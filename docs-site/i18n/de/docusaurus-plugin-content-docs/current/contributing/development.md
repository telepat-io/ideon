---
title: Entwicklungworkflow
description: Entwicklungworkflow Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Entwicklungworkflow

## Repository-Einrichtung

```bash
git clone https://github.com/telepat-io/ideon.git
cd ideon
npm install
cd docs-site && npm install && cd ..
```

## Kerndefinitionsskripte

 Projektstamm:

```bash
ideon --help
npm run typecheck
npm test
npm run build
npm run pricing:refresh
```

Dokumentation:

```bash
npm run docs:start
npm run docs:build
npm run docs:typecheck
```

## Beitrittsrichtlinien

- Halten Sie Änderungen begrenzt und atomar
- Bewahren Sie CLI-Verhaltenskompatibilität, es sei denn, Sie ändern explizit die Benutzeroberfläche
- Fügen Sie Tests für Logikänderungen hinzu oder aktualisieren Sie diese
- Aktualisieren Sie Dokumentation mit Verhaltensänderungen im selben PR

## Vorgeschlagene PR-Checkliste

- [ ] Typecheck sauber
- [ ] Tests bestanden
- [ ] Build erfolgreich
- [ ] Dokumentation aktualisiert (wenn Verhalten geändert)