---
title: Teststrategie
description: Teststrategie Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Teststrategie

Ideon verwendet Jest mit ESM-Unterstützung und fokussierten Testsuiten.

## Aktuelle Suiten

- `options.test.ts`: T2I-Erzwingung/Bereinigung/Standardwerte
- `articleSchema.test.ts`: Schema-Grenzvalidierung
- `markdown.test.ts`: Markdown-Renderungsvertrag
- `pipeline.runner.test.ts`: Stufen-Orchestrierungsverhalten (Multi-Ziele, Generierungsverzeichnisse, Fortsetzungssyntax)
- `config.resolver.test.ts`: Vorrang und Ideenauflösung
- `previewHelpers.test.ts` und `previewServer.test.ts`: rekursive Entdeckung, Generierungsgruppierung, Vorschau-Resilienz, Ressourcenbereitstellung
- `previewServer.internals.test.ts` und `previewServer.branches.test.ts`: Vorschau-Verzweigungs/Fehlerpfad- und Shell/API-Verhalten
- `src/preview-app/App.test.tsx`: React-Vorschau-Integrationsverhalten (Auswahl, Registerkarten-Umschaltung, Protokollinspektor)
- `src/preview-app/interactions.test.ts`: Interaktionsnormalisierung und Gruppierungsdienstprogramme
- `prompts.framework.test.ts`: Framework/Stil/Inhaltstyp-Prompt-Schichtung
- `write.command.test.ts`: Ziel-Parsing und CLI-Schreib-Optionen-Verhalten

## Tests ausführen

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Qualitätstore

Empfohlene Baseline vor dem Zusammenführen:

```bash
npm run lint
npm test
npm run build
npm run docs:build
```

## Abdeckung erweitern

Prioritäts-Ergänzungen:

- Mehr Vorschau-UI-Interaktionsabdeckung (Design, mobile Schublade und Leer-/Fehlerzustände)
- Zusätzliche Fehlerpfad-Abdeckung für Anbieterantworten
- Integrationsabdeckung für Löchsyntax in gemischten Generierungsverzeichnissen