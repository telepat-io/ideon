---
title: ideon gads
description: Verwalten Sie Google Ads-Integrationsanmeldeinformationen, OAuth-Autorisierung und Verbindungsüberprüfung.
keywords: [ideon, cli, gads, google ads, oauth, credentials, keyword planner]
---

# ideon gads

## Was dieser Befehl macht

`ideon gads` verwaltet Google Ads-Integrationsanmeldeinformationen, OAuth-Autorisierungsabläufe und Verbindungsüberprüfungen für die Keyword Planner API-Werkzeuge.

## Verwendung

```bash
ideon gads login [options]
ideon gads logout [options]
ideon gads status [options]
ideon gads test
```

## Unterbefehle

### ideon gads login

Starten Sie einen interaktiven OAuth-Ablauf, um Google Ads-Token zu erhalten und alle erforderlichen Anmeldeinformationen zu speichern.

```bash
ideon gads login
ideon gads login --force
ideon gads login --developer-token <token> --client-id <id> --client-secret <secret> --customer-id <id>
```

Sammelt die folgenden Anmeldeinformationen (interaktiv oder über Flags):

| Flag | Erforderlich | Beschreibung |
| --- | --- | --- |
| `--developer-token <token>` | Ja | Google Ads API Developer-Token |
| `--client-id <id>` | Ja | OAuth2-Client-ID aus GCP |
| `--client-secret <secret>` | Ja | OAuth2-Client-Geheimnis aus GCP |
| `--customer-id <id>` | Ja | Google Ads-Kunden-ID (10 Ziffern, Bindestriche optional) |
| `--login-customer-id <id>` | Nein | Manager-Konto-Kunden-ID (nur MCC, nur Flag, nicht aufgefordert) |
| `--force` | Nein | Erneut autorisieren, auch wenn ein Refresh-Token bereits existiert |

Anmeldeinformationen werden nach Eingabe schrittweise gespeichert. Wenn der OAuth-Ablauf mittendrin fehlschlägt, werden zuvor eingegebene Anmeldeinformationen beibehalten.

Der OAuth-Ablauf öffnet ein Browserfenster für die Google-Einwilligung. Wenn der Browser nicht geöffnet werden kann, wird die Autorisierungs-URL für die manuelle Verwendung gedruckt.

### ideon gads logout

Gespeicherte Google Ads-Anmeldeinformationen löschen.

```bash
ideon gads logout
ideon gads logout --all
```

| Flag | Beschreibung |
| --- | --- |
| `--all` | Alle 6 Google Ads-Anmeldeinformationen löschen, nicht nur das Refresh-Token |

Ohne `--all` wird nur das Refresh-Token gelöscht, was eine erneute Autorisierung über `gads login` ohne erneutes Eingeben anderer Anmeldeinformationen ermöglicht.

### ideon gads status

Zeigt, welche Google Ads-Anmeldeinformationen konfiguriert sind und ihre Quelle.

```bash
ideon gads status
ideon gads status --json
```

| Flag | Beschreibung |
| --- | --- |
| `--json` | Maschinenlesbare JSON-Ausgabe drucken |

TTY-Ausgabe:

```
Google Ads Credential Status
─────────────────────────────────────
  developer Token        ✓ keychain
  client Id              ✓ env
  client Secret          ✓ keychain
  refresh Token          ✓ keychain
  customer Id            ✓ keychain
  login Customer Id      — not set (optional)

Run `ideon gads test` to verify credentials work.
Run `ideon gads login` to set up missing credentials.
```

JSON-Ausgabe:

```json
{
  "googleAdsDeveloperToken": { "set": true, "source": "keychain" },
  "googleAdsClientId": { "set": true, "source": "env" },
  "googleAdsClientSecret": { "set": true, "source": "keychain" },
  "googleAdsRefreshToken": { "set": true, "source": "keychain" },
  "googleAdsCustomerId": { "set": true, "source": "keychain" },
  "googleAdsLoginCustomerId": { "set": false, "source": null }
}
```

Die Quelle kann `env` (Umgebungsvariable), `keychain` (System-Keychain) oder `null` (nicht gesetzt) sein. Umgebungsvariablen haben Vorrang vor Keychain-Werten.

### ideon gads test

Überprüfen Sie Google Ads-Anmeldeinformationen durch einen Test-API-Aufruf.

```bash
ideon gads test
```

Macht einen leichtgewichtigen `generateKeywordIdeas`-Aufruf mit einem einzelnen Keyword, um zu überprüfen, ob die vollständige Anmeldeinformationskette funktioniert (Token-Aktualisierung, API-Header, Kunden-ID).

Erfolgsmeldung:

```
✓ Google Ads credentials verified.
  Customer ID: 1234567890
  API response received successfully (1 keyword returned).
```

Die Fehlerausgabe enthält den spezifischen Fehler und umsetzbare Lösungsvorschläge.

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
| `TELEPAT_IDEON_GADS_REDIRECT_URL` | Vollständige öffentliche OAuth-Callback-URL (Web OAuth). Nicht gesetzt → `http://localhost:9876/callback` |

Umgebungsvariablen haben Vorrang vor Keychain-gespeicherten Werten. In CI/CD- oder headless-Umgebungen, in denen keytar nicht verfügbar ist, verwenden Sie Umgebungsvariablen — sie umgehen den Keychain komplett.

## Container- / MCP-Modus

Wenn `TELEPAT_DISABLE_KEYTAR=1` (Telepat Monad, Docker, CI):

- `TELEPAT_GOOGLE_ADS_*`-Umgebungsvariablen vorab setzen; nicht auf Keychain-Speicherung durch `gads login` verlassen.
- MCP **`gads_login`** und **`gads_login_status`** statt interaktivem CLI-Login verwenden.
- Bei OAuth-Abschluss gibt MCP `refreshToken` mit `saved: false` zurück — extern als `TELEPAT_GOOGLE_ADS_REFRESH_TOKEN` persistieren.
- Mit MCP **`gads_test`** verifizieren.

Setzen Sie `TELEPAT_IDEON_GADS_REDIRECT_URL` für Web OAuth hinter einem Reverse Proxy. Siehe [MCP-Server](../../for-agents/mcp-servers.md).

## Speicherverhalten

`gads login` und `ideon config set` speichern Anmeldeinformationen im **System-Keychain** über das `keytar`-Modul (macOS Keychain, Linux Secret Service, Windows Credential Manager). Dies ist keine Umgebungsvariablen-Speicherung.

| Umgebung | `gads login` | `config set` | Umgebungsvariablen |
| --- | --- | --- | --- |
| Interaktiv + keytar | Keychain | Keychain | N/A |
| Interaktiv, kein keytar | Fehlschlag | Fehlschlag | Funktioniert |
| CI/CD (kein TTY) | Fehlschlag | Funktioniert | Funktioniert |

Für headless-Umgebungen setzen Sie `TELEPAT_GOOGLE_ADS_*`-Variablen direkt in Ihrer CI-Konfiguration.

## Verwandte Befehle

- [ideon config](./ideon-config.md) — Einzelne Anmeldeinformationen nicht-interaktiv setzen
- [Google Ads Keyword Planner Einrichtung](../../guides/google-ads-keyword-planner.md) — Vollständige Einrichtungsanleitung

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Der `gads login`-Befehl erfordert ein interaktives Terminal (TTY). Für CI/CD-Umgebungen verwenden Sie Umgebungsvariablen oder `ideon config set`.
- OAuth-Token werden im System-Keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager) über das `keytar`-Modul gespeichert.