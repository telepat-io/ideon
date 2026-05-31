---
title: T2I-Modelle
description: T2I-Modelle Dokumentation für Ideon Benutzer und Mitwirkende.
keywords: [ideon, documentation, cli, guides, reference]
---

# Unterstützte Text-zu-Bild-Modelle

Ideon unterstützt derzeit diese Modell-IDs:

- `black-forest-labs/flux-schnell` (Standard)
- `black-forest-labs/flux-2-pro`
- `bytedance/seedream-4`
- `google/native-banana-pro`
- `prunaai/z-image-turbo`

## Überschreibungsbehandlung

Vom Benutzer bereitgestellte `t2i.inputOverrides` werden vor der Laufzeit bereinigt:

- Nicht-benutzerkonfigurierbare Felder werden entfernt
- Werte werden nach Typ erzwungen und validiert
- Ungültige Werte werden ignoriert

## Pipeline-verwaltete Felder

Abhängig von den Modelleigenschaften kann Ideon Pipeline-Felder automatisch setzen:

- `aspect_ratio`
- `width`
- `height`

Dies bewahrt stabile Bildgröße und Layoutabsicht.

## Auswahlhinweise

- Beginnen Sie mit Standard `flux-schnell` für Geschwindigkeit
- Erhöhen Sie qualitätsorientierte Felder erst nach der Baseline-Stabilität
- Verwenden Sie Trockenlauf, um Orchestrierung vor Live-Bildkosten zu validieren

## Praktische Abwägungen

| Modell | Geschwindigkeit | Typische Qualität | Beste Verwendung |
|---|---|---|---|
| `black-forest-labs/flux-schnell` | Schnell | Gute Baseline | Iteration, hohe Durchsatz-Entwürfe |
| `black-forest-labs/flux-2-pro` | Mittel | Höhere Treue | Hero-Visuelle, polierte Coverbilder |
| `bytedance/seedream-4` | Mittel | Starke Komposition | Ausgewogene Geschwindigkeits/Qualitäts-Workflows |
| `google/native-banana-pro` | Mittel | Stil-konsistente Ausgaben | Markenähnliche Variation und Konsistenz |
| `prunaai/z-image-turbo` | Schnell | Leichtgewichtig | Schnelles exploratives Rendern |

## Häufige Überschreibungsmuster

Verwenden Sie `t2i.inputOverrides`, wenn Sie modellspezifische Anpassungen benötigen:

- Ausgabeformat-Anpassung (z.B. `png` vs `webp`)
- Modellnative Qualitätsschalter, wo unterstützt
- Zählen/Varianten-Steuerelemente, wo erlaubt

Beispiel:

```json
{
	"settings": {
		"t2i": {
			"modelId": "black-forest-labs/flux-schnell",
			"inputOverrides": {
				"output_format": "png"
			}
		}
	}
}
```

Wenn eine Überschreibung für das ausgewählte Modell ungültig ist, entfernt Ideon sie während der Validierung.