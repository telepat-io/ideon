---
title: ideon gkp
description: Abfragen von Google Ads Keyword Planner-Daten — Keyword-Ideen, historische Metriken und Prognosen.
keywords: [ideon, cli, gkp, keyword planner, google ads, keywords, forecast, historical]
---

# ideon gkp

## Was dieser Befehl macht

`ideon gkp` fragt Google Ads Keyword Planner-Daten direkt von der CLI ab. Es stellt drei Unterbefehle bereit, die die GKP MCP-Werkzeuge widerspiegeln: Keyword-Ideen, historische Metriken und Prognosedaten.

Erfordert Google Ads-Anmeldeinformationen, die über `ideon gads login` oder Umgebungsvariablen konfiguriert wurden.

## Verwendung

```bash
ideon gkp ideas [options]
ideon gkp historical [options]
ideon gkp forecast [options]
```

## Unterbefehle

### ideon gkp ideas

Generieren Sie Keyword-Ideen aus Seed-Keywords, einer URL oder einer Seite.

```bash
ideon gkp ideas --keywords seo,marketing
ideon gkp ideas --keywords seo --country US,GB --language en
ideon gkp ideas --url https://example.com
ideon gkp ideas --keywords seo --url https://example.com --page-size 20
```

| Flag | Erforderlich | Standard | Beschreibung |
| --- | --- | --- | --- |
| `--keywords <keywords>` | * | — | Komma-getrennte Seed-Keywords |
| `--url <url>` | * | — | Seed-URL für Keyword-Ideen |
| `--site <site>` | ** | — | Seed-Seiten-Domain (exklusiv mit keywords/url) |
| `--country <codes>` | Nein | *alle Länder* | Komma-getrennte ISO 3166-1 alpha-2 Ländercodes |
| `--language <code>` | Nein | `en` | ISO 639-1 Sprachcode |
| `--page-size <n>` | Nein | — | Anzahl der Ergebnisse pro Seite |
| `--json` | Nein | `false` | Maschinenlesbare JSON-Ausgabe drucken |

\* Mindestens eines von `--keywords` oder `--url` ist erforderlich.
\*\* `--site` kann nicht mit `--keywords` oder `--url` kombiniert werden.

#### TTY-Ausgabebeispiel

```
Keyword Ideas
──────────────────────────────────────────────────────────────────────────
Keyword                                  Searches   Competition    Low Bid   High Bid
──────────────────────────────────────────────────────────────────────────
seo tools                                   12,000         MEDIUM      $0.50      $2.00
marketing automation                         8,000           HIGH      $1.00      $5.00
seo strategy                                 5,500          MEDIUM      $0.80      $3.50
──────────────────────────────────────────────────────────────────────────
Total: 3 keywords
```

#### JSON-Ausgabebeispiel

```json
{
  "ideas": [
    {
      "text": "seo tools",
      "avgMonthlySearches": 12000,
      "competition": "MEDIUM",
      "competitionIndex": 50,
      "lowTopOfPageBidMicros": 500000,
      "highTopOfPageBidMicros": 2000000,
      "closeVariants": []
    }
  ],
  "count": 1
}
```

---

### ideon gkp historical

Erhalten Sie historische Suchvolumen- und Wettbewerbsmetriken für eine Liste von Keywords.

```bash
ideon gkp historical --keywords seo,marketing
ideon gkp historical --keywords seo --country US --language en
ideon gkp historical --keywords seo --no-include-cpc
```

| Flag | Erforderlich | Standard | Beschreibung |
| --- | --- | --- | --- |
| `--keywords <keywords>` | **Ja** | — | Komma-getrennte Keywords zum Nachschlagen |
| `--country <codes>` | Nein | *alle Länder* | Komma-getrennte ISO 3166-1 alpha-2 Ländercodes |
| `--language <code>` | Nein | `en` | ISO 639-1 Sprachcode |
| `--include-cpc` / `--no-include-cpc` | Nein | `true` | Durchschnittlichen CPC in Ergebnisse einbeziehen |
| `--json` | Nein | `false` | Maschinenlesbare JSON-Ausgabe drucken |

#### TTY-Ausgabebeispiel

```
Historical Metrics
──────────────────────────────────────────────────────────────────────────
Keyword                                  Searches   Competition    Low Bid   High Bid
──────────────────────────────────────────────────────────────────────────
seo tools                                   12,000         MEDIUM      $0.50      $2.00
──────────────────────────────────────────────────────────────────────────
Total: 1 keyword
```

---

### ideon gkp forecast

Erhalten Sie projizierte Impressionen, Klicks und Kosten für eine Reihe von Keywords.

```bash
ideon gkp forecast --keywords seo,marketing
ideon gkp forecast --keywords seo --match-type EXACT --country US
ideon gkp forecast --keywords seo --max-cpc-bid 5000000 --start-date 2025-01-01 --end-date 2025-01-31
```

| Flag | Erforderlich | Standard | Beschreibung |
| --- | --- | --- | --- |
| `--keywords <keywords>` | **Ja** | — | Komma-getrennte Keywords zur Prognose |
| `--match-type <type>` | Nein | `BROAD` | Keyword-Übereinstimmungstyp: `BROAD`, `EXACT` oder `PHRASE` |
| `--max-cpc-bid <micros>` | Nein | — | Maximales CPC-Gebot in Mikros (1 USD = 1.000.000 Mikros) |
| `--country <codes>` | Nein | `US` | Komma-getrennte ISO-Ländercodes (Standard ist US) |
| `--language <code>` | Nein | `en` | ISO 639-1 Sprachcode |
| `--start-date <date>` | Nein | heute | Prognosestartdatum (`YYYY-MM-DD`) |
| `--end-date <date>` | Nein | heute+30 | Prognoseenddatum (`YYYY-MM-DD`) |
| `--json` | Nein | `false` | Maschinenlesbare JSON-Ausgabe drucken |

#### TTY-Ausgabebeispiel

```
Forecast
────────────────────────────────────────────────────────────────────────────────────
Keyword                          Match    Impr.   Clicks       Cost      CTR
────────────────────────────────────────────────────────────────────────────────────
seo tools                       BROAD    50,000     1,500      $7.50     3.0%
────────────────────────────────────────────────────────────────────────────────────
Total: 1 keyword
```

#### JSON-Ausgabebeispiel

```json
{
  "keywords": [
    {
      "text": "seo tools",
      "matchType": "BROAD",
      "impressions": 50000,
      "clicks": 1500,
      "costMicros": 7500000,
      "ctr": 0.03
    }
  ],
  "count": 1
}
```

---

## Ausgabe und Beendigungscodes

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Befehl erfolgreich abgeschlossen. |
| `1` | Validierung fehlgeschlagen, Anmeldeinformationen ungültig oder Laufzeitfehler aufgetreten. |
| `130` | Befehl wurde durch `Ctrl+C` unterbrochen. |

## Umgebungsvariablen

Alle Google Ads-Anmeldeinformationen können alternativ über Umgebungsvariablen gesetzt werden:

| Variable | Beschreibung |
| --- | --- |
| `TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN` | Developer-Token |
| `TELEPAT_GOOGLE_ADS_CLIENT_ID` | OAuth2-Client-ID |
| `TELEPAT_GOOGLE_ADS_CLIENT_SECRET` | OAuth2-Client-Geheimnis |
| `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` | OAuth2-Refresh-Token |
| `TELEPAT_GOOGLE_ADS_CUSTOMER_ID` | Kunden-ID |
| `TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Manager-Konto-ID (optional) |

Umgebungsvariablen haben Vorrang vor Keychain-gespeicherten Werten.

## Verwandte Befehle

- [ideon gads](./ideon-gads.md) — Google Ads-Anmeldeinformationen und OAuth verwalten
- [ideon config](./ideon-config.md) — Einzelne Anmeldeinformationen nicht-interaktiv setzen
- [Google Ads Keyword Planner Einrichtung](../../guides/google-ads-keyword-planner.md) — Vollständige Einrichtungsanleitung

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Die `gkp`-Befehle erfordern, dass Google Ads-Anmeldeinformationen zuerst konfiguriert werden. Führen Sie `ideon gads login` aus oder setzen Sie Umgebungsvariablen, bevor Sie diese Befehle verwenden.
- TTY-Ausgabe formatiert Gebote in Dollar; JSON-Ausgabe bewahrt rohe Mikros.