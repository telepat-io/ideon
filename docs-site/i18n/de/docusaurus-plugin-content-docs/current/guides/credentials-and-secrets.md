---
title: Anmeldeinformationen und Geheimnisse
description: Anmeldeinformationen und Geheimnisse Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Anmeldeinformationen und Geheimnisse

Die Live-Generierung erfordert zwei Anbieter-Anmeldeinformationen. Google Ads Keyword Planner-Werkzeuge erfordern sechs zusätzliche Anmeldeinformationen.

## Erforderliche Geheimnisse

### Kern-Anbieter-Geheimnisse

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN`

### Google Ads Keyword Planner Geheimnisse

Die folgenden sechs Anmeldeinformationen sind für die `gkp_*` MCP-Werkzeuge erforderlich:

- `googleAdsDeveloperToken` — aus dem Google Ads API Center
- `googleAdsClientId` — OAuth2-Client-ID aus der GCP-Konsole
- `googleAdsClientSecret` — OAuth2-Client-Geheimnis aus der GCP-Konsole
- `googleAdsRefreshToken` — aus dem einmaligen OAuth2-Autorisierungsablauf
- `googleAdsCustomerId` — Google Ads-Kontonummer (mit Abrechnung)
- `googleAdsLoginCustomerId` — Manager-(MCC-)Kontonummer (nur bei Zugriff über ein Manager-Konto)

Detaillierte Einrichtungsanleitungen finden Sie unter [Google Ads Keyword Planner Einrichtung](./google-ads-keyword-planner.md).

## Empfohlener Einrichtungsweg

Verwenden Sie den Einstellungsablauf, um Geheimnisse in Ihrem OS-Keychain zu speichern:

```bash
ideon settings
```

Die CLI speichert Geheimnisse über Keychain-Integration, nicht Klartext-Konfiguration.

Für Google Ads-Anmeldeinformationen verwenden Sie `ideon config set`:

```bash
ideon config set googleAdsDeveloperToken "your-token"
ideon config set googleAdsClientId "your-client-id"
ideon config set googleAdsClientSecret "your-secret"
ideon config set googleAdsRefreshToken "your-refresh-token"
ideon config set googleAdsCustomerId "123-456-7890"
ideon config set googleAdsLoginCustomerId "123-456-7890"  # nur bei Bedarf
```

## Umgebungsvariablen-Alternative

Bash/zsh:

```bash
export TELEPAT_OPENROUTER_KEY=your_openrouter_key
export TELEPAT_REPLICATE_TOKEN=your_replicate_token
export TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
export TELEPAT_GOOGLE_ADS_CLIENT_ID=your-client-id.apps.googleusercontent.com
export TELEPAT_GOOGLE_ADS_CLIENT_SECRET=your-client-secret
export TELEPAT_GOOGLE_ADS_REFRESH_TOKEN=your-refresh-token
export TELEPAT_GOOGLE_ADS_CUSTOMER_ID=123-456-7890
export TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID=123-456-7890  # nur bei Bedarf
```

Fish:

```fish
set -x TELEPAT_OPENROUTER_KEY your_openrouter_key
set -x TELEPAT_REPLICATE_TOKEN your_replicate_token
set -x TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN your-developer-token
set -x TELEPAT_GOOGLE_ADS_CLIENT_ID your-client-id.apps.googleusercontent.com
set -x TELEPAT_GOOGLE_ADS_CLIENT_SECRET your-client-secret
set -x TELEPAT_GOOGLE_ADS_REFRESH_TOKEN your-refresh-token
set -x TELEPAT_GOOGLE_ADS_CUSTOMER_ID 123-456-7890
set -x TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID 123-456-7890  # nur bei Bedarf
```

## Validierungsverhalten

Wenn erforderliche Geheimnisse im Live-Modus fehlen, schlägt die Pipeline früh mit klaren stufenbezogenen Fehlern fehl.

Google Ads-Werkzeuge schlagen mit umsetzbaren Fehlermeldungen fehl, die Einrichtungsanleitungen enthalten, wenn Anmeldeinformationen fehlen oder ungültig sind.

## Sicherheitspraktiken

--commiten Sie keine Geheimnisse in Job-Dateien oder Repository-Konfiguration
- Bevorzugen Sie Keychain-gestützte Speicherung für die lokale Entwicklung
- Rotieren Sie Anbieter-Schlüssel regelmäßig
- OAuth2-Refresh-Tokens können nicht erneut abgerufen werden — speichern Sie sie sicher