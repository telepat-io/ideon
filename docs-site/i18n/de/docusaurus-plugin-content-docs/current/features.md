---
slug: /features
title: "Eine Idee. Endlose Formate."
description: Was Ideon für Marketingverantwortliche, Gründer und Inhaltsteams tun kann.
keywords: [ideon, features, content generation, ai writing, multi-channel]
sidebar_label: Funktionen
sidebar_position: 1
---

# Eine Idee. Endlose Formate.

Ideon verwandelt eine einzelne Idee in eine vollständige Inhaltskampagne — veröffentlichungsfertige Entwürfe über jeden Kanal, alle mit einer Stimme, einem Stil und einer Strategie.

Gebaut für Marketingverantwortliche, Gründer und schlanke Teams, die hochwertige Inhalte in großem Maßstab veröffentlichen müssen, ohne eine vollständige Redaktion einzustellen.

---

## Einmal schreiben, überall veröffentlichen

Verwandeln Sie eine Idee in einen Artikel, Blog-Beitrag, Newsletter, X-Thread, X-Beitrag, LinkedIn-Beitrag und Reddit-Beitrag — alles in einem einzigen Lauf. Ihr Artikel ist der Anker. Alles andere bewirbt ihn.

```bash
ideon write "Our new AI feature" \
  --primary article=1 \
  --secondary x-thread=2 \
  --secondary linkedin-post=1 \
  --secondary reddit-post=1
```

Kein manuelles Umschreiben derselben Ankündigung auf sieben verschiedene Arten mehr. Ideon passt Struktur, Länge und Ton für jeden Kanal an, während die Kernbotschaft erhalten bleibt.

---

## Schreiben, das nach Ihnen klingt

Wählen Sie einen Stil und eine Absicht. Jede Ausgabe im Lauf teilt sich dieselbe Stimme — sodass Ihr X-Thread so klingt, als käme er vom selben Autor wie Ihr Artikel.

| Stil | Absicht | Ergebnis |
|---|---|---|
| `technical` | `tutorial` | Lehrende Deep-Dives, die Entwickler tatsächlich lesen |
| `professional` | `case-study` | Glaubwürdigkeitsschaffende Gründerinhalte |
| `storytelling` | `announcement` | Produktlaunches, die vom ersten Satz an fesseln |
| `persuasive` | `opinion-piece` | Thought Leadership mit Schärfe |
| `friendly` | `how-to-guide` | Zugängliche, teilbare Tutorials |

**13 Stile.** **13 Absichten.** Eine einheitliche Stimme über jeden Kanal.

---

## Recherchegestützte Entwürfe

Ideon durchsucht das Web und fügt kontextbezogene externe Links ein, wie ein menschlicher Autor es tun würde — keine manuelle Recherche, keine generischen Platzhalter-URLs. Nur glaubwürdige, relevante Links, die Ihren Entwürfen Tiefe und Autorität verleihen.

---

## Von Anfang an SEO-optimiert

Ideons Schreib-Pipeline setzt On-Page-SEO-Best-Practices in jeder Stufe der Inhaltsgenerierung durch — nicht als Nachgedanke, sondern als eingebauter Schreibprozess.

**Während der Planung** werden Titel aufsuchsichere Längen begrenzt und Meta-Beschreibungen für Klickwirkung gestaltet. **Während des Schreibens** gestalten drei spezialisierte SEO-Leitfäden jede Sektion:

- **On-Page-Grundlagen** — Überschriftenhierarchie, BLUF-Absätze, Schlüsselerkenntnis-Blöcke und Absatzstruktur, optimiert für menschliche Leser und Such-Crawler
- **E-E-A-T-Signale** — Erfahrung, Expertise, Autorität und Vertrauenswürdigkeit, eingebettet durch Praktiker-Beobachtungen, konkurrierende Standpunkte und Primärquellen-Zitate
- **Faktenichte** — Statistiken, Datenpunkte und autoritative Zitate pro Sektion, inspiriert von Princetons Forschung zur Generativen Engine-Optimierung, die bis zu 40% Sichtbarkeitsgewinne in KI-generierten Zusammenfassungen zeigt

Kein Keyword-Stuffing. Keine SEO-Hacks. Nur diszipliniertes Schreiben, das in traditionellen Suchergebnissen und generativen KI-Zusammenfassungen gleichermaßen performt.

---

## Ihr Modell, Ihre Wahl

Schließen Sie jedes LLM über OpenRouter an. Wechseln Sie die Modelle, ohne Ihren Workflow zu ändern. Verwenden Sie Claude für Nuancen, GPT-4 für Geschwindigkeit oder jedes Modell, das OpenRouter unterstützt — Ideon funktioniert unabhängig davon gleich.

---

## Gebaut auf bewährten Schreibprinzipien

Ideons Schreib-Engine basiert auf einem Leitfaden-ersten Prompt-Kompositionssystem, das aus einem großen Korpus echter Schreibratschläge und Best Practices zusammengestellt wurde. Jede Generierung folgt konkreten Regeln für:

- Struktur und Klarheit
- Spezifität statt Vagheit
- Rhythm und Skannbarkeit
- Aktiv mit konkreten Subjekten
- Kanalnative Auslieferung

Kein generischer KI-Füllstoff. Kein überpolierte Übergänge. Nur disziplinierter, menschlich klingender Prosatext.

---

## Klüger als eine Skill. Günstiger als rohe Prompts.

Die meisten KI-Inhaltstools behandeln das LLM wie eine Black Box, in die man alles einspeist. Ideon nicht. Es steuert die gesamte Pipeline mit deterministischem Code — Planung, Orchestrierung, Formatierung, Dateiverwaltung und Zustandsverfolgung — und ruft das Modell nur auf, wenn tatsächliche Sprachgenerierung erforderlich ist.

Sie zahlen für Token, wenn sie wichtig sind (Prosa-Entwurf, Strukturplanung, Ideenerweiterung) und niemals für Dinge, die Code besser kann (Argumentparsen, Ausgaben routing, Läufe verwalten, Markdown rendern). Im Vergleich zu Agenten-Skills oder universellen LLM-Workflows, die Kontextfenster auf Orchestrierungs-Chat verschwenden, ist Ideon schlanker, schneller und drastisch günstiger im Maßstab.

---

## Visuelles Storytelling, automatisiert

Artikelgeführte Läufe erhalten automatisch generierte Cover- und Inline-Bilder, die über Replicate gerendert werden. Ihre Inhalte sehen so gut aus, wie sie lesen, direkt aus der CLI.

---

## Gebaut für Agenten und Automatisierung

Ideon ist so konzipiert, dass es in moderne Agenten- und CI-Workflows passt:

- **MCP-Server** — Stellen Sie Ideon-Werkzeuge für Claude Code, ChatGPT, Gemini oder jeden MCP-Host bereit
- **Agenten-Laufzeitregistrierung** — `ideon agent install` registriert Integrationsprofile für unterstützte Plattformen
- **Nicht-interaktiver Modus** — `ideon write --no-interactive` entfernt alle Eingabeaufforderungen für CI und Automatisierung
- **Maschinenlesbare Konfiguration** — `ideon config list --json` für Agenten-Inspektion und Orchestrierung
- **Fortsetzbare Läufe** — Setzen Sie genau dort fort, wo Sie aufgehört haben, mit `ideon write resume`

---

## Google Keyword Planner Integration

Abfragen Sie echte Keyword-Daten von Google Ads direkt aus der CLI oder über MCP-Werkzeuge:

- **Keyword-Ideen** — Generieren Sie verwandte Keywords aus Seed-Keywords, einer URL oder einer Seite
- **Historische Metriken** — Erhalten Sie Suchvolumen, Wettbewerb und CPC-Daten für jedes Keyword
- **Prognosedaten** — Projizieren Sie Impressionen, Klicks und Kosten für Keyword-Kampagnen

```bash
ideon gkp ideas --keywords seo,marketing --country US
ideon gkp historical --keywords seo --json
ideon gkp forecast --keywords seo --match-type EXACT --country US
```

Richten Sie Anmeldeinformationen einmal mit `ideon gads login` ein und fragen Sie dann Keyword-Daten aus der CLI ab oder stellen Sie sie jedem MCP-kompatiblen Agenten bereit.

---

## Bereit, mehr Inhalte zu veröffentlichen?

[Loslegen →](./getting-started/installation.md)

Oder springen Sie direkt zur [CLI-Referenz](./reference/cli-reference.md) und [Schreibleitfaden](/writing-guide).