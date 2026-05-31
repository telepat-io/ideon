---
title: Umgebungsvariablen
description: Umgebungsvariablen Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Umgebungsvariablen

## Geheimnisse

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN`
- `TELEPAT_DISABLE_KEYTAR` (`true` oder `false`) — wenn `true`, versucht Ideon keinen Keychain-Zugriff und verwendet nur Umgebungsvariablen-Geheimnisauflösung

### Google Ads Keyword Planner Geheimnisse

- `TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN` — aus dem Google Ads API Center
- `TELEPAT_GOOGLE_ADS_CLIENT_ID` — OAuth2-Client-ID aus der GCP-Konsole
- `TELEPAT_GOOGLE_ADS_CLIENT_SECRET` — OAuth2-Client-Geheimnis aus der GCP-Konsole
- `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` — aus dem einmaligen OAuth2-Autorisierungsablauf
- `TELEPAT_GOOGLE_ADS_CUSTOMER_ID` — Google Ads-Kontonummer (mit Abrechnung)
- `TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID` — Manager-(MCC-)Kontonummer (nur bei Zugriff über ein Manager-Konto)

Detaillierte Google Ads-Einrichtungsanleitungen finden Sie unter [Google Ads Keyword Planner Einrichtung](../guides/google-ads-keyword-planner.md).

## Modelleinstellungen

- `IDEON_MODEL`
- `IDEON_TEMPERATURE`
- `IDEON_MAX_TOKENS`
- `IDEON_TOP_P`
- `IDEON_MODEL_REQUEST_TIMEOUT_MS`
- `IDEON_MODEL_REQUEST_MAX_ATTEMPTS` — maximale Versuche pro OpenRouter-Aufruf (Standard `4`, Bereich 1–10)

## Ausgabepfade

- `IDEON_MARKDOWN_OUTPUT_DIR`
- `IDEON_ASSET_OUTPUT_DIR`

## Generierungsstil

- `IDEON_STYLE`
- `IDEON_INTENT`
- `IDEON_TARGET_LENGTH` (`small`, `medium`, `large` oder positive Ganzzahl Wörter)

## Benachrichtigungen

- `IDEON_NOTIFICATIONS_ENABLED` (`true` oder `false`)

## Beispiel

```bash
TELEPAT_OPENROUTER_KEY=... \
TELEPAT_REPLICATE_TOKEN=... \
TELEPAT_DISABLE_KEYTAR=true \
TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN=... \
TELEPAT_GOOGLE_ADS_CLIENT_ID=... \
TELEPAT_GOOGLE_ADS_CLIENT_SECRET=... \
TELEPAT_GOOGLE_ADS_REFRESH_TOKEN=... \
TELEPAT_GOOGLE_ADS_CUSTOMER_ID=123-456-7890 \
IDEON_MODEL=deepseek/deepseek-v4-pro \
IDEON_TEMPERATURE=0.7 \
IDEON_MAX_TOKENS=2000 \
IDEON_TOP_P=1 \
IDEON_MODEL_REQUEST_TIMEOUT_MS=90000 \
IDEON_NOTIFICATIONS_ENABLED=false \
IDEON_MARKDOWN_OUTPUT_DIR=/output \
IDEON_ASSET_OUTPUT_DIR=/output/assets \
IDEON_STYLE=professional \
IDEON_INTENT=tutorial \
IDEON_TARGET_LENGTH=1200 \
ideon write "How teams scale editorial pipelines"
```

## Hinweise

- Numerische Variablen werden geparst und validiert.
- `IDEON_TARGET_LENGTH` unterstützt Aliase (`small=500`, `medium=900`, `large=1400`) oder explizite positive Ganzzahl-Wörter.
- Ungültige numerische Werte werden beim Parsen ignoriert und die Schema-Validierung bestimmt die endgültige Akzeptanz.
- Umgebungsvariablen überschreiben gespeicherte und Job-Datei-Einstellungen, wo anwendbar.
- In Umgebungen, in denen Keychain-Dienste nicht verfügbar sind (z.B. viele Container), setzen Sie `TELEPAT_DISABLE_KEYTAR=true`.
- Inhaltsziele (`contentTargets`) sind nicht über Umgebungsvariablen konfigurierbar; verwenden Sie CLI `--primary/--secondary` oder Job-Dateien.