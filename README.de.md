<p align="center"><img src="./assets/avatar/ideon-logo.webp" width="128" alt="Ideon"></p>
<h1 align="center">Ideon</h1>
<p align="center"><em>Verwandle eine Idee in Artikel, Threads und Social-Media-Beiträge. Hochwertige Inhalte ohne Token-Overhead.</em></p>

<p align="center">
  <a href="https://docs.telepat.io/ideon">📖 Docs</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
  · <a href="./README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/ideon/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/ideon"><img src="https://codecov.io/gh/telepat-io/ideon/graph/badge.svg" alt="Codecov"></a>
  <a href="https://sonarcloud.io/summary/new_code?id=telepat-io_ideon"><img src="https://sonarcloud.io/api/project_badges/measure?project=telepat-io_ideon&metric=alert_status" alt="Quality Gate Status"></a>
  <a href="https://www.npmjs.com/package/@telepat/ideon"><img src="https://img.shields.io/npm/v/@telepat/ideon" alt="npm"></a>
  <a href="https://github.com/telepat-io/ideon/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Ideon ist ein KI-Content-Writer, der eine einzige Idee in veröffentlichungsreife Inhalte in verschiedenen Formaten, Stilen und Kanälen umwandelt. Beschreiben Sie Ihr Thema einmal und Ideon erzeugt einen Artikel sowie X-Threads, LinkedIn-Posts, Reddit-Posts, Newsletter und Blogbeiträge – alle mit einer einheitlichen Stimme und Strategie.

Entwickelt für Marketer, Gründer und schlanke Teams, die hochwertige Inhalte in großem Umfang bereitstellen müssen, ohne eine Idee für jeden Kanal manuell umzuschreiben.

## Features

- **Einmal schreiben, überall veröffentlichen** — Eine Idee wird in einem einzigen Durchlauf zu Artikel, Blog, Newsletter, X-, LinkedIn- und Reddit-Posts. Der Artikel bildet das Fundament der Kampagne. Alles andere dient seiner Verbreitung.
- **Stil- und Intent-Steuerung** — 13 Stile × 13 Intents. Jedes Ergebnis teilt eine konsistente Stimme über alle Kanäle hinweg.
- **Veröffentlichungen und Serien** — Inhalte mit redaktionellen Richtlinien pro Veröffentlichung organisieren und verwandte Artikel unter Serien mit gemeinsamen Themen, Standardwerten und thematischer Prompt-Injektion gruppieren.
- **Recherchegestützte Links** — Ideon durchsucht das Web und fügt kontextbezogene externe Links ein, wie es ein menschlicher Autor tun würde. Keine manuelle Recherche.
- **SEO-optimierte Ausgabe** — On-Page-SEO, E-E-A-T-Glaubwürdigkeitssignale und Fakten-Dichte sind in die Schreib-Pipeline integriert. Inhalte, die sowohl in der klassischen Suche als auch in KI-generierten Zusammenfassungen ranken.
- **Beliebiges Modell via OpenRouter** — Nutzen Sie Claude, GPT-4 oder jedes unterstützte Modell. Wechseln Sie ohne Änderung Ihres Workflows.
- **Anleitunggestütztes Schreiben** — Prompt-Komposition basierend auf bewährten Schreibprinzipien, zusammengestellt aus echter Beratungspraxis. Kein generischer KI-Füllstoff.
- **Code-gesteuerte Effizienz** — Eine deterministische Pipeline übernimmt die Orchestrierung. Sie zahlen Tokens nur für die Textgenerierung.
- **Visuelles Storytelling** — Automatisch generierte Cover- und Inline-Bilder via Replicate für artikelgeführte Durchläufe.
- **Agent- und CI-fähig** — MCP-Server, nicht-interaktiver Modus, maschinenlesbare Konfiguration und fortsetzbare Durchläufe.
- **Google Keyword Planner** — Reale Keyword-Daten von Google Ads abrufen: Ideen, historische Metriken und Prognosen. Einrichtung mit `ideon gads login`, Abfrage mit `ideon gkp`.

## Quick Start

Installieren und erstes Content-Set generieren:

```bash
npm i -g @telepat/ideon
ideon settings
ideon write "How small editorial teams can productionize AI writing" --primary article=1 --secondary x-post=1
ideon preview
```

Erwartetes Ergebnis:

- Ein Generierungsordner wird unter `output/<timestamp>-<slug>/` angelegt.
- Eine oder mehrere veröffentlichungsreife Markdown-Ausgaben werden erzeugt.
- Analyse- und Metadaten-Artefakte werden für Überprüfung und Reproduzierbarkeit gespeichert.
- Die lokale Vorschau öffnet sich zur Prüfung von Inhalten, Links und generierten Assets.

## Requirements

- Node.js 20+
- npm 10+
- OpenRouter API-Key
- Replicate API-Token

## How It Works

Ideon durchläuft eine gestufte Schreib-Pipeline: Planung, Entwurf, Bild-Prompt-Erweiterung, Bildgenerierung, Kanalausgabeerzeugung und optionale Link-Anreicherung.

Es kombiniert Konfiguration aus Einstellungen, Umgebungsvariablen, Job-Dateien und CLI-Flags und schreibt strukturierte Artefakte für Nachvollziehbarkeit und Wiederverwendung.

Core commands:

```bash
ideon settings
ideon config list --json
ideon write "An article idea" --primary article=1
ideon write --no-interactive --idea "An article idea" --primary article=1 --style technical --length medium
ideon write --job ./job.json
ideon write resume
ideon delete my-article-slug
ideon preview --no-open
ideon gads login
ideon gkp ideas --keywords seo,marketing
```

## Using With AI Agents

Ideon ist für agentische Workflows konzipiert:

- **MCP-Server** — `ideon mcp serve` stellt Tools über stdio bereit für Content-Generierung, Fortsetzung, Löschung, Konfigurationsverwaltung und Google Keyword Planner-Abfragen. Kompatibel mit Claude Code, ChatGPT, Gemini und jedem generischen MCP-Host.
- **Agent-Runtime-Registrierung** — `ideon agent install <runtime>` registriert Integrationsprofile für unterstützte Plattformen. Status prüfen mit `ideon agent status --json`.
- **Nicht-interaktiver Modus** — `ideon write --no-interactive ...` entfernt alle Prompts für CI und Automatisierung.
- **Maschinenlesbare Konfiguration** — `ideon config list --json` und `ideon config get <key> --json` für Agent-Inspektion.
- **Skill-Pakete** — Installieren Sie `skill/ideon-cli/` für Lifecycle-Schreibworkflows und `skill/ideon-plan/` für freigabegesteuerte Content-Planung sowie GKP-gestützte Strategieworkflows.
- **Agent-Dokumentation** — [For Agents](https://docs.telepat.io/ideon/for-agents) behandelt MCP-Server, Skills und Wartung.

## Security And Trust

- Secrets werden standardmäßig über `ideon settings` im OS-Keychain gespeichert.
- In CI- oder containerisierten Umgebungen nutzen Sie `TELEPAT_OPENROUTER_KEY` und `TELEPAT_REPLICATE_TOKEN`.
- Setzen Sie `TELEPAT_DISABLE_KEYTAR=true`, wenn kein Keychain-Zugriff verfügbar ist.
- Generierte Ausgaben können modellgenerierte Inhalte enthalten – prüfen Sie Inhalte vor der Veröffentlichung.

Um ein Sicherheitsproblem zu melden, öffnen Sie eine private Meldung über den Security-Workflow des Repositorys oder kontaktieren Sie die Maintainer über die Issue-Kanäle des Repositorys mit minimalen sensiblen Details.

## Documentation And Support

- [Documentation site](https://docs.telepat.io/ideon)
- [Quickstart](https://docs.telepat.io/ideon/getting-started/quickstart)
- [CLI reference](https://docs.telepat.io/ideon/reference/cli-reference)
- [Configuration guide](https://docs.telepat.io/ideon/guides/configuration)
- [Troubleshooting](https://docs.telepat.io/ideon/guides/troubleshooting)
- [For Agents](https://docs.telepat.io/ideon/for-agents)
- [Repository](https://github.com/telepat-io/ideon)
- [npm package](https://www.npmjs.com/package/@telepat/ideon)

## Contributing

Beiträge sind willkommen. Beginnen Sie mit [Development](https://docs.telepat.io/ideon/contributing/development) für Einrichtung, Workflow und Qualitätsgates, und folgen Sie dann [Releasing and Docs Deploy](https://docs.telepat.io/ideon/contributing/releasing-and-docs-deploy) für Details zu Release und Dokumentations-Deployment.

Bei Änderungen an der benutzerorientierten Dokumentation aktualisieren Sie sowohl englische als auch vereinfachte chinesische Inhalte in derselben Änderung.

## License

MIT. Siehe [LICENSE](./LICENSE).
