---
title: ideon settings
description: Konfigurieren und inspizieren Sie Ideon-Einstellungen und Anmeldeinformationen über den interaktiven Einstellungsablauf.
keywords: [ideon, cli, settings, keychain, configuration]
---

# ideon settings

## Was dieser Befehl macht

`ideon settings` öffnet den interaktiven Einstellungsablauf, sodass Sie Laufzeit-Standardwerte und Anmeldeinformationenspeicher überprüfen und aktualisieren können.

Für nicht-interaktive Automatisierungs- und Agenten-Workflows verwenden Sie [ideon config](./ideon-config.md).

## Verwendung

```bash
ideon settings
```

## Argumente und Optionen

| Flag/Argument | Kurzform | Erforderlich | Typ | Standard | Erlaubte Werte | Beschreibung |
| --- | --- | --- | --- | --- | --- | --- |
| Kein | Kein | Nein | n/a | n/a | n/a | Dieser Befehl hat keine Argumente oder Flags. |

## Beispiele

```bash title="Minimaler Glückspfad"
ideon settings
```

```bash title="Häufiger realer Pfad"
TELEPAT_DISABLE_KEYTAR=true ideon settings
```

```bash title="Debug-fokussierte Überprüfung"
ideon settings && ideon --version
```

## Ausgabe und Beendigungscodes

Wenn Einstellungen erfolgreich gespeichert werden, druckt Ideon den Einstellungsdateipfad und gibt einen Erfolgs-Beendigungscode zurück.

| Beendigungscode | Bedeutung |
| --- | --- |
| `0` | Einstellungsablauf erfolgreich abgeschlossen. |
| `1` | Befehl aufgrund von Laufzeit- oder Validierungsfehlern fehlgeschlagen. |
| `130` | Befehl wurde durch `Ctrl+C` unterbrochen. |

## Verwandte Befehle

- [ideon config](./ideon-config.md)
- [ideon write [idea]](./ideon-write.md)
- [ideon preview [markdownPath]](./ideon-preview.md)

## Versionierung und Veraltungshinweise

- Aktuelles Verhalten gilt für Ideon `0.1.6`.
- Keine veralteten Flags gelten für diesen Befehl.