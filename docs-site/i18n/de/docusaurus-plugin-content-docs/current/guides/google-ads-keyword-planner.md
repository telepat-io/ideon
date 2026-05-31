---
title: Google Ads Keyword Planner Einrichtung
description: Schritt-für-Schritt-Anleitung zur Konfiguration von Google Ads API-Anmeldeinformationen für Ideons Keyword Planner-Werkzeuge.
keywords: [ideon, google ads, keyword planner, mcp, setup, credentials]
---

# Google Ads Keyword Planner Einrichtung

Ideon enthält drei Google Keyword Planner (GKP) MCP-Werkzeuge, die echte Keyword-Daten von Google Ads bereitstellen:

- `gkp_generate_ideas` — Finden Sie verwandte Keywords aus Seed-Keywords oder einer URL
- `gkp_get_historical_data` — Erhalten Sie historische Suchvolumen und Wettbewerb für Keywords
- `gkp_get_forecast_data` — Projizieren Sie Impressionen, Klicks und Kosten für Keywords

Diese Anleitung führt Sie durch alles, was Sie einrichten müssen, von der Erstellung eines Google Ads-Kontos bis zur Konfiguration von Anmeldeinformationen in Ideon.

---

## Schnelleinrichtung

Der schnellste Weg, um loszulegen, ist der `ideon gads`-Befehl:

```bash
ideon gads login          # Interaktive geführte Einrichtung mit OAuth-Ablauf
ideon gads status         # Überprüfen, welche Anmeldeinformationen konfiguriert sind
ideon gads test           # Überprüfen, ob Anmeldeinformationen mit einem Test-API-Aufruf funktionieren
```

Der `gads login`-Befehl fragt jede Anmeldeinformation ab, speichert sie nach und öffnet einen Browser für die Google-OAuth-Einwilligung. Keine Notwendigkeit, curl-Befehle manuell auszuführen oder Konfigurationsdateien zu bearbeiten.

**Andere `gads`-Befehle:**

| Befehl | Zweck |
|---|---|
| `ideon gads login --force` | Erneut autorisieren, auch wenn ein Refresh-Token bereits existiert |
| `ideon gads logout` | Refresh-Token löschen (behält andere Anmeldeinformationen) |
| `ideon gads logout --all` | Alle 6 Google Ads-Anmeldeinformationen löschen |

Für CI/CD oder nicht-interaktive Umgebungen siehen Sie den Abschnitt [Manuelle Einrichtung](#manuelle-einrichtung) unten.

---

## Verwendung der CLI (`ideon gkp`)

Sobald Anmeldeinformationen konfiguriert sind, fragen Sie Keyword-Daten direkt von der CLI ab:

```bash
# Keyword-Ideen generieren
ideon gkp ideas --keywords seo,marketing
ideon gkp ideas --url https://example.com --country US,GB

# Historische Metriken abrufen
ideon gkp historical --keywords seo,marketing --country US

# Prognosedaten abrufen
ideon gkp forecast --keywords seo --match-type EXACT --country US
```

Alle drei Unterbefehle unterstützen `--json` für maschinenlesbare Ausgabe:

```bash
ideon gkp ideas --keywords seo --json
```

Vollständige Details finden Sie in der [ideon gkp Befehlsreferenz](../reference/commands/ideon-gkp.md).

---

## Voraussetzungen-Checkliste

Sie benötigen insgesamt **sechs Anmeldeinformationen**. Hier ist, was jede einzelne ist und wo Sie sie bekommen:

| # | Anmeldeinformation | Wo bekommen | Erforderlich |
|---|---|---|---|
| 1 | Developer-Token | Google Ads API Center | Ja |
| 2 | OAuth2-Client-ID | Google Cloud-Konsole | Ja |
| 3 | OAuth2-Client-Geheimnis | Google Cloud-Konsole | Ja |
| 4 | OAuth2-Refresh-Token | Einmaliger Autorisierungsablauf | Ja |
| 5 | Kunden-ID | Google Ads-Kontonummer | Ja |
| 6 | Login-Kunden-ID | Manager-(MCC-)Kontonummer | Nur bei Verwendung eines Unterkontos |

---

## Schritt 1: Google Ads Manager-Konto erstellen (MCC)

Developer-Token werden **nur an Manager-Konten ausgestellt**, nicht an reguläre Google Ads-Konten.

1. Gehen Sie zu [Google Ads Manager-Konten](https://ads.google.com/home/tools/manager-accounts/)
2. Klicken Sie **Manager-Konto erstellen**
3. Füllen Sie die erforderlichen Informationen aus und schließen Sie die Einrichtung ab
4. Notieren Sie die Kontonummer oben rechts — dies ist Ihre **Manager-Konto-ID** (Format: `XXX-XXX-XXXX`)

> **Haben Sie bereits ein Google Ads-Konto?** Sie können dennoch ein Manager-Konto erstellen und Ihr bestehendes Konto damit verknüpfen.

---

## Schritt 2: Developer-Token erhalten

1. Melden Sie sich bei Ihrem Manager-Konto unter [ads.google.com](https://ads.google.com) an
2. Gehen Sie zu **Tools & Einstellungen → Einrichtung → API Center** (oder navigieren Sie direkt zu `https://ads.google.com/aw/apicenter`)
3. Finden Sie Ihren **Developer-Token** und kopieren Sie ihn
4. Speichern Sie ihn — Sie benötigen ihn als `googleAdsDeveloperToken`

> **⚠️ Neue Token starten im Testmodus.** Ein brandneuer Developer-Token kann nur gegen [Google Ads Testkonten](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts) API-Aufrufe ausführen. Aufrufe an echte Konten geben `DEVELOPER_TOKEN_NOT_APPROVED` zurück.
>
> **Um Basiszugriff zu beantragen:** Klicken Sie im API Center auf **Basic Access beantragen** und füllen Sie das Formular aus. Google überprüft Anfragen innerhalb weniger Tage. Basiszugriff ist ausreichend für die Keyword Planner API — Sie benötigen keinen Standardzugriff.

---

## Schritt 3: Google Cloud-Projekt einrichten

Sie benötigen ein Google Cloud (GCP)-Projekt mit aktivierter Google Ads API.

1. Gehen Sie zu [Google Cloud-Konsole](https://console.cloud.google.com/)
2. Erstellen Sie ein neues Projekt oder wählen Sie ein bestehendes aus
3. Aktivieren Sie die Google Ads API:
   - Gehen Sie zu [API-Bibliothek](https://console.cloud.google.com/apis/library/googleads.googleapis.com)
   - Suchen Sie nach **Google Ads API**
   - Klicken Sie **Aktivieren**

---

## Schritt 4: OAuth-Einwilligungsbildschirm konfigurieren

1. Gehen Sie zu [OAuth-Einwilligungsbildschirm](https://console.cloud.google.com/apis/credentials/consent)
2. Wählen Sie **External** als Benutzertyp
3. Füllen Sie aus:
   - **App-Name**: beliebig (z.B. "Ideon Keyword Planner")
   - **E-Mail zur Benutzerunterstützung**: Ihre E-Mail
   - **Entwickler-Kontakt-E-Mail**: Ihre E-Mail
4. Klicken Sie **Speichern und fortfahren** durch die Bereiche und Testbenutzer-Bildschirme
5. Lassen Sie die App im **Testing**-Modus
6. Fügen Sie Ihr eigenes Google-Konto als **Testbenutzer** hinzu:
   - Gehen Sie zu [OAuth-Einwilligungsbildschirm](https://console.cloud.google.com/apis/credentials/consent) → **Testbenutzer**
   - Klicken Sie **Benutzer hinzufügen** und geben Sie Ihre Google-E-Mail ein

---

## Schritt 5: OAuth2-Anmeldeinformationen erstellen

1. Gehen Sie zu [Anmeldeinformationen](https://console.cloud.google.com/apis/credentials)
2. Klicken Sie **+ Anmeldeinformationen erstellen → OAuth-Client-ID**
3. Wählen Sie **Anwendungstyp: Desktop-App**
4. Geben Sie einen Namen ein (z.B. "Ideon GKP")
5. Klicken Sie **Erstellen**
6. Kopieren Sie die **Client-ID** und das **Client-Geheimnis** — Sie benötigen beide

---

## Schritt 6: Refresh-Token erhalten

Dies ist ein **einmaliger** Autorisierungsablauf. Das Refresh-Token ermöglicht es Ideon, automatisch neue Zugriffstoken zu erhalten.

### Option A: Über den Browser (am einfachsten)

1. Öffnen Sie diese URL in Ihrem Browser und ersetzen Sie `YOUR_CLIENT_ID`:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:9876&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords&access_type=offline&prompt=consent
   ```
2. Melden Sie sich mit dem Google-Konto an, das Zugriff auf Ihr Google Ads-Konto hat
3. Gewähren Sie die angeforderten Berechtigungen
4. Der Browser leitet zu `http://localhost:9876?code=...` weiter — kopieren Sie den `code`-Wert aus der URL

### Option B: Über die Befehlszeile (macOS/Linux)

```bash
CLIENT_ID="YOUR_CLIENT_ID"
CLIENT_SECRET="YOUR_CLIENT_SECRET"
REDIRECT_URI="http://localhost:9876"

# Auth-URL im Browser öffnen
open "https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords&access_type=offline&prompt=consent"

# Temporären HTTP-Server starten, um die Weiterleitung abzufangen
CODE=$(python3 -c "
import http.server, urllib.parse, sys
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        print(params['code'][0], end='')
        self.send_response(200); self.end_headers()
        self.wfile.write(b'Auth complete! Close this tab.')
        sys.exit(0)
    def log_message(self, *a): pass
http.server.HTTPServer(('', 9876), H).handle_request()
")

# Für Token austauschen
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${CODE}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['refresh_token'])"
```

### Option C: Über PowerShell (Windows)

```powershell
$clientId = "YOUR_CLIENT_ID"
$clientSecret = "YOUR_CLIENT_SECRET"
$redirectUri = "http://localhost:9876"
$authUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=$clientId&redirect_uri=$([Uri]::EscapeDataString($redirectUri))&response_type=code&scope=$([Uri]::EscapeDataString('https://www.googleapis.com/auth/adwords'))&access_type=offline&prompt=consent"

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("$redirectUri/")
$listener.Start()

Start-Process $authUrl

$context = $listener.GetContext()
$rawUrl = $context.Request.RawUrl
$responseText = "<html><body><h2>Auth complete! You can close this tab.</h2></body></html>"
$buffer = [System.Text.Encoding]::UTF8.GetBytes($responseText)
$context.Response.ContentLength64 = $buffer.Length
$context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
$context.Response.Close()
$listener.Stop()

$code = ($rawUrl -split "[?&]" | Where-Object { $_ -like "code=*" }) -replace "^code=", ""

$body = "client_id=$clientId&client_secret=$clientSecret&code=$([Uri]::EscapeDataString($code))&grant_type=authorization_code&redirect_uri=$([Uri]::EscapeDataString($redirectUri))"
$result = Invoke-RestMethod -Method Post -Uri "https://oauth2.googleapis.com/token" -Body $body -ContentType "application/x-www-form-urlencoded"
Write-Host "Refresh token: $($result.refresh_token)"
```

> **⚠️ Speichern Sie Ihr Refresh-Token sofort.** Sie können es nicht erneut abrufen. Wenn verloren, müssen Sie den Autorisierungsablauf erneut ausführen.

---

## Schritt 7: Ihre Kunden-ID finden

1. Melden Sie sich bei [Google Ads](https://ads.google.com) an
2. Die **Kontonummer** wird oben rechts angezeigt (Format: `XXX-XXX-XXXX`)
3. Dies ist Ihre **Kunden-ID** — verwenden Sie das Konto, für das die Abrechnung eingerichtet ist

> **Abrechnungsanforderung:** Die Google Ads Keyword Planner API erfordert ein Konto mit einer aktiven Zahlungsmethode. Sie müssen keine Anzeigen schalten oder Geld ausgeben — Sie benötigen nur eine hinterlegte Zahlungsmethode.

---

## Schritt 8: Anmeldeinformationen in Ideon konfigurieren

Sobald Sie alle sechs Anmeldeinformationen haben, konfigurieren Sie diese in Ideon:

```bash
# Erforderliche Anmeldeinformationen
ideon config set googleAdsDeveloperToken "your-developer-token"
ideon config set googleAdsClientId "your-client-id.apps.googleusercontent.com"
ideon config set googleAdsClientSecret "your-client-secret"
ideon config set googleAdsRefreshToken "your-refresh-token"
ideon config set googleAdsCustomerId "123-456-7890"

# Nur bei Zugriff über ein Manager-Konto (MCC)
ideon config set googleAdsLoginCustomerId "123-456-7890"
```

Oder setzen Sie sie als Umgebungsvariablen:

```bash
export TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
export TELEPAT_GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export TELEPAT_GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
export TELEPAT_GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"
export TELEPAT_GOOGLE_ADS_CUSTOMER_ID="123-456-7890"
export TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID="123-456-7890"  # nur bei Bedarf
```

---

## Schritt 9: Einrichtung überprüfen

Testen Sie, ob Ihre Anmeldeinformationen funktionieren, indem Sie eine einfache Keyword-Ideen-Abfrage über den MCP-Server ausführen:

```bash
# MCP-Server starten
ideon mcp serve
```

Oder überprüfen Sie, ob Anmeldeinformationen konfiguriert sind:

```bash
ideon config list --json
```

Sie sollten `googleAdsDeveloperToken: true`, `googleAdsClientId: true`, usw. im Secrets-Bereich sehen.

---

## Manager-Konten und Unterkonten verstehen

Die Anmeldeinformation `googleAdsLoginCustomerId` ist Ihre **Manager/MCC-Konto-ID**. Sie ist **nur erforderlich, wenn Ihr `googleAdsCustomerId`-Konto ein Unterkonto ist, das über ein Manager-Konto verwaltet wird**.

| Szenario | `googleAdsCustomerId` | `googleAdsLoginCustomerId` |
|---|---|---|
| Direkter Zugriff auf Konto | Die eigene ID des Kontos | Nicht erforderlich |
| Zugriff über Manager | Die ID des Unterkontos | Die Manager-Konto-ID |

**Bei Zweifeln:** Setzen Sie `googleAdsLoginCustomerId` auf Ihre Manager-Konto-ID. Es schadet nicht, sie auch dann anzugeben, wenn sie nicht strikt erforderlich ist.

Beide IDs finden Sie in der Google Ads-Benutzoberfläche — die Kontonummer oben rechts, wenn Sie dieses Konto anzeigen. Bindestriche sind optional — `123-456-7890` und `1234567890` funktionieren beide.

---

## Häufige Fehler und Lösungen

| Fehler | Bedeutung | Lösung |
|---|---|---|
| `DEVELOPER_TOKEN_NOT_APPROVED` | Developer-Token ist im Testmodus | Beantragen Sie Basiszugriff im [API Center](https://ads.google.com/aw/apicenter) und warten Sie auf Genehmigung |
| `USER_PERMISSION_DENIED` (erwähnt `login-customer-id`) | Konto ist ein Unterkonto, aber Login-Kunden-ID fehlt | Setzen Sie `googleAdsLoginCustomerId` auf Ihre Manager-Konto-ID |
| `USER_PERMISSION_DENIED` (erwähnt `login-customer-id` nicht) | OAuth-Benutzer hat keinen Zugriff auf das Konto | Führen Sie den OAuth-Ablauf erneut mit dem Google-Konto aus, dem das Ads-Konto gehört |
| `DEVELOPER_TOKEN_INVALID` | Falscher oder falsch formatierter Developer-Token | Kopieren Sie erneut aus dem [API Center](https://ads.google.com/aw/apicenter) und setzen Sie ihn über `ideon config set googleAdsDeveloperToken` |
| `invalid_grant` | Refresh-Token abgelaufen | Führen Sie den OAuth-Autorisierungsablauf erneut aus, um ein neues Refresh-Token zu erhalten |
| `CUSTOMER_NOT_FOUND` | Konten-ID ist falsch oder nicht provisioniert | Überprüfen Sie die Kunden-ID oben rechts in der Google Ads-Benutzoberfläche |
| `NOT_ADS_USER` | Google-Konto nicht mit einem Ads-Konto verknüpft | Erstellen oder verknüpfen Sie ein Google Ads-Konto unter [ads.google.com](https://ads.google.com) |

---

## Werkzeugreferenz

### `gkp_generate_ideas`

Generiert verwandte Keyword-Ideen aus Seed-Keywords, einer URL oder einer Seite.

**Parameter:**
- `seedKeywords` (optional) — Array von Seed-Keywords
- `url` (optional) — eine URL, von der Ideen generiert werden sollen
- `site` (optional) — eine Seite, von der Ideen generiert werden sollen (kann nicht mit seedKeywords oder url kombiniert werden)
- `countryCodes` (optional) — ISO 3166-1 alpha-2 Ländercodes (z.B. `["US", "GB"]`). Standardmäßig alle Länder.
- `language` (optional) — ISO 639-1 Sprachcode (z.B. `"en"`). Standardmäßig Englisch.
- `pageSize` (optional) — maximale Anzahl der zurückzugebenden Ergebnisse

**Gibt zurück:** Liste von Keyword-Ideen mit `text`, `avgMonthlySearches`, `competition`, `competitionIndex`, `lowTopOfPageBidMicros`, `highTopOfPageBidMicros` und `closeVariants`.

### `gkp_get_historical_data`

Erhält historische Suchvolumen- und Wettbewerbsdaten für eine bestimmte Liste von Keywords.

**Parameter:**
- `keywords` (erforderlich) — Array von Keywords zum Nachschlagen
- `countryCodes` (optional) — ISO 3166-1 alpha-2 Ländercodes. Standardmäßig alle Länder.
- `language` (optional) — ISO 639-1 Sprachcode. Standardmäßig Englisch.
- `includeAverageCpc` (optional) — ob CPC-Daten einbezogen werden sollen. Standardmäßig `true`.

**Gibt zurück:** Pro-Keyword-Metriken einschließlich `avgMonthlySearches`, `competition`, `competitionIndex`, Schätzgebote und `monthlySearchVolumes` (12-Monats-Aufschlüsselung).

### `gkp_get_forecast_data`

Projiziert Impressionen, Klicks und Kosten für Keywords.

**Parameter:**
- `keywords` (erforderlich) — Array von Keywords zur Prognose
- `keywordMatchType` (optional) — `BROAD`, `EXACT` oder `PHRASE`. Standardmäßig `BROAD`.
- `maxCpcBidMicros` (optional) — maximales CPC-Gebot in Mikros (1.000.000 = $1,00). Wenn weggelassen, wird keine Gebotsstrategie angewendet.
- `countryCodes` (optional) — ISO 3166-1 alpha-2 Ländercodes. Standardmäßig `["US"]`.
- `language` (optional) — ISO 639-1 Sprachcode. Standardmäßig Englisch.
- `startDate` (optional) — Prognosestartdatum im Format `yyyy-MM-dd`. Standardmäßig heute.
- `endDate` (optional) — Prognoseenddatum im Format `yyyy-MM-dd`. Standardmäßig 30 Tage ab heute.

**Gibt zurück:** Pro-Keyword projizierte `impressions`, `clicks`, `costMicros` und `ctr`.

---

## Verwandte Ressourcen

- [Google Ads API-Dokumentation](https://developers.google.com/google-ads/api/docs/)
- [Google Ads API-Testkonten](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts)
- [Google Ads API Center](https://ads.google.com/aw/apicenter)
- [Google Cloud-Konsole](https://console.cloud.google.com/)