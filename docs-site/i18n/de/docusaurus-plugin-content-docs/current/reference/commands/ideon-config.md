---
title: ideon config
description: Verwalten Sie Ideon-Einstellungen und Geheimniswerte nicht-interaktiv für Automatisierung und One-Shot-Agenten-Workflows.
keywords: [ideon, cli, config, automation, non-interactive]
---

# ideon config

## Was dieser Befehl macht

`ideon config` bietet eine nicht-interaktive Konfigurationsoberfläche für Skripte, CI und Agenten.

Es ergänzt `ideon settings`, das interaktiv bleibt.

## Verwendung

```bash
ideon config list [--json]
ideon config get <key> [--json]
ideon config set <key> <value]
ideon config unset <key>
```

## Unterbefehle

### ideon config list

Listet aktuell persistierte Einstellungen und Geheimnisverfügbarkeit auf.

```bash
ideon config list
ideon config list --json
```

### ideon config get

Liest einen Einstellungsschlüssel oder Geheimnisvorhandenheits-Schlüssel.

```bash
ideon config get style
ideon config get openRouterApiKey --json
```

### ideon config set

Setzt einen Einstellungs- oder Geheimniswert.

```bash
ideon config set style technical
ideon config set openRouterApiKey "$TELEPAT_OPENROUTER_KEY"
```

### ideon config unset

Setzt eine Einstellung auf den Standardwert zurück oder entfernt ein gespeichertes Geheimnis.

```bash
ideon config unset style
ideon config unset openRouterApiKey
```

## Unterstützte Schlüssel

Einstellungsschlüssel:

- `model`
- `modelSettings.temperature`
- `modelSettings.maxTokens`
- `modelSettings.topP`
- `modelRequestTimeoutMs`
- `notifications.enabled`
- `markdownOutputDir`
- `assetOutputDir`
- `style`
- `intent`
- `targetLength`

`targetLength`-Wert-Hinweise:

- Akzeptiert Aliase `small`, `medium`, `large` oder eine positive Ganzzahl-Wortanzahl.
- Alias-Zuordnung ist `small=500`, `medium=900`, `large=1400`.

Geheimnisschlüssel:

- `openRouterApiKey`
- `replicateApiToken`
- `googleAdsDeveloperToken`
- `googleAdsClientId`
- `googleAdsClientSecret`
- `googleAdsRefreshToken`
- `googleAdsCustomerId`
- `googleAdsLoginCustomerId`

Für Google Ads-Anmeldeinformationseinrichtung verwenden Sie `ideon gads login` für interaktive geführte Einrichtung, oder setzen Sie sie einzeln über `ideon config set`. Siehe [Google Ads Keyword Planner Einrichtung](../../guides/google-ads-keyword-planner.md) für Details.

## Ausgabe und Beendigungscodes

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Befehl erfolgreich abgeschlossen. |
| `1` | Validierungs-, Schlüssel- oder Speicherfehler aufgetreten. |
| `130` | Befehl wurde durch `Ctrl+C` unterbrochen. |

## Verwandte Befehle

- [ideon gads](./ideon-gads.md) — Interaktive Google Ads-Anmeldeinformationsverwaltung
- [ideon settings](./ideon-settings.md)
- [ideon write [idea]](./ideon-write.md)
- [Umgebungsvariablen](../environment-variables.md)

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Diese Befehlsgruppe ist für nicht-interaktive One-Shot-Workflows konzipiert.