---
sidebar_position: 2
title: Installation
description: Installationsdokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Installation

## Voraussetzungen

- Node.js 20+
- npm 10+
- macOS/Linux/Windows Terminal

## Global installieren

```bash
npm i -g @telepat/ideon
```

## CLI überprüfen

```bash
ideon --help
```

## Ersteinrichtung

```bash
ideon settings
```

## Optional: Aus Quellcode ausführen (Mitwirkenden-Workflow)

```bash
git clone https://github.com/telepat-io/ideon.git
cd ideon
npm install
npm run build
npm link
ideon --help
```

## Häufige Einrichtungsprobleme

- `keytar` Build/Laufzeit-Probleme: Keychain-Unterstützung wird bei der Laufzeit verzögert geladen; stellen Sie sicher, dass System-Keychain-APIs verfügbar sind, wenn Sie die Keychain-gestützte Geheimnisspeicherung verwenden möchten
- Container- oder headless Linux-Umgebung (D-Bus/Keyring nicht verfügbar): Setzen Sie `TELEPAT_DISABLE_KEYTAR=true` und stellen Sie `TELEPAT_OPENROUTER_KEY` plus `TELEPAT_REPLICATE_TOKEN` als Umgebungsvariablen bereit
- Fehlende Node-Version: Wechseln Sie zu Node 20+ (für ESM + Tooling-Kompatibilität)
- Berechtigungsprobleme beim Schreiben der Ausgabe: Überschreiben Sie Ausgabeverzeichnisse in Einstellungen oder Umgebungsvariablen